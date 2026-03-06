const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function fetcher(url: string, options: RequestInit = {}) {
    const res = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'An error occurred' }));
        throw new Error(error.error || 'Failed to fetch');
    }

    return res.json();
}

export const api = {
    projects: {
        list: (options?: RequestInit) => fetcher('/projects', options),
        get: (id: string, options?: RequestInit) => fetcher(`/projects/${id}`, options),
        create: (data: any, options?: RequestInit) => fetcher('/projects', { ...options, method: 'POST', body: JSON.stringify(data) }),
        getSimulations: (id: string, options?: RequestInit) => fetcher(`/projects/${id}/simulations`, options),
    },
    simulations: {
        start: (data: any, options?: RequestInit) => fetcher('/simulations/start', { ...options, method: 'POST', body: JSON.stringify(data) }),
        getSteps: (id: string, options?: RequestInit) => fetcher(`/simulations/${id}/steps`, options),
    },
    personas: {
        list: (projectId: string, options?: RequestInit) => fetcher(`/projects/${projectId}/personas`, options),
    }
};
