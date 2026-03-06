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
import { ArrowLeft, Rocket, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

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
            alert("Failed to create project. Please check if the API is running.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
            <div>
                <Link href="/dashboard" className="text-sm text-muted-foreground flex items-center hover:text-foreground mb-4 w-fit">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back to Projects
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
                <p className="text-muted-foreground mt-1">Setup the application environment for AI behavioral testing.</p>
            </div>

            <Card>
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                        <CardDescription>Provide context for the synthetic users to understand your product.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Acme CRM"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Product Description <span className="text-destructive">*</span></Label>
                                <Textarea
                                    id="description"
                                    placeholder="Explain what your product does..."
                                    className="min-h-[100px]"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="productUrl">Product URL (Optional)</Label>
                                <Input
                                    id="productUrl"
                                    type="url"
                                    placeholder="https://acme.com/app"
                                    value={formData.productUrl}
                                    onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="repoUrl">GitHub Repository (Optional)</Label>
                                <Input
                                    id="repoUrl"
                                    type="url"
                                    placeholder="https://github.com/acme/crm"
                                    value={formData.repoUrl}
                                    onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-border/50 pt-6">
                        <Link href="/dashboard">
                            <Button variant="outline" type="button">Cancel</Button>
                        </Link>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                            Create Project
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
