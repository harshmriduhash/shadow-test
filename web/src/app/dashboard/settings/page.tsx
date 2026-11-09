"use client";

import { UserProfile, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, authOptions, type PlanOverview } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
    const { isLoaded, userId, getToken } = useAuth();
    const [plan, setPlan] = useState<PlanOverview | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isLoaded || !userId) return;
        let cancelled = false;
        void (async () => {
            try {
                const value = await api.billing.subscription(authOptions(await getToken()));
                if (!cancelled) setPlan(value);
            } catch (loadError) {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load subscription.");
            }
        })();
        return () => { cancelled = true; };
    }, [getToken, isLoaded, userId]);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <header>
                <h1 className="text-4xl font-bold tracking-tight text-white">Settings</h1>
                <p className="mt-2 text-sm text-zinc-400">Manage your account, security, and connected sign-in methods.</p>
            </header>
            <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Plan and usage</h2>
                        {plan ? (
                            <p className="mt-2 text-sm text-zinc-400">
                                {plan.plan} · {plan.usage.simulations} of {plan.limits.simulationsPerMonth} simulations this month
                                {plan.limits.projects === null ? "" : ` · ${plan.usage.projects} of ${plan.limits.projects} projects`}
                            </p>
                        ) : <p className="mt-2 text-sm text-zinc-500">Loading subscription…</p>}
                    </div>
                    <Link href="/pricing"><Button variant="outline">View plans</Button></Link>
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            </section>
            <UserProfile />
        </div>
    );
}
