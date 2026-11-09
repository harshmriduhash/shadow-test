"use client";
import { useAuth } from "@clerk/nextjs";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Play, UserCircle2, CheckCircle2, Clock, XCircle, Activity, Loader2, Zap, Terminal } from "lucide-react";
import { api, authOptions, type Persona, type Project, type Simulation } from "@/lib/api";
import { AIThinking } from "@/components/ai-thinking";
import { motion, AnimatePresence } from "framer-motion";

export default function ProjectDetailsPage() {
    const { getToken } = useAuth();
    const { id } = useParams<{ id: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Launch Form State
    const [selectedPersona, setSelectedPersona] = useState("");
    const [task, setTask] = useState("");
    const [isLaunching, setIsLaunching] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setError("");
            const options = authOptions(await getToken());
            const [projData, simData] = await Promise.all([
                api.projects.get(id, options),
                api.projects.getSimulations(id, options)
            ]);
            setProject(projData);
            setSimulations(simData);
            setPersonas(projData.personas || []);
            const projectPersonas = projData.personas || [];
            if (projectPersonas.length > 0 && !selectedPersona) {
                setSelectedPersona(projectPersonas[0].id);
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "Unable to load project data.");
        } finally {
            setLoading(false);
        }
    }, [getToken, id, selectedPersona]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Poll for running simulations
    useEffect(() => {
        const hasRunningSim = simulations.some(s => s.status === "RUNNING" || s.status === "PENDING");
        if (!hasRunningSim) return;

        const interval = setInterval(() => {
            fetchData();
        }, 3000);

        return () => clearInterval(interval);
    }, [simulations, fetchData]);

    const handleLaunch = async () => {
        if (!selectedPersona || !task) return;
        setIsLaunching(true);
        try {
            await api.simulations.start({
                projectId: id,
                personaId: selectedPersona,
                task
            }, authOptions(await getToken()));
            setTask("");
            await fetchData();
        } catch (error) {
            setError(error instanceof Error ? error.message : "Unable to start the simulation.");
        } finally {
            setIsLaunching(false);
        }
    };

    const handleRetry = async (simulation: Simulation) => {
        setIsLaunching(true);
        setError("");
        try {
            await api.simulations.retry(simulation.id, authOptions(await getToken()));
            await fetchData();
        } catch (error) {
            setError(error instanceof Error ? error.message : "Unable to retry the simulation.");
        } finally {
            setIsLaunching(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <AIThinking />
        </div>
    );

    if (!project) return <div className="text-zinc-500 font-mono text-center py-20 uppercase tracking-widest">Error: Project Node Not Found.</div>;

    const activeSimulation = simulations.find(s => s.status === "RUNNING") || simulations[0];

    return (
        <div className="flex flex-col gap-10 max-w-6xl mx-auto">
            {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
            <header className="space-y-4">
                <Link href="/dashboard" className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] flex items-center hover:text-primary transition-colors group w-fit">
                    <ArrowLeft className="mr-2 h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                    Return to Navigation
                </Link>
                <div className="flex items-end justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-bold tracking-tighter text-white">{project.name}</h1>
                            <div className="px-2 py-0.5 rounded border border-white/[0.05] bg-white/[0.02] text-[10px] font-mono text-zinc-500 uppercase uppercase">Node: {id?.slice(-8)}</div>
                        </div>
                        <p className="text-zinc-500 max-w-2xl font-light">{project.description}</p>
                    </div>
                    <Button variant="outline" className="rounded-xl border-white/[0.05] hover:bg-white/[0.02] text-zinc-400">Settings</Button>
                </div>
            </header>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Left Column: Simulation Launcher */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="rounded-3xl border-white/[0.05] bg-zinc-900/30 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg text-white font-semibold">Initiate Compute</CardTitle>
                            <CardDescription className="text-zinc-500 text-xs uppercase font-mono tracking-widest">Configure Pulse Parameters</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Select Persona Profile</Label>
                                <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                                    <SelectTrigger className="rounded-xl bg-zinc-950/50 border-white/[0.05] h-11 focus:ring-primary/20 transition-all">
                                        <SelectValue placeholder="Target Persona" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/[0.1] rounded-xl">
                                        {personas.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="focus:bg-primary/20 focus:text-white transition-colors cursor-pointer">{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Objective Definition</Label>
                                <Textarea
                                    placeholder="Define the specific behavioral objective for the AI persona..."
                                    className="min-h-[140px] rounded-xl bg-zinc-950/50 border-white/[0.05] resize-none focus:ring-primary/20 transition-all text-sm leading-relaxed"
                                    value={task}
                                    onChange={(e) => setTask(e.target.value)}
                                />
                            </div>

                            <Button
                                className="w-full bg-primary text-primary-foreground h-12 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all font-semibold"
                                disabled={isLaunching || !task || !selectedPersona}
                                onClick={handleLaunch}
                            >
                                {isLaunching ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4 fill-current" />}
                                Launch Neural Loop
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Live View & History */}
                <div className="lg:col-span-8 space-y-8">
                    <AnimatePresence mode="wait">
                        {activeSimulation && (
                            <motion.div
                                key={activeSimulation.id + activeSimulation.status}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <Card className={`rounded-3xl border-primary/10 bg-zinc-900/30 overflow-hidden ${activeSimulation.status === 'RUNNING' ? 'ring-1 ring-primary/20 ring-offset-2 ring-offset-[#050505]' : ''}`}>
                                    <div className="p-1 items-center justify-center flex bg-primary/10 backdrop-blur-sm border-b border-white/[0.05]">
                                        <Terminal className="h-3 w-3 text-primary mr-2" />
                                        <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em]">Behavioral Trace / {activeSimulation.status}</span>
                                    </div>
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-2 w-2 rounded-full ${activeSimulation.status === 'RUNNING' ? 'bg-primary animate-pulse' : 'bg-zinc-700'}`} />
                                                <CardTitle className="text-xl text-white font-medium">Neural Observations</CardTitle>
                                            </div>
                                            <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest bg-white/[0.03] px-2 py-1 rounded">Cycle Auto-Stream</div>
                                        </div>
                                        <p className="text-sm text-zinc-400 font-light italic mt-2 border-l-2 border-primary/20 pl-4 py-1 bg-white/[0.01]">Objective: {activeSimulation.task}</p>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="max-h-[500px] overflow-auto bg-black/40 px-8 py-6 custom-scrollbar">
                                            {(activeSimulation.status === 'RUNNING' || activeSimulation.status === 'PENDING') && activeSimulation.steps?.length === 0 && (
                                                <div className="py-12 flex flex-col items-center">
                                                    <AIThinking />
                                                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] -mt-4 animate-pulse">Initializing Environment...</p>
                                                </div>
                                            )}
                                            <div className="space-y-8">
                                                {[...(activeSimulation.steps || [])].sort((a, b) => a.stepNumber - b.stepNumber).map((step, idx) => (
                                                    <motion.div 
                                                        key={step.id} 
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className="relative pl-8 border-l border-white/[0.05]"
                                                    >
                                                        <div className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-zinc-800 border border-white/[0.1] group-hover:bg-primary transition-colors" />
                                                        <div className="font-mono text-[10px] text-primary mb-3 uppercase tracking-widest">Step 0{step.stepNumber} · t+{(idx * 1.5).toFixed(1)}s</div>
                                                        <div className="grid gap-3">
                                                            {step.observation && (
                                                                <div className="flex gap-4">
                                                                    <span className="text-[10px] font-mono text-zinc-600 uppercase w-20 shrink-0 mt-1">Observation</span>
                                                                    <p className="text-zinc-300 text-sm font-light leading-relaxed">{step.observation}</p>
                                                                </div>
                                                            )}
                                                            {step.interpretation && (
                                                                <div className="flex gap-4">
                                                                    <span className="text-[10px] font-mono text-zinc-600 uppercase w-20 shrink-0 mt-1">Analysis</span>
                                                                    <p className="text-zinc-400 text-sm font-light italic leading-relaxed">{step.interpretation}</p>
                                                                </div>
                                                            )}
                                                            {step.action && (
                                                                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <Zap className="h-4 w-4 text-primary" />
                                                                        <span className="text-sm font-medium text-white">{step.action}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-mono text-primary/60 uppercase">Executing Command</span>
                                                                </div>
                                                            )}
                                                            {step.decision && (
                                                                <div className="flex gap-4">
                                                                    <span className="text-[10px] font-mono text-zinc-600 uppercase w-20 shrink-0 mt-1">Decision</span>
                                                                    <p className="text-zinc-300 text-sm font-light leading-relaxed">{step.decision}</p>
                                                                </div>
                                                            )}
                                                            {step.outcome && (
                                                                <div className="flex gap-4">
                                                                    <span className="text-[10px] font-mono text-zinc-600 uppercase w-20 shrink-0 mt-1">Outcome</span>
                                                                    <p className="text-zinc-300 text-sm font-light leading-relaxed">{step.outcome}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                                {(activeSimulation.status === 'RUNNING' || activeSimulation.status === 'PENDING') && (activeSimulation.steps?.length ?? 0) > 0 && (
                                                    <div className="flex items-center gap-4 pl-8">
                                                        <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
                                                        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest animate-pulse">Computing Next Move...</span>
                                                    </div>
                                                )}
                                                {activeSimulation.status === 'COMPLETED' && (
                                                    <div className="bg-emerald-500/10 rounded-2xl p-6 border border-emerald-500/20 text-center space-y-2">
                                                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                                                        <h4 className="text-lg font-bold text-white tracking-tight">Loop Terminated Successfully</h4>
                                                        <p className="text-zinc-400 text-sm">Synthetic user has completed the objective within 12 cycles.</p>
                                                    </div>
                                                )}
                                                {activeSimulation.status === 'FAILED' && (
                                                    <div className="flex flex-col items-center gap-3 py-6">
                                                        <p className="text-sm text-zinc-400">This run failed. You can retry it without losing its history.</p>
                                                        <Button variant="outline" disabled={isLaunching} onClick={() => void handleRetry(activeSimulation)}>
                                                            {isLaunching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                            Retry simulation
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* History */}
                    <Card className="rounded-3xl border-white/[0.05] bg-zinc-900/10">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.05] py-6 px-8">
                            <div>
                                <CardTitle className="text-lg text-white">Historical Logs</CardTitle>
                                <CardDescription className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mt-1">Previous Compute Iterations</CardDescription>
                            </div>
                            <Activity className="h-5 w-5 text-zinc-700" />
                        </CardHeader>
                        <CardContent className="px-8 pb-6 pt-2">
                            <div className="space-y-2">
                                {simulations.map(sim => (
                                    <div key={sim.id} className="flex items-center justify-between py-4 group">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 h-10 w-10 flex items-center justify-center rounded-2xl border border-white/[0.05] transition-colors ${sim.status === 'COMPLETED' ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20' : 'bg-zinc-900'}`}>
                                                {sim.status === 'COMPLETED' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> :
                                                    sim.status === 'RUNNING' ? <Clock className="h-5 w-5 text-primary animate-spin" /> :
                                                        <XCircle className="h-5 w-5 text-destructive" />
                                                }
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-white line-clamp-1">{sim.task}</p>
                                                <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                                    <span className="flex items-center gap-1.5"><UserCircle2 className="h-3 w-3" /> {sim.persona?.name}</span>
                                                    <span className="h-1 w-1 rounded-full bg-zinc-800" />
                                                    <span>{new Date(sim.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" className="rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.05] text-xs font-mono uppercase tracking-widest h-10 px-4">View Report</Button>
                                    </div>
                                ))}
                                {simulations.length === 0 && <p className="text-sm text-center text-zinc-600 py-10 font-mono tracking-widest">NO LOGS AVAILABLE</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
