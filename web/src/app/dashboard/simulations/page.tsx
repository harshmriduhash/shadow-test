"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, authOptions, type Simulation } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function SimulationsPage() {
    const { isLoaded, userId, getToken } = useAuth();
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isLoaded || !userId) return;
        let cancelled = false;
        void (async () => {
            try {
                const records = await api.simulations.list(authOptions(await getToken()));
                if (!cancelled) setSimulations(records);
            } catch (loadError) {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load simulations.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [getToken, isLoaded, userId]);

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <header>
                <h1 className="text-4xl font-bold tracking-tight text-white">Simulations</h1>
                <p className="mt-2 text-sm text-zinc-400">Your recent behavioral runs and their current status.</p>
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
        </div>
    );
}
