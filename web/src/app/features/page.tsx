"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, Brain, Activity, ChartSpline, Code, Cpu, MousePointer2, Target, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function FeaturesPage() {
    return (
        <div className="flex flex-col min-h-screen bg-[#020202] text-zinc-100">
            {/* Nav */}
            <header className="fixed top-0 w-full z-50 px-6 h-16 flex items-center border-b border-white/[0.05] bg-black/50 backdrop-blur-xl">
                <Link className="flex items-center justify-center font-bold text-lg gap-2 group" href="/">
                    <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                        <Cpu className="h-5 w-5 text-primary" />
                    </div>
                    <span className="tracking-tighter text-xl text-white">
                        Shadow<span className="text-primary">Test</span>
                    </span>
                </Link>
                <nav className="ml-auto flex gap-8 items-center">
                    <Link className="text-sm font-medium text-primary" href="/features">Features</Link>
                    <Link className="text-sm font-medium text-zinc-400 hover:text-primary transition-colors" href="/pricing">Pricing</Link>
                    <Link href="/login"><Button variant="ghost" className="text-sm text-zinc-400">Log in</Button></Link>
                    <Link href="/signup">
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">Launch</Button>
                    </Link>
                </nav>
            </header>

            <main className="flex-1 pt-32 pb-20">
                <div className="container px-4 md:px-6 max-w-6xl mx-auto">
                    <div className="mb-24 space-y-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-mono text-primary uppercase tracking-[0.2em]"
                        >
                            <Sparkles className="h-3 w-3" />
                            Core Infrastructure
                        </motion.div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white max-w-3xl">
                            Neural Behavioral <br /><span className="text-zinc-500">Synthesis Engine.</span>
                        </h1>
                        <p className="text-xl text-zinc-400 max-w-2xl font-light leading-relaxed">
                            ShadowTest isn't just a crawler. It's a high-fidelity simulation environment where synthetic personas reason, react, and report on your UX.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-24">
                        {/* Bento Item 1 */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="md:col-span-8 group relative rounded-3xl border border-white/[0.05] bg-zinc-900/20 p-8 overflow-hidden"
                        >
                            <div className="relative z-10">
                                <Brain className="h-10 w-10 text-primary mb-6 opacity-80" />
                                <h3 className="text-2xl font-bold text-white mb-4">Synthetic Persona Matrix</h3>
                                <p className="text-zinc-400 font-light leading-relaxed max-w-md">
                                    Simulate diverse user segments from "Impatient Developers" to "Non-technical C-Suite". Each persona operates with custom technical literacy and risk tolerance.
                                </p>
                            </div>
                            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                        </motion.div>

                        {/* Bento Item 2 */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="md:col-span-4 rounded-3xl border border-white/[0.05] bg-zinc-900/20 p-8 flex flex-col justify-between"
                        >
                            <Target className="h-10 w-10 text-zinc-500 mb-6" />
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Goal-Oriented Logic</h3>
                                <p className="text-zinc-500 text-sm font-light">Defined tasks are processed through cognitive loops: Observe > Interpret > Act.</p>
                            </div>
                        </motion.div>

                        {/* Bento Item 3 */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="md:col-span-4 rounded-3xl border border-white/[0.05] bg-zinc-900/20 p-8"
                        >
                            <Activity className="h-10 w-10 text-primary mb-6" />
                            <h3 className="text-xl font-bold text-white mb-2">Live Trace Logging</h3>
                            <p className="text-zinc-500 text-sm font-light">Real-time breakdown of every interpretation error and friction point encounter.</p>
                        </motion.div>

                        {/* Bento Item 4 */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="md:col-span-8 rounded-3xl border border-white/[0.05] bg-zinc-900/20 p-8 relative overflow-hidden group"
                        >
                            <code className="text-[10px] font-mono text-primary/40 absolute top-4 right-8 group-hover:text-primary/60 transition-colors uppercase tracking-widest">Behavioral Scripting</code>
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold text-white">Seamless Infrastructure Integration</h3>
                                <p className="text-zinc-400 font-light max-w-lg">
                                    Connect your GitHub repositories or live URLs. ShadowTest automatically maps your DOM and initializes neural testing protocols.
                                </p>
                                <div className="pt-6 flex gap-4">
                                    <div className="h-2 w-24 rounded-full bg-primary/20" />
                                    <div className="h-2 w-12 rounded-full bg-zinc-800" />
                                    <div className="h-2 w-32 rounded-full bg-zinc-800" />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>

            <footer className="w-full py-12 border-t border-white/[0.05] bg-black/50">
                <div className="container px-4 text-center">
                    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.4em]">© 2026 ShadowTest // Neural Research Labs</p>
                </div>
            </footer>
        </div>
    );
}
