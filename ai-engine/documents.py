import io
import os
from functools import lru_cache
from typing import Any
from uuid import NAMESPACE_URL, uuid5

import boto3
from fastembed import TextEmbedding
from pypdf import PdfReader
from qdrant_client import QdrantClient, models

COLLECTION_NAME = os.environ.get("QDRANT_COLLECTION", "shadowtest_project_documents")
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_SIZE = 384
MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
MAX_EXTRACTED_CHARACTERS = 500_000
CHUNK_SIZE = 1200
CHUNK_OVERLAP = 150


@lru_cache(maxsize=1)
def get_embedder() -> TextEmbedding:
    return TextEmbedding(model_name=EMBEDDING_MODEL)


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    url = os.environ.get("QDRANT_URL")
    if not url:
        raise RuntimeError("QDRANT_URL is required for document search")
    api_key = os.environ.get("QDRANT_API_KEY")
    return QdrantClient(url=url, api_key=api_key, timeout=15)


def check_s3_connectivity() -> None:
    bucket = os.environ.get("AWS_S3_BUCKET")
    if not bucket:
        raise RuntimeError("AWS_S3_BUCKET is required for document storage")
    boto3.client("s3").head_bucket(Bucket=bucket)


def check_qdrant_connectivity() -> None:
    get_qdrant_client().get_collections()


def extract_document_text(file_bytes: bytes, content_type: str) -> str:
    if not file_bytes or len(file_bytes) > MAX_DOCUMENT_BYTES:
        raise ValueError("Document is empty or exceeds the 10 MB limit")

    if content_type == "application/pdf":
        reader = PdfReader(io.BytesIO(file_bytes), strict=False)
        if len(reader.pages) > 200:
            raise ValueError("PDF exceeds the 200 page limit")
        text = "\n\n".join(page.extract_text() or "" for page in reader.pages)
    elif content_type in {"text/markdown", "text/plain"}:
        text = file_bytes.decode("utf-8-sig", errors="replace")
    else:
        raise ValueError("Only PDF, Markdown, and plain-text files are supported")

    text = "\n".join(line.rstrip() for line in text.splitlines()).strip()
    if not text:
        raise ValueError("No searchable text was found in the document")
    return text[:MAX_EXTRACTED_CHARACTERS]


def chunk_text(text: str) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        if end < len(text):
            boundary = text.rfind("\n", start + CHUNK_SIZE // 2, end)
            if boundary > start:
                end = boundary
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(text):
            break
        start = max(start + 1, end - CHUNK_OVERLAP)
    return chunks


def ensure_collection(client: QdrantClient) -> None:
    if not client.collection_exists(COLLECTION_NAME):
        try:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=models.VectorParams(size=EMBEDDING_SIZE, distance=models.Distance.COSINE),
            )
        except Exception:
            if not client.collection_exists(COLLECTION_NAME):
                raise


def index_document(
    document_id: str,
    project_id: str,
    storage_key: str,
    content_type: str,
    file_name: str,
) -> int:
    bucket = os.environ.get("AWS_S3_BUCKET")
    if not bucket:
        raise RuntimeError("AWS_S3_BUCKET is required for document indexing")

    s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-east-1"))
    response = s3.get_object(Bucket=bucket, Key=storage_key)
    try:
        file_bytes = response["Body"].read(MAX_DOCUMENT_BYTES + 1)
    finally:
        response["Body"].close()

    chunks = chunk_text(extract_document_text(file_bytes, content_type))
    vectors = list(get_embedder().embed(chunks))
    client = get_qdrant_client()
    ensure_collection(client)
    points = [
        models.PointStruct(
            id=str(uuid5(NAMESPACE_URL, f"shadowtest:{document_id}:{index}")),
            vector=vector.tolist(),
            payload={
                "document_id": document_id,
                "project_id": project_id,
                "file_name": file_name,
                "chunk_index": index,
                "text": chunk,
            },
        )
        for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True))
    ]
    client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)
    return len(points)


def search_project_documents(project_id: str, query: str, limit: int = 5) -> list[dict[str, Any]]:
    client = get_qdrant_client()
    if not client.collection_exists(COLLECTION_NAME):
        return []
    query_vector = next(get_embedder().query_embed(query)).tolist()
    result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=models.Filter(
            must=[models.FieldCondition(key="project_id", match=models.MatchValue(value=project_id))]
        ),
        limit=limit,
        with_payload=True,
    )
    return [
        {
            "document_id": str(point.payload["document_id"]),
            "file_name": str(point.payload["file_name"]),
            "text": str(point.payload["text"]),
            "score": float(point.score),
        }
        for point in result.points
        if point.payload
        and all(isinstance(point.payload.get(field), str) for field in ("document_id", "file_name", "text"))
    ]


def delete_document_vectors(document_id: str) -> None:
    if not os.environ.get("QDRANT_URL"):
        return
    client = get_qdrant_client()
    if not client.collection_exists(COLLECTION_NAME):
        return
    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[models.FieldCondition(key="document_id", match=models.MatchValue(value=document_id))]
            )
        ),
        wait=True,
    )


def document_index_payload(payload: dict[str, Any]) -> tuple[str, str, str, str, str]:
    keys = ("document_id", "project_id", "storage_key", "content_type", "file_name")
    if any(not isinstance(payload.get(key), str) or not payload[key] for key in keys):
        raise ValueError("Document index job is missing required fields")
    return tuple(payload[key] for key in keys)
