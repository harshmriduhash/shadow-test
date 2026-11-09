"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, authOptions, type Report } from "@/lib/api";

function decodeInsights(value: string | null) {
    if (!value) return [];
    try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) && parsed.every(item => typeof item === "string") ? parsed : [];
    } catch {
        return [];
    }
}

export default function ReportDetailsPage() {
    const { getToken } = useAuth();
    const { id } = useParams<{ id: string }>();
    const [report, setReport] = useState<Report | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const value = await api.reports.get(id, authOptions(await getToken()));
                if (!cancelled) setReport(value);
            } catch (loadError) {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load this report.");
            }
        })();
        return () => { cancelled = true; };
    }, [getToken, id]);

    if (error) return <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>;
    if (!report) return <p className="text-sm text-zinc-500">Loading report…</p>;

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <Link href="/dashboard/reports"><Button variant="ghost">← Back to reports</Button></Link>
            <header>
                <p className="text-xs uppercase tracking-widest text-primary">{report.simulation.project.name} · {report.simulation.persona.name}</p>
                <h1 className="mt-2 text-4xl font-bold text-white">Simulation report</h1>
                <p className="mt-2 text-sm text-zinc-400">{report.simulation.task}</p>
            </header>
            <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="text-lg font-semibold text-white">Outcome</h2>
                <p className="text-sm text-zinc-300">{report.summary}</p>
                <p className="text-sm text-zinc-400">
                    {report.simulation.success === null || report.simulation.success === undefined
                        ? "Task outcome is unknown."
                        : report.simulation.success ? "Task succeeded." : "Task completion was not confirmed."}
                </p>
            </section>
            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-white">Friction and insights</h2>
                <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-300">
                    {decodeInsights(report.insights).map((insight, index) => <li key={index}>{insight}</li>)}
                </ul>
            </section>
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Behavior trace</h2>
                {report.simulation.steps?.map(step => (
                    <article key={step.id} className="space-y-2 rounded-xl border border-white/10 p-4">
                        <h3 className="text-sm font-medium text-primary">Step {step.stepNumber}</h3>
                        {step.observation && <p className="text-sm text-zinc-300"><strong>Observation:</strong> {step.observation}</p>}
                        {step.interpretation && <p className="text-sm text-zinc-400"><strong>Interpretation:</strong> {step.interpretation}</p>}
                        {step.decision && <p className="text-sm text-zinc-300"><strong>Decision:</strong> {step.decision}</p>}
                        {step.action && <p className="text-sm text-zinc-300"><strong>Action:</strong> {step.action}</p>}
                        {step.outcome && <p className="text-sm text-zinc-400"><strong>Outcome:</strong> {step.outcome}</p>}
                    </article>
                ))}
            </section>
        </div>
    );
}
