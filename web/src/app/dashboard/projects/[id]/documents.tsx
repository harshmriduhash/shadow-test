"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { api, authOptions, type ProjectDocument } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";

const ACCEPTED_TYPES = new Set(["application/pdf", "text/markdown", "text/plain"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getContentType(file: File) {
    if (ACCEPTED_TYPES.has(file.type)) return file.type;
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension === "md" || extension === "markdown") return "text/markdown";
    if (extension === "txt") return "text/plain";
    if (extension === "pdf") return "application/pdf";
    return "";
}

export function ProjectDocuments({ projectId }: { projectId: string }) {
    const { getToken } = useAuth();
    const [documents, setDocuments] = useState<ProjectDocument[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Awaited<ReturnType<typeof api.documents.search>>["results"]>([]);
    const [error, setError] = useState("");

    const loadDocuments = useCallback(async (cursor?: string, preserveExisting = false) => {
        const page = await api.documents.list(projectId, authOptions(await getToken()), cursor);
        setDocuments(current => {
            if (!cursor && !preserveExisting) return page.items;
            const byId = new Map(current.map(document => [document.id, document]));
            page.items.forEach(document => byId.set(document.id, document));
            return Array.from(byId.values()).sort((left, right) =>
                new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
            );
        });
        if (!preserveExisting || cursor) setNextCursor(page.nextCursor);
        setTotalCount(page.totalCount);
    }, [getToken, projectId]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const page = await api.documents.list(projectId, authOptions(await getToken()));
                if (!cancelled) {
                    setDocuments(page.items);
                    setNextCursor(page.nextCursor);
                    setTotalCount(page.totalCount);
                }
            } catch (loadError) {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load documents.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [getToken, projectId]);

    useEffect(() => {
        if (!documents.some(document => document.status === "INDEXING")) return;
        const interval = window.setInterval(() => {
            void loadDocuments(undefined, true).catch(loadError => {
                setError(loadError instanceof Error ? loadError.message : "Unable to refresh document status.");
            });
        }, 3000);
        return () => window.clearInterval(interval);
    }, [documents, loadDocuments]);

    const loadMore = async () => {
        if (!nextCursor) return;
        setLoadingMore(true);
        setError("");
        try {
            await loadDocuments(nextCursor, true);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load more documents.");
        } finally {
            setLoadingMore(false);
        }
    };
    const loadMoreSentinel = useInfiniteScroll(() => { void loadMore(); }, Boolean(nextCursor) && !loadingMore && !error, nextCursor);

    const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file) return;
        setError("");
        const contentType = getContentType(file);
        if (!contentType) {
            setError("Choose a PDF, Markdown, or plain-text file.");
            input.value = "";
            return;
        }
        if (file.size === 0 || file.size > MAX_FILE_SIZE) {
            setError("Files must be between 1 byte and 10 MB.");
            input.value = "";
            return;
        }

        setUploading(true);
        try {
            const options = authOptions(await getToken());
            const upload = await api.documents.createUpload(projectId, {
                fileName: file.name,
                contentType,
                sizeBytes: file.size
            }, options);
            const form = new FormData();
            for (const [key, value] of Object.entries(upload.upload.fields)) form.append(key, value);
            form.append("file", file);
            const response = await fetch(upload.upload.url, { method: "POST", body: form });
            if (!response.ok) throw new Error(`Storage upload failed (${response.status}). Check the S3 bucket CORS configuration.`);
            await api.documents.completeUpload(projectId, upload.document.id, options);
            await loadDocuments(undefined, true);
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : "Unable to upload this document.");
        } finally {
            input.value = "";
            setUploading(false);
        }
    };

    const downloadDocument = async (document: ProjectDocument) => {
        setError("");
        try {
            const url = await api.documents.download(document.id, authOptions(await getToken()));
            window.location.assign(url);
        } catch (downloadError) {
            setError(downloadError instanceof Error ? downloadError.message : "Unable to download document.");
        }
    };

    const deleteDocument = async (document: ProjectDocument) => {
        setError("");
        try {
            await api.documents.delete(document.id, authOptions(await getToken()));
            await loadDocuments(undefined, true);
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Unable to delete document.");
        }
    };

    const searchDocuments = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setSearching(true);
        try {
            const result = await api.documents.search(projectId, query, authOptions(await getToken()));
            setResults(result.results);
        } catch (searchError) {
            setError(searchError instanceof Error ? searchError.message : "Unable to search project documents.");
        } finally {
            setSearching(false);
        }
    };

    return (
        <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-white">Project knowledge · {documents.length} of {totalCount}</h2>
                    <p className="mt-1 text-sm text-zinc-400">Upload private PDF, Markdown, or text documents for semantic search in simulations.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center">
                    <input
                        type="file"
                        accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
                        className="sr-only"
                        disabled={uploading}
                        onChange={event => void uploadDocument(event)}
                    />
                    <span className={`inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ${uploading ? "cursor-wait opacity-60" : ""}`}>
                        {uploading ? "Uploading…" : "Upload document"}
                    </span>
                </label>
            </header>
            {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <form onSubmit={event => void searchDocuments(event)} className="flex flex-col gap-2 sm:flex-row">
                <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    required
                    maxLength={2000}
                    placeholder="Search project documents by meaning…"
                    className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-white"
                />
                <Button type="submit" variant="outline" disabled={searching || !query.trim()}>
                    {searching ? "Searching…" : "Search"}
                </Button>
            </form>
            {results.length > 0 && (
                <ul className="space-y-3">
                    {results.map((result, index) => (
                        <li key={`${result.document_id}-${index}`} className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
                            <p className="text-xs text-primary">{result.file_name} · relevance {result.score.toFixed(2)}</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{result.text}</p>
                        </li>
                    ))}
                </ul>
            )}
            {query && !searching && results.length === 0 && <p className="text-sm text-zinc-500">No matching document passages found.</p>}
            {loading ? <p className="text-sm text-zinc-500">Loading documents…</p> : documents.length === 0 ? (
                <p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-500">No project documents uploaded yet.</p>
            ) : (
                <ul className="divide-y divide-white/10">
                    {documents.map(document => (
                        <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">{document.fileName}</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    {(document.sizeBytes / 1024).toFixed(1)} KB · {document.status}
                                    {document.error ? ` · ${document.error}` : ""}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {document.status === "READY" && <Button variant="outline" size="sm" onClick={() => void downloadDocument(document)}>Download</Button>}
                                <Button variant="ghost" size="sm" onClick={() => void deleteDocument(document)}>Delete</Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {!loading && nextCursor && (
                <div className="flex justify-center">
                    <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
                        {loadingMore ? "Loading…" : "Load more documents"}
                    </Button>
                </div>
            )}
            <div ref={loadMoreSentinel} aria-hidden="true" className="h-px" />
        </section>
    );
}
