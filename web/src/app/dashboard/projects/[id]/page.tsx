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
import { ArrowLeft, Play, UserCircle2, CheckCircle2, Clock, XCircle, Activity, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function ProjectDetailsPage() {
    const { userId } = useAuth();
    const { id } = useParams();
    const [project, setProject] = useState<any>(null);
    const [personas, setPersonas] = useState<any[]>([]);
    const [simulations, setSimulations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Launch Form State
    const [selectedPersona, setSelectedPersona] = useState("");
    const [task, setTask] = useState("");
    const [isLaunching, setIsLaunching] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const headers = { 'x-user-id': userId || '' };
            const [projData, simData] = await Promise.all([
                api.projects.get(id as string, { headers }),
                api.projects.getSimulations(id as string, { headers })
            ]);
            setProject(projData);
            setSimulations(simData);

            // Personas are included in project if using Prisma properly, 
            // but let's assume we have a list.
            setPersonas(projData.personas || []);
            if (projData.personas?.length > 0 && !selectedPersona) {
                setSelectedPersona(projData.personas[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch project data:", error);
        } finally {
            setLoading(false);
        }
    }, [id, selectedPersona]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Poll for running simulations
    useEffect(() => {
        const hasRunningSim = simulations.some(s => s.status === "RUNNING");
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
            }, {
                headers: { 'x-user-id': userId || '' }
            });
            setTask("");
            fetchData();
        } catch (error) {
            console.error("Launch failed:", error);
        } finally {
            setIsLaunching(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading project details...</p>
        </div>
    );

    if (!project) return <div>Project not found.</div>;

    const activeSimulation = simulations.find(s => s.status === "RUNNING") || simulations[0];

    return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto">
            <div>
                <Link href="/dashboard" className="text-sm text-muted-foreground flex items-center hover:text-foreground mb-4 w-fit">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back to Projects
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                        <p className="text-muted-foreground mt-1">{project.description}</p>
                    </div>
                    <Button variant="outline">Edit Project</Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column: Simulation Launcher */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Launch Simulation</CardTitle>
                        <CardDescription>Configure and run a new behavioral test.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Select Persona</Label>
                            <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a persona" />
                                </SelectTrigger>
                                <SelectContent>
                                    {personas.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Task Definition</Label>
                            <Textarea
                                placeholder="e.g. Try to create an account and explore features."
                                className="min-h-[120px]"
                                value={task}
                                onChange={(e) => setTask(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full"
                            disabled={isLaunching || !task || !selectedPersona}
                            onClick={handleLaunch}
                        >
                            {isLaunching ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                            Run Simulation
                        </Button>
                    </CardContent>
                </Card>

                {/* Right Column: Live View & Recent Sims */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {activeSimulation && (
                        <Card className={`${activeSimulation.status === 'RUNNING' ? 'border-primary/20 bg-primary/5' : ''}`}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center">
                                        <Activity className={`mr-2 h-5 w-5 text-primary ${activeSimulation.status === 'RUNNING' ? 'animate-pulse' : ''}`} />
                                        {activeSimulation.status === 'RUNNING' ? 'Live Trace' : 'Last Simulation Trace'}
                                    </CardTitle>
                                    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${activeSimulation.status === 'RUNNING' ? 'text-primary bg-primary/20' :
                                        activeSimulation.status === 'COMPLETED' ? 'text-accent bg-accent/20' :
                                            'text-destructive bg-destructive/20'
                                        }`}>
                                        {activeSimulation.status}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 italic">Task: {activeSimulation.task}</p>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 border-l-2 border-primary/30 pl-4 ml-2 py-2">
                                    {activeSimulation.steps?.length > 0 ? (
                                        activeSimulation.steps.sort((a: any, b: any) => a.stepNumber - b.stepNumber).map((step: any) => (
                                            <div key={step.id} className="relative">
                                                <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                                                <div className="grid grid-cols-1 gap-1">
                                                    {step.observation && <div><span className="text-xs font-bold text-muted-foreground uppercase mr-2">Obs:</span> <span className="text-sm">{step.observation}</span></div>}
                                                    {step.interpretation && <div><span className="text-xs font-bold text-muted-foreground uppercase mr-2">Int:</span> <span className="text-sm">{step.interpretation}</span></div>}
                                                    {step.decision && <div><span className="text-xs font-bold text-muted-foreground uppercase mr-2">Dec:</span> <span className="text-sm">{step.decision}</span></div>}
                                                    {step.action && <div><span className="text-xs font-bold text-muted-foreground uppercase mr-2">Act:</span> <span className="text-sm text-primary font-medium">{step.action}</span></div>}
                                                    {step.outcome && <div><span className="text-xs font-bold text-muted-foreground uppercase mr-2">Out:</span> <span className="text-sm italic">{step.outcome}</span></div>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Waiting for steps...</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {simulations.map(sim => (
                                    <div key={sim.id} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            {sim.status === 'COMPLETED' ? <CheckCircle2 className="h-5 w-5 text-accent" /> :
                                                sim.status === 'RUNNING' ? <Clock className="h-5 w-5 text-primary animate-spin" /> :
                                                    <XCircle className="h-5 w-5 text-destructive" />
                                            }
                                            <div>
                                                <p className="text-sm font-medium line-clamp-1">{sim.task}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <UserCircle2 className="h-3 w-3" /> {sim.persona?.name || 'Unknown Persona'} • {new Date(sim.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm">View Report</Button>
                                    </div>
                                ))}
                                {simulations.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No simulation history yet.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
