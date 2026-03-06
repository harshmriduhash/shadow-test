"use client";
import { useAuth } from "@clerk/nextjs";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FolderGit2, Activity, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function DashboardPage() {
    const { userId } = useAuth();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        api.projects.list({ headers: { 'x-user-id': userId } })
            .then(setProjects)
            .finally(() => setLoading(false));
    }, [userId]);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground mt-1">Manage your applications and run behavior simulations.</p>
                </div>
                <Link href="/dashboard/projects/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Project
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Loading projects...</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Create New Card */}
                    <Card className="flex flex-col justify-center border-dashed border-2 hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer min-h-[220px]">
                        <Link href="/dashboard/projects/new" className="h-full flex flex-col items-center justify-center p-6 text-center">
                            <div className="bg-primary/10 p-3 rounded-full mb-4">
                                <Plus className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold">New Project</h3>
                            <p className="text-sm text-muted-foreground mt-1">Setup a new application to test.</p>
                        </Link>
                    </Card>

                    {projects.map((project) => (
                        <Card key={project.id} className="flex flex-col min-h-[220px]">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl">{project.name}</CardTitle>
                                    <FolderGit2 className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {project.description || "No description provided."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                    <Activity className="h-4 w-4 text-accent" />
                                    <span>{project._count?.simulations || 0} simulations completed</span>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 border-t border-border/50">
                                <Link href={`/dashboard/projects/${project.id}`} className="w-full">
                                    <Button variant="outline" className="w-full">View Details</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
