"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cpu, Send, MessageSquare, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function ContactPage() {
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
                    <Link className="text-sm font-medium text-zinc-400 hover:text-primary transition-colors" href="/features">Features</Link>
                    <Link className="text-sm font-medium text-zinc-400 hover:text-primary transition-colors" href="/pricing">Pricing</Link>
                    <Link className="text-sm font-medium text-zinc-400 hover:text-primary transition-colors" href="/security">Security</Link>
                    <Link href="/signup">
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">Launch</Button>
                    </Link>
                </nav>
            </header>

            <main className="flex-1 pt-32 pb-20">
                <div className="container px-4 md:px-6 max-w-3xl mx-auto">
                    <div className="text-center mb-16 space-y-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-mono text-primary uppercase tracking-[0.2em]"
                        >
                            <MessageSquare className="h-3 w-3" />
                            Neural Support Channel
                        </motion.div>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-white font-serif">Open Request.</h1>
                        <p className="text-xl text-zinc-500 font-light leading-relaxed">
                            Have questions about our behavioral matrix or enterprise clustering? Our engineering team is standing by.
                        </p>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-900/20 border border-white/[0.05] p-10 rounded-[3rem] backdrop-blur-sm"
                    >
                        <form className="space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Operator Name</label>
                                    <input type="text" placeholder="John Doe" className="w-full bg-zinc-950/50 border-white/[0.05] rounded-2xl h-14 px-6 text-sm focus:ring-primary/20 transition-all outline-none" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Response Node (Email)</label>
                                    <input type="email" placeholder="john@company.io" className="w-full bg-zinc-950/50 border-white/[0.05] rounded-2xl h-14 px-6 text-sm focus:ring-primary/20 transition-all outline-none" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Query Payload</label>
                                <textarea rows={5} placeholder="Describe your technical inquiry..." className="w-full bg-zinc-950/50 border-white/[0.05] rounded-[2rem] p-6 text-sm focus:ring-primary/20 transition-all outline-none resize-none" />
                            </div>
                            <Button className="w-full bg-primary text-primary-foreground rounded-2xl h-16 font-bold shadow-[0_4px_30px_rgba(16,185,129,0.1)] hover:shadow-[0_4px_40px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2">
                                <Send className="h-4 w-4" />
                                Dispatch Transmission
                            </Button>
                        </form>
                    </motion.div>
                </div>
            </main>

            <footer className="w-full py-12 border-t border-white/[0.05] bg-black/50">
                <div className="container px-4 text-center">
                    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.4em]">© 2026 ShadowTest // Transmission Protocol v4.0</p>
                </div>
            </footer>
        </div>
    );
}
