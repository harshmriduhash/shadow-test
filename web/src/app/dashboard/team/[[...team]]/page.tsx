"use client";

import { OrganizationProfile } from "@clerk/nextjs";

export default function TeamPage() {
    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <header>
                <h1 className="text-4xl font-bold tracking-tight text-white">Team workspace</h1>
                <p className="mt-2 text-sm text-zinc-400">Manage organization members and invitations. Select an organization in the dashboard header to scope shared projects.</p>
            </header>
            <OrganizationProfile />
        </div>
    );
}
