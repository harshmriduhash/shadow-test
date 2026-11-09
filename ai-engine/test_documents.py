import io
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import documents


class DocumentTextTests(unittest.TestCase):
    def test_extracts_plain_text_and_markdown(self):
        for content_type in ("text/plain", "text/markdown"):
            with self.subTest(content_type=content_type):
                result = documents.extract_document_text(b"\xef\xbb\xbf# Billing\n\nInvoices", content_type)
                self.assertEqual(result, "# Billing\n\nInvoices")

    def test_rejects_empty_oversized_and_unsupported_documents(self):
        with self.assertRaises(ValueError):
            documents.extract_document_text(b"", "text/plain")
        with self.assertRaises(ValueError):
            documents.extract_document_text(b"x" * (documents.MAX_DOCUMENT_BYTES + 1), "text/plain")
        with self.assertRaises(ValueError):
            documents.extract_document_text(b"data", "application/octet-stream")

    def test_chunks_long_text_with_overlap_and_preserves_all_content(self):
        text = ("A" * 1150) + "\n" + ("B" * 1100)
        chunks = documents.chunk_text(text)
        self.assertGreaterEqual(len(chunks), 2)
        self.assertTrue(all(len(chunk) <= documents.CHUNK_SIZE for chunk in chunks))
        self.assertIn("A" * 20, chunks[0])
        self.assertIn("B" * 20, chunks[-1])


class VectorStoreTests(unittest.TestCase):
    def test_indexes_s3_document_chunks_with_project_and_document_metadata(self):
        class FakeEmbedder:
            def embed(self, texts):
                return [SimpleNamespace(tolist=lambda: [0.1] * documents.EMBEDDING_SIZE) for _ in texts]

        class FakeQdrant:
            def __init__(self):
                self.created = False
                self.points = []

            def collection_exists(self, name):
                self.collection_name = name
                return self.created

            def create_collection(self, **kwargs):
                self.created = True
                self.create_kwargs = kwargs

            def upsert(self, **kwargs):
                self.points = kwargs["points"]

        fake_qdrant = FakeQdrant()
        fake_s3 = SimpleNamespace(
            get_object=lambda **kwargs: {
                "Body": io.BytesIO(b"# Billing\nInvoices can be downloaded from settings.")
            }
        )
        with (
            patch.dict("os.environ", {"AWS_S3_BUCKET": "shadowtest-test"}),
            patch.object(documents.boto3, "client", return_value=fake_s3),
            patch.object(documents, "get_embedder", return_value=FakeEmbedder()),
            patch.object(documents, "get_qdrant_client", return_value=fake_qdrant),
        ):
            count = documents.index_document(
                "document-1", "project-1", "private/key.md", "text/markdown", "guide.md"
            )

        self.assertEqual(count, 1)
        self.assertEqual(fake_qdrant.points[0].payload["project_id"], "project-1")
        self.assertEqual(fake_qdrant.points[0].payload["document_id"], "document-1")
        self.assertIn("Invoices", fake_qdrant.points[0].payload["text"])
        self.assertEqual(fake_qdrant.create_kwargs["vectors_config"].size, documents.EMBEDDING_SIZE)

    def test_search_filters_by_project_and_returns_only_text_chunks(self):
        class FakeEmbedder:
            def query_embed(self, query):
                self.query = query
                return iter([SimpleNamespace(tolist=lambda: [0.2] * documents.EMBEDDING_SIZE)])

        class FakeQdrant:
            def collection_exists(self, name):
                return True

            def query_points(self, **kwargs):
                self.query_kwargs = kwargs
                return SimpleNamespace(points=[
                    SimpleNamespace(payload={
                        "text": "Billing guide chunk",
                        "document_id": "doc-1",
                        "file_name": "billing.md",
                    }, score=0.91),
                    SimpleNamespace(payload={"file_name": "metadata only"}),
                ])

        embedder = FakeEmbedder()
        qdrant = FakeQdrant()
        with (
            patch.object(documents, "get_embedder", return_value=embedder),
            patch.object(documents, "get_qdrant_client", return_value=qdrant),
        ):
            result = documents.search_project_documents("project-2", "find billing")

        self.assertEqual(result, [{
            "document_id": "doc-1",
            "file_name": "billing.md",
            "text": "Billing guide chunk",
            "score": 0.91,
        }])
        self.assertEqual(embedder.query, "find billing")
        condition = qdrant.query_kwargs["query_filter"].must[0]
        self.assertEqual(condition.key, "project_id")
        self.assertEqual(condition.match.value, "project-2")


if __name__ == "__main__":
    unittest.main()
