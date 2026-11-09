"use client";

import { OrganizationProfile, useAuth, useOrganization } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { api, authOptions, type WorkspaceAccess } from "@/lib/api";

export default function TeamPage() {
    const { getToken } = useAuth();
    const { organization } = useOrganization();
    const [access, setAccess] = useState<WorkspaceAccess | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const result = await api.workspace.access(authOptions(await getToken()));
                if (!cancelled) setAccess(result);
            } catch (loadError) {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load workspace permissions.");
            }
        })();
        return () => { cancelled = true; };
    }, [getToken, organization?.id]);

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <header>
                <h1 className="text-4xl font-bold tracking-tight text-white">Team workspace</h1>
                <p className="mt-2 text-sm text-zinc-400">Manage organization membership, invitations, and shared project access.</p>
            </header>
            {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
            {access && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <h2 className="font-semibold text-white">{organization?.name || "Personal workspace"}</h2>
                    <p className="mt-1 text-sm text-zinc-400">Your role: {access.role}</p>
                    <ul className="mt-4 grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
                        <li>{access.capabilities.viewProjects ? "Can view shared projects" : "Cannot view shared projects"}</li>
                        <li>{access.capabilities.runSimulations ? "Can run simulations" : "Cannot run simulations"}</li>
                        <li>{access.capabilities.manageProjectsAndPersonas ? "Can manage projects and personas" : "Only organization admins can manage projects and personas"}</li>
                        <li>{access.capabilities.manageDocuments ? "Can upload and delete documents" : "Only organization admins can manage documents"}</li>
                    </ul>
                </section>
            )}
            <OrganizationProfile />
        </div>
    );
}
