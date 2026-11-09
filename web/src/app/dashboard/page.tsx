"use client";
import { useAuth } from "@clerk/nextjs";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Cpu, ArrowUpRight } from "lucide-react";
import { api, authOptions, type Project } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function DashboardPage() {
    const { isLoaded, userId, getToken } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isLoaded || !userId) return;
        let cancelled = false;
        const loadProjects = async () => {
            try {
                const token = await getToken();
                const result = await api.projects.list(authOptions(token));
                if (!cancelled) setProjects(result);
            } catch (loadError) {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load projects.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void loadProjects();
        return () => { cancelled = true; };
    }, [getToken, isLoaded, userId]);

    return (
        <div className="flex flex-col gap-10">
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-tighter text-white">Infrastructure</h1>
                    <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Active Neural Projects / Global Scope</p>
                </div>
                <Link href="/dashboard/projects/new">
                    <Button className="bg-primary text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all rounded-xl h-12 px-6">
                        <Plus className="mr-2 h-4 w-4" />
                        New Simulation
                    </Button>
                </Link>
            </div>

            {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
            {!loading && projects.length === 0 && (
                <section className="rounded-3xl border border-primary/20 bg-primary/[0.03] p-8">
                    <h2 className="text-2xl font-semibold text-white">Welcome to ShadowTest</h2>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                        Create a project, choose a persona, and run a read-only behavioral walkthrough of your product.
                    </p>
                </section>
            )}

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-[240px] rounded-3xl border border-white/[0.05] bg-zinc-900/20 p-6 space-y-4">
                            <Skeleton className="h-6 w-1/3" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                            <div className="pt-8">
                                <Skeleton className="h-10 w-full rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Create New Card */}
                    <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="group flex flex-col justify-center border-dashed border border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/50 transition-all cursor-pointer min-h-[240px] rounded-3xl"
                    >
                        <Link href="/dashboard/projects/new" className="h-full flex flex-col items-center justify-center p-8 text-center">
                            <div className="bg-primary/10 p-4 rounded-2xl mb-4 group-hover:bg-primary/20 transition-colors">
                                <Plus className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Initialize Project</h3>
                            <p className="text-xs text-zinc-500 mt-2 font-mono uppercase tracking-wider">Start New Compute Instance</p>
                        </Link>
                    </motion.div>

                    {projects.map((project, index) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="flex flex-col min-h-[240px] rounded-3xl border-white/[0.05] bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-white/[0.1] transition-all group overflow-hidden">
                                <CardHeader className="pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl text-white tracking-tight">{project.name}</CardTitle>
                                            <p className="text-[10px] font-mono text-primary uppercase tracking-[0.2em]">Active</p>
                                        </div>
                                        <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:border-primary/30 transition-colors">
                                            <Cpu className="h-5 w-5 text-zinc-500 group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                    <CardDescription className="line-clamp-2 text-zinc-400 text-sm mt-2 font-light leading-relaxed">
                                        {project.description || "Synthesizing behavioral patterns for this node."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono uppercase tracking-tighter">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                        <span>{project._count?.simulations || 0} Simulations Recorded</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-4 border-t border-white/[0.05]">
                                    <Link href={`/dashboard/projects/${project.id}`} className="w-full">
                                        <Button variant="ghost" className="w-full group/btn text-zinc-300 hover:text-white hover:bg-white/[0.05] rounded-xl flex items-center justify-between px-4 h-10">
                                            <span>Access Node</span>
                                            <ArrowUpRight className="h-4 w-4 opacity-0 group-hover/btn:opacity-100 transition-all -translate-x-2 group-hover/btn:translate-x-0" />
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
