"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, authOptions, connectSimulationProgress, type Simulation } from "@/lib/api";
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
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [cancelRequestedIds, setCancelRequestedIds] = useState<Set<string>>(() => new Set());
    const hasLoadedMore = useRef(false);

    const refreshSimulations = useCallback(async () => {
        const page = await api.simulations.list(authOptions(await getToken()));
        setCancelRequestedIds(current => {
            const next = new Set(current);
            page.items.forEach(simulation => {
                if (simulation.status !== "PENDING" && simulation.status !== "RUNNING") {
                    next.delete(simulation.id);
                }
            });
            return next;
        });
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
        setCancelRequestedIds(new Set());
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

    const activeSimulationIds = simulations
        .filter(simulation => simulation.status === "RUNNING" || simulation.status === "PENDING")
        .map(simulation => simulation.id)
        .join(",");

    useEffect(() => {
        let disposed = false;
        const disconnect = new Set<() => void>();
        const attach = async (simulationId: string) => {
            try {
                const close = await connectSimulationProgress(
                    simulationId,
                    authOptions(await getToken()),
                    () => { void refreshSimulations(); }
                );
                if (disposed) close();
                else disconnect.add(close);
            } catch (progressError) {
                if (!disposed) console.error("Simulation live updates are unavailable; polling remains active.", progressError);
            }
        };
        void Promise.all(activeSimulationIds.split(",").filter(Boolean).map(attach));
        return () => {
            disposed = true;
            disconnect.forEach(close => close());
        };
    }, [activeSimulationIds, getToken, refreshSimulations]);

    useEffect(() => {
        if (!activeSimulationIds) return;
        const interval = window.setInterval(() => {
            void refreshSimulations().catch(loadError => {
                setError(loadError instanceof Error ? loadError.message : "Unable to refresh simulations.");
            });
        }, 10000);
        return () => window.clearInterval(interval);
    }, [activeSimulationIds, refreshSimulations]);

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
    const cancelSimulation = async (simulationId: string) => {
        setCancellingId(simulationId);
        setError("");
        try {
            await api.simulations.cancel(simulationId, authOptions(await getToken()));
            setCancelRequestedIds(current => new Set(current).add(simulationId));
            await refreshSimulations();
        } catch (cancelError) {
            setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel the simulation.");
        } finally {
            setCancellingId(null);
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
                        {(simulation.status === "PENDING" || simulation.status === "RUNNING") && (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={cancellingId === simulation.id || cancelRequestedIds.has(simulation.id)}
                                onClick={() => void cancelSimulation(simulation.id)}
                            >
                                {cancellingId === simulation.id ? "Cancelling…" : cancelRequestedIds.has(simulation.id) ? "Requested" : "Cancel"}
                            </Button>
                        )}
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
