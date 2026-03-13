"use client";
import { useAuth } from "@clerk/nextjs";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Rocket, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

export default function NewProjectPage() {
    const { userId } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        productUrl: "",
        repoUrl: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const project = await api.projects.create({
                ...formData,
                userId
            }, {
                headers: { 'x-user-id': userId || '' }
            });
            router.push(`/dashboard/projects/${project.id}`);
        } catch (error) {
            console.error("Failed to create project:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto flex flex-col gap-10 py-4">
            <header className="space-y-4">
                <Link href="/dashboard" className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] flex items-center hover:text-primary transition-colors group w-fit">
                    <ArrowLeft className="mr-2 h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                    Return to Infrastructure
                </Link>
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-tighter text-white">Initialize Node</h1>
                    <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Setup Environment for Neural Testing</p>
                </div>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className="rounded-3xl border-white/[0.05] bg-zinc-900/30 backdrop-blur-sm overflow-hidden border-t-primary/20">
                    <form onSubmit={handleSubmit}>
                        <CardHeader className="pb-8">
                            <CardTitle className="text-xl text-white">Project Parameters</CardTitle>
                            <CardDescription className="text-zinc-500 font-light">Define the context for synthetic behavioral synthesis.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <Label htmlFor="name" className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">System Identifier <span className="text-primary">*</span></Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Phoenix Dashboard"
                                        required
                                        className="rounded-xl bg-zinc-950/50 border-white/[0.05] h-12 focus:ring-primary/20 transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="description" className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Logic Description <span className="text-primary">*</span></Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Explain the core functionality and user goals..."
                                        className="min-h-[120px] rounded-xl bg-zinc-950/50 border-white/[0.05] resize-none focus:ring-primary/20 transition-all text-sm leading-relaxed"
                                        required
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="productUrl" className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Deployment URL</Label>
                                        <Input
                                            id="productUrl"
                                            type="url"
                                            placeholder="https://app.io"
                                            className="rounded-xl bg-zinc-950/50 border-white/[0.05] h-11 focus:ring-primary/20 transition-all text-xs"
                                            value={formData.productUrl}
                                            onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="repoUrl" className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Repository Path</Label>
                                        <Input
                                            id="repoUrl"
                                            type="url"
                                            placeholder="github.com/org/repo"
                                            className="rounded-xl bg-zinc-950/50 border-white/[0.05] h-11 focus:ring-primary/20 transition-all text-xs"
                                            value={formData.repoUrl}
                                            onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between border-t border-white/[0.05] pt-8 px-8 pb-8">
                            <Link href="/dashboard">
                                <Button variant="ghost" type="button" className="rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.05]">Abort</Button>
                            </Link>
                            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground rounded-xl px-8 h-12 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all font-semibold">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Initialize Compute
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
}
