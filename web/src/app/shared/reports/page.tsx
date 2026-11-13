"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, type Report } from "@/lib/api";

function decodeInsights(value: string | null) {
    if (!value) return [];
    try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) && parsed.every(item => typeof item === "string")
            ? parsed as string[]
            : [];
    } catch {
        return [];
    }
}

export default function SharedReportPage() {
    const [report, setReport] = useState<Report | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        void Promise.resolve()
            .then(() => {
                const token = window.location.hash.slice(1);
                if (!token) throw new Error("This share link is missing its access token.");
                return api.reports.getShared(token);
            })
            .then(value => {
                if (!cancelled) setReport(value);
            })
            .catch(loadError => {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "This shared report is unavailable.");
            });
        return () => { cancelled = true; };
    }, []);

    if (error) {
        return (
            <main className="mx-auto max-w-3xl space-y-4 p-8">
                <h1 className="text-3xl font-bold text-white">Shared report unavailable</h1>
                <p role="alert" className="text-sm text-zinc-400">{error}</p>
            </main>
        );
    }
    if (!report) return <main className="mx-auto max-w-3xl p-8 text-sm text-zinc-400">Loading shared report…</main>;

    const insights = decodeInsights(report.insights);
    return (
        <main className="mx-auto max-w-4xl space-y-8 p-6 sm:p-10">
            <header className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-primary">Shared ShadowTest report</p>
                <h1 className="text-3xl font-bold text-white">Simulation report</h1>
                <p className="text-sm text-zinc-400">
                    {report.simulation.project.name} · {report.simulation.persona.name} · {report.simulation.task}
                </p>
                <p className="text-xs text-zinc-500">This report reflects a synthetic walkthrough, not observed customer behavior.</p>
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
                {insights.length
                    ? <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-300">{insights.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    : <p className="text-sm text-zinc-500">No insights are available.</p>}
            </section>
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Structured UX events</h2>
                {report.simulation.events?.length ? report.simulation.events.map(event => (
                    <article key={event.id} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-white">{event.type === "ABANDONMENT" ? "Potential abandonment risk" : event.type}</span>
                            <span className="text-xs text-zinc-400">{event.severity} · Step {event.stepNumber}</span>
                        </div>
                        <p className="text-sm text-zinc-300">{event.description}</p>
                        {event.evidence && <blockquote className="border-l-2 border-white/10 pl-3 text-sm text-zinc-500">{event.evidence}</blockquote>}
                    </article>
                )) : <p className="text-sm text-zinc-500">No structured UX events are available.</p>}
            </section>
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Behavior trace</h2>
                {report.simulation.steps?.map(step => (
                    <article key={step.id} className="space-y-2 rounded-xl border border-white/10 p-4">
                        <h3 className="text-sm font-medium text-primary">Step {step.stepNumber}</h3>
                        {step.observation && <p className="text-sm text-zinc-300"><strong>Observation:</strong> {step.observation}</p>}
                        {step.interpretation && <p className="text-sm text-zinc-400"><strong>Interpretation:</strong> {step.interpretation}</p>}
                        {step.decision && <p className="text-sm text-zinc-300"><strong>Decision:</strong> {step.decision}</p>}
                        {step.action && <p className="text-sm text-zinc-300"><strong>Proposed action:</strong> {step.action}</p>}
                        {step.outcome && <p className="text-sm text-zinc-400"><strong>Outcome:</strong> {step.outcome}</p>}
                    </article>
                ))}
            </section>
            <Link href="/"><Button variant="outline">Learn about ShadowTest</Button></Link>
        </main>
    );
}
