"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { api, authOptions, type Persona, type Project } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PersonasPage() {
    const { getToken } = useAuth();
    const { organization } = useOrganization();
    const [projects, setProjects] = useState<Project[]>([]);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [projectId, setProjectId] = useState("");
    const [editingId, setEditingId] = useState("");
    const [name, setName] = useState("");
    const [traits, setTraits] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [personaCursors, setPersonaCursors] = useState<Record<string, string | null>>({});
    const [totalPersonas, setTotalPersonas] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        const options = authOptions(await getToken());
        const ownedProjects = (await api.projects.list(options, undefined, 100)).items;
        const profiles = await Promise.all(ownedProjects.map(project => api.personas.list(project.id, options)));
        setProjects(ownedProjects);
        setPersonas(profiles.flatMap(page => page.items));
        setPersonaCursors(Object.fromEntries(ownedProjects.map((project, index) => [project.id, profiles[index].nextCursor])));
        setTotalPersonas(profiles.reduce((total, page) => total + page.totalCount, 0));
        setProjectId(current => ownedProjects.some(project => project.id === current) ? current : ownedProjects[0]?.id || "");
    }, [getToken]);

    useEffect(() => {
        void load()
            .catch(loadError => setError(loadError instanceof Error ? loadError.message : "Unable to load personas."))
            .finally(() => setLoading(false));
    }, [load, organization?.id]);

    const loadMore = async () => {
        setLoadingMore(true);
        setError("");
        try {
            const options = authOptions(await getToken());
            const pages = await Promise.all(projects.flatMap(project => {
                const cursor = personaCursors[project.id];
                return cursor ? [api.personas.list(project.id, options, cursor)] : [];
            }));
            setPersonas(current => [...current, ...pages.flatMap(page => page.items)]);
            setPersonaCursors(current => {
                const updated = { ...current };
                let pageIndex = 0;
                for (const project of projects) {
                    if (current[project.id]) updated[project.id] = pages[pageIndex++]?.nextCursor || null;
                }
                return updated;
            });
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load more personas.");
        } finally {
            setLoadingMore(false);
        }
    };

    const resetForm = () => {
        setEditingId("");
        setName("");
        setTraits("");
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!projectId) return;
        setSaving(true);
        setError("");
        try {
            const options = authOptions(await getToken());
            if (editingId) {
                await api.personas.update(editingId, { name, traits }, options);
            } else {
                await api.personas.create(projectId, { name, traits }, options);
            }
            await load();
            resetForm();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Unable to save persona.");
        } finally {
            setSaving(false);
        }
    };

    const edit = (persona: Persona) => {
        setEditingId(persona.id);
        setProjectId(persona.projectId);
        setName(persona.name);
        setTraits(persona.traits);
    };

    const remove = async (persona: Persona) => {
        setError("");
        try {
            await api.personas.delete(persona.id, authOptions(await getToken()));
            await load();
            if (editingId === persona.id) resetForm();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Unable to delete persona.");
        }
    };

    return (
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.2fr]">
            <section className="space-y-6">
                <header>
                    <h1 className="text-4xl font-bold tracking-tight text-white">Persona Library</h1>
                    <p className="mt-2 text-sm text-zinc-400">Create and tune the profiles used in your project simulations.</p>
                </header>
                {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
                <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <h2 className="text-lg font-semibold text-white">{editingId ? "Edit persona" : "Create persona"}</h2>
                    <div className="space-y-2">
                        <Label htmlFor="persona-project">Project</Label>
                        <select
                            id="persona-project"
                            value={projectId}
                            onChange={event => setProjectId(event.target.value)}
                            disabled={Boolean(editingId)}
                            required
                            className="h-10 w-full rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-white"
                        >
                            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="persona-name">Name</Label>
                        <Input id="persona-name" value={name} onChange={event => setName(event.target.value)} required maxLength={120} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="persona-traits">Behavioral traits</Label>
                        <Textarea id="persona-traits" value={traits} onChange={event => setTraits(event.target.value)} required maxLength={4000} rows={5} />
                    </div>
                    <div className="flex gap-3">
                        <Button type="submit" disabled={saving || loading || !projectId}>{saving ? "Saving…" : editingId ? "Save changes" : "Add persona"}</Button>
                        {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}
                    </div>
                    {!projects.length && !loading && <p className="text-sm text-zinc-500">Create a project before adding personas.</p>}
                </form>
            </section>
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Saved personas · {personas.length} of {totalPersonas}</h2>
                {loading ? <p className="text-sm text-zinc-500">Loading personas…</p> : personas.map(persona => (
                    <article key={persona.id} className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <div>
                            <p className="font-medium text-white">{persona.name}</p>
                            <p className="mt-1 text-xs text-primary">{projects.find(project => project.id === persona.projectId)?.name}</p>
                            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-400">{persona.traits}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" onClick={() => edit(persona)}>Edit</Button>
                            <Button variant="ghost" size="sm" onClick={() => void remove(persona)}>Delete</Button>
                        </div>
                    </article>
                ))}
                {!loading && personas.length === 0 && <p className="rounded-xl border border-white/10 p-6 text-sm text-zinc-500">Your projects’ default personas will appear here.</p>}
                {!loading && Object.values(personaCursors).some(Boolean) && (
                    <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
                        {loadingMore ? "Loading…" : "Load more personas"}
                    </Button>
                )}
            </section>
        </div>
    );
}
