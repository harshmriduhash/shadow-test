"use client";

import Link from "next/link";
import { LayoutDashboard, Users, Activity, FileText, Settings, Search, Cpu } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
                                placeholder="Universal Search..."
                                className="w-full rounded-2xl border-white/[0.05] bg-zinc-900/30 pl-10 h-10 text-sm focus:ring-primary/20 focus:border-primary/50 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-6">
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
