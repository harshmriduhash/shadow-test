"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, authOptions, type Report } from "@/lib/api";

function readInsights(value: string | null) {
    if (!value) return { items: [], error: "" };
    try {
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed) || !parsed.every(item => typeof item === "string")) {
            return { items: [], error: "Stored insights have an unexpected format." };
        }
        return { items: parsed as string[], error: "" };
    } catch {
        return { items: [], error: "Stored insights could not be decoded." };
    }
}

function csvCell(value: string | number) {
    return `"${String(value).replaceAll('"', '""')}"`;
}

export default function ReportsPage() {
    const { isLoaded, userId, getToken } = useAuth();
    const { organization } = useOrganization();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isLoaded || !userId) return;
        let cancelled = false;
        void (async () => {
            try {
                const page = await api.reports.list(authOptions(await getToken()));
                if (!cancelled) {
                    setReports(page.items);
                    setNextCursor(page.nextCursor);
                    setTotalCount(page.totalCount);
                }
            } catch (loadError) {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [getToken, isLoaded, organization?.id, userId]);

    const loadMore = async () => {
        if (!nextCursor) return;
        setLoadingMore(true);
        setError("");
        try {
            const page = await api.reports.list(authOptions(await getToken()), nextCursor);
            setReports(current => [...current, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load more reports.");
        } finally {
            setLoadingMore(false);
        }
    };

    const metrics = useMemo(() => {
        const knownOutcomes = reports.filter(report => typeof report.simulation.success === "boolean");
        const successes = knownOutcomes.filter(report => report.simulation.success).length;
        const frictionCount = reports.reduce((total, report) => total + readInsights(report.insights).items.length, 0);
        return {
            total: totalCount,
            successRate: knownOutcomes.length ? Math.round((successes / knownOutcomes.length) * 100) : null,
            frictionCount
        };
    }, [reports, totalCount]);

    const exportCsv = async () => {
        setExporting(true);
        setError("");
        let allReports: Report[];
        try {
            const options = authOptions(await getToken());
            let page = await api.reports.list(options);
            allReports = [...page.items];
            while (page.nextCursor) {
                page = await api.reports.list(options, page.nextCursor);
                allReports.push(...page.items);
            }
        } catch (exportError) {
            setError(exportError instanceof Error ? exportError.message : "Unable to export reports.");
            setExporting(false);
            return;
        }
        const rows = [
            ["Project", "Persona", "Task", "Status", "Successful", "Summary", "Insights", "Created at"],
            ...allReports.map(report => [
                report.simulation.project.name,
                report.simulation.persona.name,
                report.simulation.task,
                report.simulation.status,
                report.simulation.success === null || report.simulation.success === undefined ? "Unknown" : String(report.simulation.success),
                report.summary || "",
                readInsights(report.insights).items.join("; "),
                report.createdAt
            ])
        ];
        const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "shadowtest-reports.csv";
        anchor.click();
        URL.revokeObjectURL(url);
        setExporting(false);
    };

    return (
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
            <header className="flex items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white">Reports</h1>
                    <p className="mt-2 text-sm text-zinc-400">Outcomes and friction insights from your completed simulations.</p>
                </div>
                <Button variant="outline" onClick={() => void exportCsv()} disabled={!reports.length || exporting}>
                    {exporting ? "Preparing…" : "Export all CSV"}
                </Button>
            </header>
            {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardHeader><CardTitle>Total reports</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-white">{metrics.total}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Task success rate (loaded)</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-white">{metrics.successRate === null ? "—" : `${metrics.successRate}%`}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Friction insights (loaded)</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-white">{metrics.frictionCount}</p></CardContent></Card>
            </div>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Reports · {reports.length} of {totalCount}</h2>
                {loading && <p className="text-sm text-zinc-500">Loading reports…</p>}
                {!loading && reports.map(report => {
                    const insights = readInsights(report.insights);
                    return (
                        <article key={report.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-medium text-white">{report.simulation.project.name}</h3>
                                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">{report.simulation.status}</span>
                                        {typeof report.simulation.success === "boolean" && (
                                            <span className="text-xs text-zinc-400">{report.simulation.success ? "Task succeeded" : "Task not completed"}</span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-zinc-500">{report.simulation.persona.name} · {new Date(report.createdAt).toLocaleString()}</p>
                                    <p className="mt-4 text-sm text-zinc-300">{report.summary}</p>
                                    {insights.items.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-400">{insights.items.map((insight, index) => <li key={`${report.id}-${index}`}>{insight}</li>)}</ul>}
                                    {insights.error && <p role="alert" className="mt-3 text-sm text-destructive">{insights.error}</p>}
                                </div>
                                <Link href={`/dashboard/reports/${report.id}`} className="shrink-0">
                                    <Button variant="outline" size="sm">View report</Button>
                                </Link>
                            </div>
                        </article>
                    );
                })}
                {!loading && reports.length === 0 && <p className="rounded-xl border border-white/10 p-6 text-sm text-zinc-500">Reports will appear here after your first simulation completes.</p>}
                {!loading && nextCursor && (
                    <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
                        {loadingMore ? "Loading…" : "Load more reports"}
                    </Button>
                )}
            </section>
        </div>
    );
}
