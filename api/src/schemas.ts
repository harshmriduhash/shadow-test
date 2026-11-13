import { z } from 'zod';

export const projectCreateSchema = z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(5000),
    productUrl: z.string().trim().url().refine(value => {
        try {
            return new URL(value).protocol === 'https:';
        } catch {
            return false;
        }
    }, 'Must use HTTPS').optional().or(z.literal('')),
    repoUrl: z.string().trim().url().refine(value => {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname.split('/').filter(Boolean).length >= 2;
        } catch {
            return false;
        }
    }, 'Must be a GitHub repository URL').optional().or(z.literal(''))
});

export const projectUpdateSchema = projectCreateSchema.partial().refine(value => Object.keys(value).length > 0);

export const personaCreateSchema = z.object({
    name: z.string().trim().min(1).max(120),
    traits: z.string().trim().min(1).max(4000),
    behaviorModel: z.string().trim().min(1).max(120).default('claude-sonnet'),
    technicalKnowledge: z.number().int().min(1).max(5).default(3),
    patience: z.number().int().min(1).max(5).default(3),
    decisionSpeed: z.number().int().min(1).max(5).default(3),
    riskTolerance: z.number().int().min(1).max(5).default(3),
    attentionToDetail: z.number().int().min(1).max(5).default(3)
});

export const personaUpdateSchema = personaCreateSchema.partial().refine(value => Object.keys(value).length > 0);

export const simulationStartSchema = z.object({
    projectId: z.string().trim().min(1),
    personaId: z.string().trim().min(1),
    task: z.string().trim().min(1).max(2000)
});

export const simulationStatusSchema = z.object({
    status: z.enum(['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])
});

export const simulationReportSchema = z.object({
    summary: z.string().trim().min(1).max(5000),
    insights: z.array(z.string().trim().min(1).max(1000)).max(25),
    success: z.boolean(),
    events: z.array(z.object({
        step_number: z.number().int().positive(),
        type: z.enum(['SUCCESS', 'FRICTION', 'CONFUSION', 'ABANDONMENT']),
        severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
        description: z.string().trim().min(1).max(1000),
        evidence: z.string().trim().max(2000).optional()
    })).max(50).default([])
});

export const simulationStepSchema = z.object({
    step_number: z.number().int().positive(),
    observation: z.string().max(8000).optional(),
    interpretation: z.string().max(8000).optional(),
    decision: z.string().max(8000).optional(),
    action: z.string().max(8000).optional(),
    outcome: z.string().max(8000).optional()
}).refine(value => Object.keys(value).some(key => key !== 'step_number'));

export const documentUploadSchema = z.object({
    fileName: z.string().trim().min(1).max(255),
    contentType: z.enum(['application/pdf', 'text/markdown', 'text/plain']),
    sizeBytes: z.number().int().positive().max(10 * 1024 * 1024)
});

export const documentStatusSchema = z.object({
    status: z.enum(['INDEXING', 'READY', 'FAILED']),
    error: z.string().max(1000).optional()
});

export const documentSearchSchema = z.object({
    query: z.string().trim().min(1).max(2000)
});

export const dashboardSearchSchema = z.object({
    query: z.string().trim().min(2).max(120)
});

export const paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().trim().min(1).optional()
});

export const reportShareCreateSchema = z.object({
    expiresInDays: z.union([z.literal(1), z.literal(7), z.literal(30)]).default(7)
});
