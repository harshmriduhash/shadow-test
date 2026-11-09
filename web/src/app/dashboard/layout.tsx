"use client";

import Link from "next/link";
import { LayoutDashboard, Users, Activity, FileText, Settings, Search, Cpu, Building2 } from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, authOptions, type DashboardSearchResults } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { getToken } = useAuth();
    const { organization } = useOrganization();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<DashboardSearchResults | null>(null);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);

    const searchItems = useMemo(() => results ? [
        ...results.projects.map(item => ({ id: item.id, title: item.name, href: item.href, category: "Projects" })),
        ...results.personas.map(item => ({ id: item.id, title: item.name, href: item.href, category: "Personas" })),
        ...results.simulations.map(item => ({ id: item.id, title: item.task, href: item.href, category: "Simulations" })),
        ...results.reports.map(item => ({ id: item.id, title: item.summary || item.simulation.project.name, href: item.href, category: "Reports" }))
    ] : [], [results]);

    useEffect(() => {
        const normalized = query.trim();
        if (normalized.length < 2) {
            setResults(null);
            setSearching(false);
            setSearchError("");
            return;
        }
        setResults(null);
        let cancelled = false;
        const timer = window.setTimeout(() => {
            setSearching(true);
            setSearchError("");
            void (async () => {
                try {
                    const result = await api.search(normalized, authOptions(await getToken()));
                    if (!cancelled) setResults(result);
                } catch (error) {
                    if (!cancelled) setSearchError(error instanceof Error ? error.message : "Search is unavailable.");
                } finally {
                    if (!cancelled) setSearching(false);
                }
            })();
        }, 250);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [getToken, organization?.id, query]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-[#050505] text-zinc-100">
            <div className="flex flex-col sm:gap-4">
                {/* Desktop Sidebar */}
                <aside className="fixed inset-y-8 left-4 z-40 hidden w-64 flex-col rounded-3xl border border-white/[0.05] bg-zinc-900/40 backdrop-blur-xl sm:flex shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <div className="flex h-20 shrink-0 items-center px-8">
                        <Link className="flex items-center gap-2 group" href="/">
                            <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                                <Cpu className="h-5 w-5 text-primary" />
                            </div>
                            <span className="tracking-tighter text-xl font-bold">
                                Shadow<span className="text-primary">Test</span>
                            </span>
                        </Link>
                    </div>
                    
                    <nav className="flex-1 overflow-auto py-6">
                        <div className="px-6 mb-4">
                            <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">Command Center</h2>
                        </div>
                        <ul className="grid gap-2 px-4">
                            {[
                                { href: "/dashboard", label: "Projects", icon: LayoutDashboard },
                                { href: "/dashboard/personas", label: "Personas", icon: Users },
                                { href: "/dashboard/simulations", label: "Simulations", icon: Activity },
                                { href: "/dashboard/reports", label: "Reports", icon: FileText },
                                { href: "/dashboard/team", label: "Team", icon: Building2 },
                            ].map((item) => (
                                <li key={item.href}>
                                    <Link 
                                        href={item.href} 
                                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-zinc-400 transition-all hover:text-white hover:bg-white/[0.05] group relative overflow-hidden"
                                    >
                                        <item.icon className="h-4 w-4 group-hover:text-primary transition-colors" />
                                        {item.label}
                                        <motion.div 
                                            className="absolute left-0 w-1 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-0 transition-all"
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="mt-auto p-6 border-t border-white/[0.05]">
                        <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-zinc-500 transition-all hover:text-white hover:bg-white/[0.05]">
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="sm:ml-72 flex flex-col flex-1 min-h-screen">
                    {/* Topbar */}
                    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 bg-[#050505]/80 backdrop-blur-md px-8">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <Input
                                type="search"
                                placeholder="Search projects, personas, runs…"
                                value={query}
                                onChange={event => {
                                    setQuery(event.target.value);
                                    setSearchOpen(true);
                                }}
                                onFocus={() => setSearchOpen(true)}
                                onKeyDown={event => {
                                    if (event.key === "Escape") setSearchOpen(false);
                                    if (event.key === "Enter" && searchItems[0]) {
                                        router.push(searchItems[0].href);
                                        setSearchOpen(false);
                                    }
                                }}
                                aria-label="Search projects, personas, simulations, and reports"
                                aria-expanded={searchOpen && query.trim().length >= 2}
                                aria-controls="dashboard-search-results"
                                className="w-full rounded-2xl border-white/[0.05] bg-zinc-900/30 pl-10 h-10 text-sm focus:ring-primary/20 focus:border-primary/50 transition-all"
                            />
                            {searchOpen && query.trim().length >= 2 && (
                                <div id="dashboard-search-results" aria-label="Dashboard search results" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 p-2 shadow-xl">
                                    {searching && <p className="px-3 py-2 text-sm text-zinc-500">Searching…</p>}
                                    {searchError && <p role="alert" className="px-3 py-2 text-sm text-destructive">{searchError}</p>}
                                    {!searching && !searchError && searchItems.map(item => (
                                        <Link
                                            key={`${item.category}-${item.id}`}
                                            href={item.href}
                                            onClick={() => setSearchOpen(false)}
                                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/5"
                                        >
                                            <span className="truncate">{item.title || "Report"}</span>
                                            <span className="shrink-0 text-xs text-zinc-500">{item.category}</span>
                                        </Link>
                                    ))}
                                    {!searching && !searchError && searchItems.length === 0 && (
                                        <p className="px-3 py-2 text-sm text-zinc-500">No matching projects, personas, simulations, or reports.</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-6">
                            <OrganizationSwitcher
                                afterCreateOrganizationUrl="/dashboard"
                                afterSelectOrganizationUrl="/dashboard"
                                appearance={{
                                    elements: {
                                        rootBox: "text-zinc-300",
                                        organizationSwitcherTrigger: "rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2"
                                    }
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Engine Active</span>
                            </div>
                            <div className="h-4 w-[1px] bg-white/[0.05]" />
                            <UserButton 
                                appearance={{
                                    elements: {
                                        avatarBox: "h-9 w-9 rounded-xl border border-white/10"
                                    }
                                }}
                            />
                        </div>
                    </header>

                    <nav aria-label="Dashboard navigation" className="flex gap-2 overflow-x-auto px-4 pb-4 sm:hidden">
                        {[
                            { href: "/dashboard", label: "Projects" },
                            { href: "/dashboard/personas", label: "Personas" },
                            { href: "/dashboard/simulations", label: "Simulations" },
                            { href: "/dashboard/reports", label: "Reports" },
                            { href: "/dashboard/team", label: "Team" },
                            { href: "/dashboard/settings", label: "Settings" }
                        ].map(item => (
                            <Link key={item.href} href={item.href} className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-white">
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <main className="flex-1 p-8 pt-0">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            {children}
                        </motion.div>
                    </main>
                </div>
            </div>
        </div>
    );
}
