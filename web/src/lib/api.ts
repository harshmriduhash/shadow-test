const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface Persona {
    id: string;
    projectId: string;
    name: string;
    traits: string;
    behaviorModel: string;
    createdAt: string;
}

export interface SimulationStep {
    id: string;
    simulationId: string;
    stepNumber: number;
    observation?: string | null;
    interpretation?: string | null;
    decision?: string | null;
    action?: string | null;
    outcome?: string | null;
}

export interface Simulation {
    id: string;
    projectId: string;
    personaId: string;
    task: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    createdAt: string;
    project?: Pick<Project, 'id' | 'name'>;
    persona?: Persona;
    steps?: SimulationStep[];
    reports?: Array<{ id: string; summary: string | null; insights: string | null }>;
}

export interface Project {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    productUrl: string | null;
    repoUrl: string | null;
    createdAt: string;
    personas?: Persona[];
    _count?: { simulations: number };
}

export interface Report {
    id: string;
    simulationId: string;
    summary: string | null;
    insights: string | null;
    createdAt: string;
    simulation: Simulation & {
        success?: boolean | null;
        project: Pick<Project, 'id' | 'name'>;
        persona: Pick<Persona, 'id' | 'name'>;
    };
}

export interface PlanOverview {
    plan: 'FREE' | 'STARTER' | 'PRO';
    limits: { projects: number | null; simulationsPerMonth: number };
    usage: { projects: number; simulations: number };
    status: string;
    currentPeriodEnd: string | null;
}

export async function fetcher<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');

    const res = await fetch(`${API_URL}${url}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const payload: { error?: string } | null = await res.json().catch(() => null);
        throw new Error(payload?.error || `Request failed (${res.status})`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

export function authOptions(token: string | null): RequestInit {
    if (!token) throw new Error('Your session expired. Please sign in again.');
    return { headers: { Authorization: `Bearer ${token}` } };
}

export const api = {
    projects: {
        list: (options?: RequestInit) => fetcher<Project[]>('/projects', options),
        get: (id: string, options?: RequestInit) => fetcher<Project>(`/projects/${encodeURIComponent(id)}`, options),
        create: (data: Pick<Project, 'name' | 'description' | 'productUrl' | 'repoUrl'>, options?: RequestInit) =>
            fetcher<Project>(`/projects`, { ...options, method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Pick<Project, 'name' | 'description' | 'productUrl' | 'repoUrl'>>, options?: RequestInit) =>
            fetcher<Project>(`/projects/${encodeURIComponent(id)}`, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
        getSimulations: (id: string, options?: RequestInit) =>
            fetcher<Simulation[]>(`/projects/${encodeURIComponent(id)}/simulations`, options),
    },
    simulations: {
        list: (options?: RequestInit) => fetcher<Simulation[]>('/simulations', options),
        start: (data: Pick<Simulation, 'projectId' | 'personaId' | 'task'>, options?: RequestInit) =>
            fetcher<Simulation>('/simulations/start', { ...options, method: 'POST', body: JSON.stringify(data) }),
        retry: (id: string, options?: RequestInit) =>
            fetcher<Simulation>(`/simulations/${encodeURIComponent(id)}/retry`, { ...options, method: 'POST' }),
        getSteps: (id: string, options?: RequestInit) =>
            fetcher<SimulationStep[]>(`/simulations/${encodeURIComponent(id)}/steps`, options),
    },
    personas: {
        list: (projectId: string, options?: RequestInit) =>
            fetcher<Persona[]>(`/projects/${encodeURIComponent(projectId)}/personas`, options),
        create: (projectId: string, data: Pick<Persona, 'name' | 'traits'>, options?: RequestInit) =>
            fetcher<Persona>(`/projects/${encodeURIComponent(projectId)}/personas`, { ...options, method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Pick<Persona, 'name' | 'traits'>>, options?: RequestInit) =>
            fetcher<Persona>(`/personas/${encodeURIComponent(id)}`, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string, options?: RequestInit) =>
            fetcher<void>(`/personas/${encodeURIComponent(id)}`, { ...options, method: 'DELETE' }),
    },
    reports: {
        list: (options?: RequestInit) => fetcher<Report[]>('/reports', options),
        get: (id: string, options?: RequestInit) => fetcher<Report>(`/reports/${encodeURIComponent(id)}`, options),
    },
    billing: {
        subscription: (options?: RequestInit) => fetcher<PlanOverview>('/billing/subscription', options),
        checkout: (plan: 'STARTER' | 'PRO', options?: RequestInit) =>
            fetcher<{ url: string }>('/billing/checkout', { ...options, method: 'POST', body: JSON.stringify({ plan }) }),
    }
};
