const API_URL = '/api/proxy';

export interface Persona {
    id: string;
    projectId: string;
    name: string;
    traits: string;
    behaviorModel: string;
    technicalKnowledge: number;
    patience: number;
    decisionSpeed: number;
    riskTolerance: number;
    attentionToDetail: number;
    createdAt: string;
}

export interface SimulationEvent {
    id: string;
    simulationId: string;
    stepNumber: number;
    type: 'SUCCESS' | 'FRICTION' | 'CONFUSION' | 'ABANDONMENT';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    evidence: string | null;
    createdAt: string;
}

export interface DashboardSearchResults {
    projects: Array<{ id: string; name: string; description: string | null; href: string }>;
    personas: Array<{ id: string; name: string; projectId: string; project: { name: string }; href: string }>;
    simulations: Array<{ id: string; task: string; projectId: string; status: string; project: { name: string }; href: string }>;
    reports: Array<{ id: string; summary: string | null; simulation: { projectId: string; project: { name: string } }; href: string }>;
}

export interface WorkspaceAccess {
    organizationId: string | null;
    role: string;
    capabilities: {
        viewProjects: boolean;
        runSimulations: boolean;
        manageProjectsAndPersonas: boolean;
        manageDocuments: boolean;
    };
}

export interface CursorPage<T> {
    items: T[];
    totalCount: number;
    nextCursor: string | null;
    hasMore: boolean;
}

function pageQuery(cursor?: string, limit = 20) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return `?${params.toString()}`;
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
    events?: SimulationEvent[];
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
        events?: SimulationEvent[];
    };
}

export interface ProjectDocument {
    id: string;
    projectId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    status: 'UPLOADING' | 'INDEXING' | 'READY' | 'FAILED';
    error: string | null;
    createdAt: string;
}

export interface DocumentSearchResult {
    document_id: string;
    file_name: string;
    text: string;
    score: number;
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
    search: (query: string, options?: RequestInit) =>
        fetcher<DashboardSearchResults>(`/search?query=${encodeURIComponent(query)}`, options),
    workspace: {
        access: (options?: RequestInit) => fetcher<WorkspaceAccess>('/workspace/access', options)
    },
    projects: {
        list: (options?: RequestInit, cursor?: string, limit?: number) => fetcher<CursorPage<Project>>(`/projects${pageQuery(cursor, limit)}`, options),
        get: (id: string, options?: RequestInit) => fetcher<Project>(`/projects/${encodeURIComponent(id)}`, options),
        create: (data: Pick<Project, 'name' | 'description' | 'productUrl' | 'repoUrl'>, options?: RequestInit) =>
            fetcher<Project>(`/projects`, { ...options, method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Pick<Project, 'name' | 'description' | 'productUrl' | 'repoUrl'>>, options?: RequestInit) =>
            fetcher<Project>(`/projects/${encodeURIComponent(id)}`, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
        getSimulations: (id: string, options?: RequestInit, cursor?: string) =>
            fetcher<CursorPage<Simulation>>(`/projects/${encodeURIComponent(id)}/simulations${pageQuery(cursor)}`, options),
    },
    simulations: {
        list: (options?: RequestInit, cursor?: string) => fetcher<CursorPage<Simulation>>(`/simulations${pageQuery(cursor)}`, options),
        start: (data: Pick<Simulation, 'projectId' | 'personaId' | 'task'>, options?: RequestInit) =>
            fetcher<Simulation>('/simulations/start', { ...options, method: 'POST', body: JSON.stringify(data) }),
        retry: (id: string, options?: RequestInit) =>
            fetcher<Simulation>(`/simulations/${encodeURIComponent(id)}/retry`, { ...options, method: 'POST' }),
        getSteps: (id: string, options?: RequestInit) =>
            fetcher<SimulationStep[]>(`/simulations/${encodeURIComponent(id)}/steps`, options),
    },
    personas: {
        list: (projectId: string, options?: RequestInit, cursor?: string) =>
            fetcher<CursorPage<Persona>>(`/projects/${encodeURIComponent(projectId)}/personas${pageQuery(cursor)}`, options),
        create: (projectId: string, data: Pick<Persona, 'name' | 'traits' | 'technicalKnowledge' | 'patience' | 'decisionSpeed' | 'riskTolerance' | 'attentionToDetail'>, options?: RequestInit) =>
            fetcher<Persona>(`/projects/${encodeURIComponent(projectId)}/personas`, { ...options, method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Pick<Persona, 'name' | 'traits' | 'technicalKnowledge' | 'patience' | 'decisionSpeed' | 'riskTolerance' | 'attentionToDetail'>>, options?: RequestInit) =>
            fetcher<Persona>(`/personas/${encodeURIComponent(id)}`, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string, options?: RequestInit) =>
            fetcher<void>(`/personas/${encodeURIComponent(id)}`, { ...options, method: 'DELETE' }),
    },
    documents: {
        list: (projectId: string, options?: RequestInit, cursor?: string) =>
            fetcher<CursorPage<ProjectDocument>>(`/projects/${encodeURIComponent(projectId)}/documents${pageQuery(cursor)}`, options),
        search: (projectId: string, query: string, options?: RequestInit) =>
            fetcher<{ results: DocumentSearchResult[] }>(
                `/projects/${encodeURIComponent(projectId)}/documents/search`,
                { ...options, method: 'POST', body: JSON.stringify({ query }) }
            ),
        createUpload: (projectId: string, data: Pick<ProjectDocument, 'fileName' | 'contentType' | 'sizeBytes'>, options?: RequestInit) =>
            fetcher<{ document: ProjectDocument; upload: { url: string; fields: Record<string, string> } }>(
                `/projects/${encodeURIComponent(projectId)}/documents`,
                { ...options, method: 'POST', body: JSON.stringify(data) }
            ),
        completeUpload: (projectId: string, documentId: string, options?: RequestInit) =>
            fetcher<{ id: string; status: ProjectDocument['status'] }>(
                `/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}/complete`,
                { ...options, method: 'POST', body: JSON.stringify({}) }
            ),
        download: async (id: string, options?: RequestInit) => {
            const result = await fetcher<{ url: string }>(`/documents/${encodeURIComponent(id)}/download`, options);
            return result.url;
        },
        delete: (id: string, options?: RequestInit) =>
            fetcher<void>(`/documents/${encodeURIComponent(id)}`, { ...options, method: 'DELETE' }),
    },
    reports: {
        list: (options?: RequestInit, cursor?: string) => fetcher<CursorPage<Report>>(`/reports${pageQuery(cursor)}`, options),
        get: (id: string, options?: RequestInit) => fetcher<Report>(`/reports/${encodeURIComponent(id)}`, options),
    },
    billing: {
        subscription: (options?: RequestInit) => fetcher<PlanOverview>('/billing/subscription', options),
        checkout: (plan: 'STARTER' | 'PRO', options?: RequestInit) =>
            fetcher<{ url: string }>('/billing/checkout', { ...options, method: 'POST', body: JSON.stringify({ plan }) }),
    }
};
