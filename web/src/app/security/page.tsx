"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, UploadCloud, Cpu, Sparkles, Server } from "lucide-react";
import { motion } from "framer-motion";

export default function SecurityPage() {
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
                    <Link className="text-sm font-medium text-primary" href="/security">Security</Link>
                    <Link href="/signup">
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">Launch</Button>
                    </Link>
                </nav>
            </header>

            <main className="flex-1 pt-32 pb-20">
                <div className="container px-4 md:px-6 max-w-5xl mx-auto">
                    <div className="text-center mb-24 space-y-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-mono text-primary uppercase tracking-[0.2em]"
                        >
                            <ShieldCheck className="h-3 w-3" />
                            Vault Protocol v4.0
                        </motion.div>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-white">Infrastructure Integrity.</h1>
                        <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-light leading-relaxed">
                            ShadowTest prioritizes the sanitization and protection of your proprietary application logic and behavioral datasets.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            {
                                icon: Lock,
                                title: "Authentication Shielding",
                                desc: "API requests are authenticated with Clerk-issued bearer tokens verified against the configured Clerk JWKS and issuer.",
                                color: "text-primary"
                            },
                            {
                                icon: Server,
                                title: "Data Siloing",
                                desc: "Project, persona, simulation, and report queries are scoped to the authenticated account in the application data layer.",
                                color: "text-zinc-500"
                            },
                            {
                                icon: UploadCloud,
                                title: "Ephemeral Ingestion",
                                desc: "The service does not store fetched source files or full page snapshots. Generated traces and reports are persisted for your account.",
                                color: "text-zinc-500"
                            },
                            {
                                icon: Sparkles,
                                title: "Neural Privacy",
                                desc: "Simulation context, including extracted page text and any supplied README, is sent to Anthropic to generate the walkthrough. Avoid submitting secrets or data you are not authorized to share.",
                                color: "text-primary"
                            }
                        ].map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-zinc-900/20 border border-white/[0.05] p-8 rounded-[2.5rem] backdrop-blur-sm group hover:border-primary/20 transition-all"
                            >
                                <item.icon className={`h-10 w-10 ${item.color} mb-6 opacity-80 group-hover:scale-110 transition-transform`} />
                                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{item.title}</h3>
                                <p className="text-zinc-500 text-sm font-light leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mt-24 p-12 rounded-[3rem] border border-primary/20 bg-primary/[0.02] text-center"
                    >
                        <h3 className="text-2xl font-bold text-white mb-2 italic tracking-tighter">Early-access security scope</h3>
                        <p className="text-zinc-500 font-light mb-8 max-w-xl mx-auto">ShadowTest is not currently represented as SOC 2 certified. Review the data-handling details above before submitting product context.</p>
                        <Link href="/contact">
                            <Button className="bg-primary text-primary-foreground rounded-2xl px-10 h-14 shadow-xl shadow-primary/10 font-bold">Request Security Brief</Button>
                        </Link>
                    </motion.div>
                </div>
            </main>

            <footer className="w-full py-12 border-t border-white/[0.05] bg-black/50">
                <div className="container px-4 text-center">
                    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.4em]">© 2026 ShadowTest // Cryptographic Ops Layer</p>
                </div>
            </footer>
        </div>
    );
}
