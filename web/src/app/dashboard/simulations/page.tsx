"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, authOptions, type Simulation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";

export default function SimulationsPage() {
    const { isLoaded, userId, getToken } = useAuth();
    const { organization } = useOrganization();
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState("");
    const hasLoadedMore = useRef(false);

    const refreshSimulations = useCallback(async () => {
        const page = await api.simulations.list(authOptions(await getToken()));
        setSimulations(current => {
            const byId = new Map(current.map(simulation => [simulation.id, simulation]));
            page.items.forEach(simulation => byId.set(simulation.id, simulation));
            return Array.from(byId.values()).sort((left, right) =>
                new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
            );
        });
        if (!hasLoadedMore.current) setNextCursor(page.nextCursor);
        setTotalCount(page.totalCount);
    }, [getToken]);

    useEffect(() => {
        if (!isLoaded || !userId) return;
        let cancelled = false;
        hasLoadedMore.current = false;
        setSimulations([]);
        setNextCursor(null);
        setTotalCount(0);
        setLoading(true);
        void refreshSimulations()
            .catch(loadError => {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load simulations.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [isLoaded, organization?.id, refreshSimulations, userId]);

    useEffect(() => {
        if (!simulations.some(simulation => simulation.status === "PENDING" || simulation.status === "RUNNING")) return;
        const interval = window.setInterval(() => {
            void refreshSimulations().catch(loadError => {
                setError(loadError instanceof Error ? loadError.message : "Unable to refresh simulations.");
            });
        }, 3000);
        return () => window.clearInterval(interval);
    }, [refreshSimulations, simulations]);

    const loadMore = async () => {
        if (!nextCursor) return;
        setLoadingMore(true);
        setError("");
        try {
            const page = await api.simulations.list(authOptions(await getToken()), nextCursor);
            setSimulations(current => {
                const byId = new Map(current.map(simulation => [simulation.id, simulation]));
                page.items.forEach(simulation => byId.set(simulation.id, simulation));
                return Array.from(byId.values()).sort((left, right) =>
                    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
                );
            });
            hasLoadedMore.current = true;
            setNextCursor(page.nextCursor);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load more simulations.");
        } finally {
            setLoadingMore(false);
        }
    };
    const loadMoreSentinel = useInfiniteScroll(() => { void loadMore(); }, Boolean(nextCursor) && !loadingMore && !error, nextCursor);

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <header>
                <h1 className="text-4xl font-bold tracking-tight text-white">Simulations</h1>
                <p className="mt-2 text-sm text-zinc-400">Showing {simulations.length} of {totalCount} behavioral runs.</p>
            </header>
            {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
            {loading ? <p className="text-sm text-zinc-500">Loading simulations…</p> : simulations.map(simulation => (
                <article key={simulation.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="truncate font-medium text-white">{simulation.task}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                            {simulation.project?.name || "Project"} · {simulation.persona?.name || "Persona"} · {new Date(simulation.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">{simulation.status}</span>
                        <Link href={`/dashboard/projects/${simulation.projectId}`}>
                            <Button variant="outline" size="sm">Open trace</Button>
                        </Link>
                    </div>
                </article>
            ))}
            {!loading && simulations.length === 0 && <p className="rounded-xl border border-white/10 p-6 text-sm text-zinc-500">No simulations yet. Open a project to start a run.</p>}
            {!loading && nextCursor && (
                <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
                    {loadingMore ? "Loading…" : "Load more simulations"}
                </Button>
            )}
            <div ref={loadMoreSentinel} aria-hidden="true" className="h-px" />
        </div>
    );
}
