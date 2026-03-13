"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, FileDown, Eye, BarChart3, TrendingUp, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ReportsPage() {
    return (
        <div className="flex flex-col gap-10 max-w-6xl mx-auto">
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-tighter text-white">Intelligence</h1>
                    <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Aggregated Behavioral Analytics</p>
                </div>
                <Button variant="outline" className="rounded-xl border-white/[0.05] hover:bg-white/[0.02] text-zinc-400 group">
                    <FileDown className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" />
                    Export Global Data
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {[
                    { label: "Total Loops", value: "124", sub: "+12% Efficiency", icon: BarChart3, color: "text-zinc-400" },
                    { label: "Success Rate", value: "68%", sub: "Task Completion", icon: TrendingUp, color: "text-primary" },
                    { label: "Critical Friction", value: "Reg Flow", sub: "High Cognitive Load", icon: AlertCircle, color: "text-destructive" },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card className="rounded-3xl border-white/[0.05] bg-zinc-900/20 hover:bg-zinc-900/30 transition-colors group">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{stat.label}</CardTitle>
                                <stat.icon className={`h-4 w-4 ${stat.color} opacity-50`} />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-3xl font-bold tracking-tighter ${stat.color === 'text-primary' ? 'text-primary' : 'text-white'}`}>{stat.value}</div>
                                <p className="text-[10px] font-mono text-zinc-600 mt-2 uppercase tracking-tighter">{stat.sub}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <Card className="rounded-3xl border-white/[0.05] bg-transparent overflow-hidden">
                <CardHeader className="border-b border-white/[0.05] pb-6">
                    <CardTitle className="text-xl text-white">Recent Intel</CardTitle>
                    <CardDescription className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Behavioral Trace History</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="bg-black/20 overflow-hidden">
                        <div className="grid grid-cols-5 bg-white/[0.02] p-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-white/[0.05]">
                            <div className="col-span-1">Status</div>
                            <div className="col-span-1">Project</div>
                            <div className="col-span-1">Persona</div>
                            <div className="col-span-1">Timestamp</div>
                            <div className="col-span-1 text-right">Actions</div>
                        </div>
                        <div className="divide-y divide-white/[0.05]">
                            {[
                                { status: 'success', project: 'Acme CRM', persona: 'Enterprise Buyer', date: '2h ago' },
                                { status: 'failed', project: 'Acme CRM', persona: 'Impatient Dev', date: '5h ago' },
                            ].map((report, idx) => (
                                <div key={idx} className="grid grid-cols-5 items-center p-4 text-sm group hover:bg-white/[0.02] transition-colors">
                                    <div className={`col-span-1 flex items-center text-xs font-mono uppercase tracking-tighter ${report.status === 'success' ? 'text-primary' : 'text-destructive'}`}>
                                        {report.status === 'success' ? <CheckCircle2 className="h-3 w-3 mr-2" /> : <XCircle className="h-3 w-3 mr-2" />}
                                        {report.status}
                                    </div>
                                    <div className="col-span-1 font-medium text-zinc-300">{report.project}</div>
                                    <div className="col-span-1 text-zinc-500 text-xs">{report.persona}</div>
                                    <div className="col-span-1 text-zinc-600 text-[10px] font-mono">{report.date}</div>
                                    <div className="col-span-1 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="rounded-lg hover:bg-white/[0.05] text-zinc-400 group-hover:text-white"><Eye className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="rounded-lg hover:bg-white/[0.05] text-zinc-400 group-hover:text-white"><FileDown className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
