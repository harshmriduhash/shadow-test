import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Prisma, PrismaClient } from '@prisma/client';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { requireInternalAuth, requireSession } from './security';
import { canManageTenantProject, canRunTenantSimulation, ensureWorkspace, getWorkspaceId, projectScopeWhere as tenantProjectScopeWhere } from './tenant';
import { dashboardSearchSchema, documentSearchSchema, documentStatusSchema, documentUploadSchema, paginationSchema, personaCreateSchema, personaUpdateSchema, projectCreateSchema, projectUpdateSchema, reportShareCreateSchema, simulationReportSchema, simulationStartSchema, simulationStatusSchema, simulationStepSchema } from './schemas';
import { createSimulationWithinQuota, getPlanUsage, releaseSimulationUsage } from './plans';
import { enqueueSimulation, getSimulationQueue } from './simulation-queue';
import { createProgressTicket, publishSimulationProgress } from './simulation-progress';
import { tenantRateLimit, unauthenticatedIpRateLimit } from './tenant-rate-limit';
import { cursorArgs, cursorPage } from './pagination';
import { createReportShareToken, hashReportShareToken, isReportShareToken, reportShareExpiry } from './report-sharing';

const prisma = new PrismaClient();
const router = Router();
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_ACTIVE_REPORT_SHARES = 10;
let s3Client: S3Client | undefined;

function getS3Config() {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new SimulationServiceError('S3 document storage is not configured', 503);
    }
    return {
        bucket,
        client: s3Client ??= new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {})
        })
    };
}

function sanitizedFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '').slice(0, 180) || 'document';
}

class SimulationServiceError extends Error {
    constructor(message: string, readonly statusCode: number) {
        super(message);
    }
}

function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
}

function invalid(res: Response, message: string, issues: unknown) {
    return res.status(400).json({ error: message, details: issues });
}

function routeParam(req: Request, name: string) {
    const value = req.params[name];
    if (typeof value !== 'string') throw new Error(`Missing route parameter: ${name}`);
    return value;
}

async function ensureUser(req: Request) {
    if (!req.auth) throw new Error('Authenticated user context is missing');
    const workspace = await ensureWorkspace(prisma, req.auth);
    return workspace.userId;
}

function projectScopeWhere(req: Request): Prisma.ProjectWhereInput {
    if (!req.auth) throw new Error('Authenticated user context is missing');
    return tenantProjectScopeWhere(getWorkspaceId(req.auth));
}

function canManageProject(
    req: Request,
    project: { userId: string; organizationId: string }
) {
    if (!req.auth) return false;
    return canManageTenantProject(req.auth, project);
}

async function dispatchSimulation(
    simulationId: string,
    project: { id: string; productUrl: string | null; repoUrl: string | null; description: string | null },
    persona: {
        id: string;
        traits: string;
        technicalKnowledge: number;
        patience: number;
        decisionSpeed: number;
        riskTolerance: number;
        attentionToDetail: number;
    },
    task: string
) {
    const internalApiKey = process.env.INTERNAL_API_KEY;
    if (!internalApiKey) throw new SimulationServiceError('Simulation service is not configured', 503);

    const response = await fetch(`${AI_ENGINE_URL}/simulate/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Api-Key': internalApiKey },
        body: JSON.stringify({
            project_id: project.id,
            project_description: project.description,
            persona_id: persona.id,
            task,
            simulation_id: simulationId,
            product_url: project.productUrl,
            repo_url: project.repoUrl,
            persona_traits: persona.traits,
            persona_profile: {
                technical_knowledge: persona.technicalKnowledge,
                patience: persona.patience,
                decision_speed: persona.decisionSpeed,
                risk_tolerance: persona.riskTolerance,
                attention_to_detail: persona.attentionToDetail
            }
        }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new SimulationServiceError('Simulation service rejected the request', 502);
    const simulation = await prisma.simulation.findUnique({ where: { id: simulationId } });
    if (!simulation) throw new SimulationServiceError('Simulation record was not found', 500);
    return simulation;
}

async function enqueueSimulationRun(
    simulation: { id: string; createdAt: Date },
    organizationId: string,
    project: { id: string; productUrl: string | null; repoUrl: string | null; description: string | null },
    persona: {
        id: string;
        traits: string;
        technicalKnowledge: number;
        patience: number;
        decisionSpeed: number;
        riskTolerance: number;
        attentionToDetail: number;
    },
    task: string
) {
    if (!process.env.REDIS_URL) {
        if (process.env.NODE_ENV === 'production') {
            throw new SimulationServiceError('The durable simulation queue is not configured', 503);
        }
        return dispatchSimulation(simulation.id, project, persona, task);
    }

    await enqueueSimulation({
        simulationId: simulation.id,
        organizationId,
        periodStart: new Date(Date.UTC(
            simulation.createdAt.getUTCFullYear(),
            simulation.createdAt.getUTCMonth(),
            1
        )).toISOString(),
        request: {
            project_id: project.id,
            project_description: project.description,
            persona_id: persona.id,
            task,
            simulation_id: simulation.id,
            product_url: project.productUrl,
            repo_url: project.repoUrl,
            persona_traits: persona.traits,
            persona_profile: {
                technical_knowledge: persona.technicalKnowledge,
                patience: persona.patience,
                decision_speed: persona.decisionSpeed,
                risk_tolerance: persona.riskTolerance,
                attention_to_detail: persona.attentionToDetail
            }
        }
    });
    return simulation;
}

async function validateProjectSources(productUrl?: string, repoUrl?: string) {
    if (productUrl) {
        const internalApiKey = process.env.INTERNAL_API_KEY;
        if (!internalApiKey) throw new SimulationServiceError('Product URL validation is not configured', 503);
        let response: globalThis.Response;
        try {
            response = await fetch(`${AI_ENGINE_URL}/validate/product-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Internal-Api-Key': internalApiKey },
                body: JSON.stringify({ url: productUrl }),
                signal: AbortSignal.timeout(15000)
            });
        } catch (error) {
            console.error('Unable to validate product URL:', error);
            throw new SimulationServiceError('Product URL validation is temporarily unavailable.', 503);
        }
        if (!response.ok) throw new SimulationServiceError('Unable to reach the product URL.', 422);
    }

    if (repoUrl) {
        const repository = new URL(repoUrl);
        const [owner, name] = repository.pathname.split('/').filter(Boolean);
        if (!owner || !name) throw new SimulationServiceError('Unable to access the GitHub repository.', 422);

        const headers = {
            Accept: 'application/vnd.github.raw+json',
            'User-Agent': 'ShadowTest/1.0',
            ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
        };
        let response: globalThis.Response;
        try {
            response = await fetch(
                `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name.replace(/\.git$/, ''))}/readme`,
                { headers, signal: AbortSignal.timeout(15000) }
            );
        } catch (error) {
            console.error('Unable to validate GitHub repository:', error);
            throw new SimulationServiceError('GitHub repository validation is temporarily unavailable.', 503);
        }
        if (!response.ok) throw new SimulationServiceError('Unable to access the GitHub repository.', 422);
    }
}

router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'ShadowTest API' });
});

router.patch('/simulations/:id', requireInternalAuth, asyncHandler(async (req, res) => {
    const parsed = simulationStatusSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid simulation status', parsed.error.issues);

    const simulationId = routeParam(req, 'id');
    let simulation;
    if (parsed.data.status === 'FAILED' || parsed.data.status === 'CANCELLED') {
        const owner = await prisma.simulation.findUnique({
            where: { id: simulationId },
            select: { createdAt: true, project: { select: { organizationId: true } } }
        });
        if (!owner) return res.status(404).json({ error: 'Simulation not found' });
        const periodStart = new Date(Date.UTC(
            owner.createdAt.getUTCFullYear(),
            owner.createdAt.getUTCMonth(),
            1
        ));
        await releaseSimulationUsage(
            prisma,
            simulationId,
            owner.project.organizationId,
            periodStart,
            parsed.data.status
        );
        simulation = await prisma.simulation.findUniqueOrThrow({ where: { id: simulationId } });
    } else {
        const allowedPreviousStatuses = parsed.data.status === 'RUNNING' ? ['PENDING', 'RUNNING'] : ['RUNNING'];
        const transition = await prisma.simulation.updateMany({
            where: { id: simulationId, status: { in: allowedPreviousStatuses } },
            data: { status: parsed.data.status }
        });
        if (transition.count === 0) {
            const existing = await prisma.simulation.findUnique({ where: { id: simulationId } });
            if (!existing) return res.status(404).json({ error: 'Simulation not found' });
            if (existing.status !== parsed.data.status) {
                return res.status(409).json({ error: `Cannot transition simulation from ${existing.status} to ${parsed.data.status}.` });
            }
        }
        simulation = await prisma.simulation.findUniqueOrThrow({ where: { id: simulationId } });
    }
    await publishSimulationProgress(simulationId, { type: 'simulation.status', status: simulation.status });
    res.json(simulation);
}));

router.patch('/documents/:id/status', requireInternalAuth, asyncHandler(async (req, res) => {
    const parsed = documentStatusSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid document status', parsed.error.issues);
    const document = await prisma.projectDocument.update({
        where: { id: routeParam(req, 'id') },
        data: { status: parsed.data.status, error: parsed.data.error || null }
    });
    res.json(document);
}));

router.post('/simulations/:id/steps', requireInternalAuth, asyncHandler(async (req, res) => {
    const parsed = simulationStepSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid simulation step', parsed.error.issues);

    const { step_number: stepNumber, ...step } = parsed.data;
    const savedStep = await prisma.simulationStep.create({
        data: { simulationId: routeParam(req, 'id'), stepNumber, ...step }
    });
    await publishSimulationProgress(savedStep.simulationId, { type: 'simulation.step', step: savedStep });
    res.status(201).json(savedStep);
}));

router.post('/simulations/:id/report', requireInternalAuth, asyncHandler(async (req, res) => {
    const parsed = simulationReportSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid simulation report', parsed.error.issues);

    const simulationId = routeParam(req, 'id');
    const simulation = await prisma.simulation.findUnique({ where: { id: simulationId }, select: { id: true } });
    if (!simulation) return res.status(404).json({ error: 'Simulation not found' });

    const report = await prisma.$transaction(async transaction => {
        const [steps, existingEvents] = await Promise.all([
            transaction.simulationStep.findMany({ where: { simulationId }, select: { stepNumber: true } }),
            transaction.simulationEvent.count({ where: { simulationId } })
        ]);
        const stepNumbers = new Set(steps.map(step => step.stepNumber));
        if (parsed.data.events.some(event => !stepNumbers.has(event.step_number))) {
            return null;
        }
        const createdReport = await transaction.report.create({
            data: {
                simulationId,
                summary: parsed.data.summary,
                insights: JSON.stringify(parsed.data.insights)
            }
        });
        if (existingEvents === 0 && parsed.data.events.length > 0) {
            await transaction.simulationEvent.createMany({
                data: parsed.data.events.map(event => ({
                    simulationId,
                    stepNumber: event.step_number,
                    type: event.type,
                    severity: event.severity,
                    description: event.description,
                    evidence: event.evidence
                }))
            });
        }
        await transaction.simulation.update({
            where: { id: simulationId },
            data: { success: parsed.data.success }
        });
        return createdReport;
    });
    if (!report) return invalid(res, 'Simulation events must refer to persisted steps', []);
    res.status(201).json(report);
}));

router.post('/public/reports', unauthenticatedIpRateLimit, asyncHandler(async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    if (!isReportShareToken(token)) return res.status(404).json({ error: 'Shared report not found or expired' });

    const share = await prisma.reportShare.findFirst({
        where: {
            tokenHash: hashReportShareToken(token),
            revokedAt: null,
            expiresAt: { gt: new Date() }
        },
        select: {
            report: {
                include: {
                    simulation: {
                        include: {
                            project: { select: { name: true } },
                            persona: { select: { name: true } },
                            steps: { orderBy: { stepNumber: 'asc' } },
                            events: { orderBy: [{ stepNumber: 'asc' }, { createdAt: 'asc' }] }
                        }
                    }
                }
            }
        }
    });
    if (!share) return res.status(404).json({ error: 'Shared report not found or expired' });
    res.json(share.report);
}));

router.use(requireSession);
router.use(tenantRateLimit);

router.get('/search', asyncHandler(async (req, res) => {
    const parsed = dashboardSearchSchema.safeParse(req.query);
    if (!parsed.success) return invalid(res, 'Enter at least two characters to search', parsed.error.issues);
    await ensureUser(req);
    const query = parsed.data.query;
    const projectScope = projectScopeWhere(req);
    const simulationScope = { project: projectScope };
    const reportScope = { simulation: simulationScope };
    const [projects, personas, simulations, reports] = await Promise.all([
        prisma.project.findMany({
            where: {
                AND: [
                    projectScope,
                    { OR: [{ name: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] }
                ]
            },
            select: { id: true, name: true, description: true },
            take: 5,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.persona.findMany({
            where: { project: projectScope, OR: [{ name: { contains: query, mode: 'insensitive' } }, { traits: { contains: query, mode: 'insensitive' } }] },
            select: { id: true, name: true, projectId: true, project: { select: { name: true } } },
            take: 5,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.simulation.findMany({
            where: { ...simulationScope, task: { contains: query, mode: 'insensitive' } },
            select: { id: true, task: true, projectId: true, status: true, project: { select: { name: true } } },
            take: 5,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.report.findMany({
            where: { ...reportScope, OR: [{ summary: { contains: query, mode: 'insensitive' } }, { insights: { contains: query, mode: 'insensitive' } }] },
            select: { id: true, summary: true, simulation: { select: { projectId: true, project: { select: { name: true } } } } },
            take: 5,
            orderBy: { createdAt: 'desc' }
        })
    ]);
    res.json({
        projects: projects.map(item => ({ ...item, href: `/dashboard/projects/${encodeURIComponent(item.id)}` })),
        personas: personas.map(item => ({ ...item, href: '/dashboard/personas' })),
        simulations: simulations.map(item => ({ ...item, href: `/dashboard/projects/${encodeURIComponent(item.projectId)}` })),
        reports: reports.map(item => ({ ...item, href: `/dashboard/reports/${encodeURIComponent(item.id)}` }))
    });
}));

router.get('/workspace/access', asyncHandler(async (req, res) => {
    await ensureUser(req);
    if (!req.auth) throw new Error('Authenticated user context is missing');
    const organizationId = getWorkspaceId(req.auth);
    const isPersonal = !req.auth.organizationId;
    const canManage = isPersonal
        || req.auth?.organizationRole === 'org:admin'
        || req.auth?.organizationRole === 'org:owner';
    const role = isPersonal ? 'org:owner' : req.auth?.organizationRole || 'org:member';
    res.json({
        organizationId,
        role,
        capabilities: {
            viewProjects: true,
            runSimulations: canRunTenantSimulation(req.auth),
            manageProjectsAndPersonas: canManage,
            manageDocuments: canManage
        }
    });
}));

router.get('/projects/:projectId/documents', asyncHandler(async (req, res) => {
    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) return invalid(res, 'Invalid pagination parameters', pagination.error.issues);
    const project = await prisma.project.findFirst({
        where: { id: routeParam(req, 'projectId'), ...projectScopeWhere(req) },
        select: { id: true }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const where = { projectId: project.id };
    const [documents, totalCount] = await Promise.all([prisma.projectDocument.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pagination.data.limit + 1,
        ...cursorArgs(pagination.data.cursor),
        select: { id: true, projectId: true, fileName: true, contentType: true, sizeBytes: true, status: true, error: true, createdAt: true }
    }), prisma.projectDocument.count({ where })]);
    res.json(cursorPage(documents, pagination.data.limit, totalCount));
}));

router.post('/projects/:projectId/documents/search', asyncHandler(async (req, res) => {
    const parsed = documentSearchSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid document search query', parsed.error.issues);
    const project = await prisma.project.findFirst({
        where: { id: routeParam(req, 'projectId'), ...projectScopeWhere(req) },
        select: { id: true }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const internalApiKey = process.env.INTERNAL_API_KEY;
    if (!internalApiKey) return res.status(503).json({ error: 'Document search is not configured.' });

    let response: globalThis.Response;
    try {
        response = await fetch(`${AI_ENGINE_URL}/documents/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Internal-Api-Key': internalApiKey },
            body: JSON.stringify({ project_id: project.id, query: parsed.data.query }),
            signal: AbortSignal.timeout(15_000)
        });
    } catch (error) {
        console.error(`Unable to search project documents for ${project.id}:`, error);
        return res.status(503).json({ error: 'Document search is temporarily unavailable.' });
    }
    if (!response.ok) return res.status(503).json({ error: 'Document search is temporarily unavailable.' });
    res.json(await response.json());
}));

router.post('/projects/:projectId/documents', asyncHandler(async (req, res) => {
    const parsed = documentUploadSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid document upload details', parsed.error.issues);
    const project = await prisma.project.findFirst({
        where: { id: routeParam(req, 'projectId'), ...projectScopeWhere(req) },
        select: { id: true, userId: true, organizationId: true }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageProject(req, project)) return res.status(403).json({ error: 'Only project owners and organization admins can upload project documents.' });

    let storage: ReturnType<typeof getS3Config>;
    try {
        storage = getS3Config();
    } catch (error) {
        if (error instanceof SimulationServiceError) return res.status(error.statusCode).json({ error: error.message });
        throw error;
    }

    const fileName = sanitizedFileName(parsed.data.fileName);
    const storageKey = `${project.organizationId || project.userId}/${project.id}/${randomUUID()}/${fileName}`;
    const document = await prisma.projectDocument.create({
        data: {
            projectId: project.id,
            fileName,
            contentType: parsed.data.contentType,
            sizeBytes: parsed.data.sizeBytes,
            storageKey
        }
    });
    try {
        const upload = await createPresignedPost(
            storage.client,
            {
                Bucket: storage.bucket,
                Key: storageKey,
                Fields: { 'Content-Type': document.contentType },
                Conditions: [
                    ['content-length-range', document.sizeBytes, document.sizeBytes],
                    ['eq', '$Content-Type', document.contentType]
                ],
                Expires: 300
            }
        );
        res.status(201).json({
            document: {
                id: document.id,
                projectId: document.projectId,
                fileName: document.fileName,
                contentType: document.contentType,
                sizeBytes: document.sizeBytes,
                status: document.status,
                createdAt: document.createdAt
            },
            upload
        });
    } catch (error) {
        await prisma.projectDocument.delete({ where: { id: document.id } });
        throw error;
    }
}));

router.post('/projects/:projectId/documents/:documentId/complete', asyncHandler(async (req, res) => {
    const document = await prisma.projectDocument.findFirst({
        where: {
            id: routeParam(req, 'documentId'),
            projectId: routeParam(req, 'projectId'),
            project: projectScopeWhere(req)
        },
        include: { project: { select: { userId: true, organizationId: true } } }
    });
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!canManageProject(req, document.project)) return res.status(403).json({ error: 'Only project owners and organization admins can complete document uploads.' });
    if (document.status !== 'UPLOADING') return res.status(409).json({ error: 'Document upload has already been completed' });

    const storage = getS3Config();
    let head;
    try {
        head = await storage.client.send(new HeadObjectCommand({ Bucket: storage.bucket, Key: document.storageKey }));
    } catch (error) {
        console.error(`Unable to verify uploaded document ${document.id}:`, error);
        return res.status(422).json({ error: 'Uploaded document could not be verified in S3.' });
    }
    if (head.ContentLength !== document.sizeBytes || head.ContentLength > MAX_DOCUMENT_BYTES) {
        return res.status(422).json({ error: 'Uploaded document size did not match the requested size.' });
    }

    const internalApiKey = process.env.INTERNAL_API_KEY;
    if (!internalApiKey) return res.status(503).json({ error: 'Document indexing is not configured.' });
    const updated = await prisma.projectDocument.update({
        where: { id: document.id },
        data: { status: 'INDEXING', error: null }
    });
    try {
        const response = await fetch(`${AI_ENGINE_URL}/documents/index`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Internal-Api-Key': internalApiKey },
            body: JSON.stringify({
                document_id: document.id,
                project_id: document.projectId,
                storage_key: document.storageKey,
                content_type: document.contentType,
                file_name: document.fileName
            }),
            signal: AbortSignal.timeout(10_000)
        });
        if (!response.ok) throw new Error(`Index service returned ${response.status}`);
    } catch (error) {
        console.error(`Unable to enqueue document ${document.id}:`, error);
        await prisma.projectDocument.update({
            where: { id: document.id },
            data: { status: 'FAILED', error: 'Unable to queue document indexing. Please retry the upload.' }
        });
        return res.status(503).json({ error: 'Document indexing is temporarily unavailable.' });
    }

    res.status(202).json({ id: updated.id, status: updated.status });
}));

router.get('/documents/:id/download', asyncHandler(async (req, res) => {
    const document = await prisma.projectDocument.findFirst({
        where: { id: routeParam(req, 'id'), project: projectScopeWhere(req) }
    });
    if (!document) return res.status(404).json({ error: 'Document not found' });
    const storage = getS3Config();
    const downloadUrl = await getSignedUrl(
        storage.client,
        new GetObjectCommand({
            Bucket: storage.bucket,
            Key: document.storageKey,
            ResponseContentDisposition: `attachment; filename="${document.fileName}"`
        }),
        { expiresIn: 300 }
    );
    res.json({ url: downloadUrl });
}));

router.delete('/documents/:id', asyncHandler(async (req, res) => {
    const document = await prisma.projectDocument.findFirst({
        where: { id: routeParam(req, 'id'), project: projectScopeWhere(req) },
        include: { project: { select: { userId: true, organizationId: true } } }
    });
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!canManageProject(req, document.project)) return res.status(403).json({ error: 'Only project owners and organization admins can delete project documents.' });

    const internalApiKey = process.env.INTERNAL_API_KEY;
    if (!internalApiKey) return res.status(503).json({ error: 'Document search is not configured.' });
    if (document.status !== 'UPLOADING') {
        const response = await fetch(`${AI_ENGINE_URL}/documents/${encodeURIComponent(document.id)}`, {
            method: 'DELETE',
            headers: { 'X-Internal-Api-Key': internalApiKey },
            signal: AbortSignal.timeout(10_000)
        });
        if (!response.ok) return res.status(503).json({ error: 'Unable to remove document search index.' });
    }

    const storage = getS3Config();
    await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: document.storageKey }));
    await prisma.projectDocument.delete({ where: { id: document.id } });
    res.status(204).end();
}));

router.get('/projects', asyncHandler(async (req, res) => {
    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) return invalid(res, 'Invalid pagination parameters', pagination.error.issues);
    await ensureUser(req);
    const where = projectScopeWhere(req);
    const [projects, totalCount] = await Promise.all([prisma.project.findMany({
        where,
        include: { _count: { select: { simulations: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pagination.data.limit + 1,
        ...cursorArgs(pagination.data.cursor)
    }), prisma.project.count({ where })]);
    res.json(cursorPage(projects, pagination.data.limit, totalCount));
}));

router.post('/projects', asyncHandler(async (req, res) => {
    const parsed = projectCreateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid project details', parsed.error.issues);

    try {
        await validateProjectSources(parsed.data.productUrl || undefined, parsed.data.repoUrl || undefined);
    } catch (error) {
        if (error instanceof SimulationServiceError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        throw error;
    }

    const userId = await ensureUser(req);
    if (!req.auth) throw new Error('Authenticated user context is missing');
    if (!canManageProject(req, { userId, organizationId: getWorkspaceId(req.auth) })) {
        return res.status(403).json({ error: 'Only project owners and organization admins can create projects.' });
    }
    const organizationId = getWorkspaceId(req.auth);
    const { productUrl, repoUrl, ...projectData } = parsed.data;
    const creation = await prisma.$transaction(async transaction => {
        await transaction.$queryRaw<Array<{ id: string }>>`
            SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE
        `;
        const planUsage = await getPlanUsage(transaction, organizationId);
        if (!planUsage.canCreateProject) return { planUsage, project: null };
        const project = await transaction.project.create({
            data: {
                ...projectData,
                productUrl: productUrl || null,
                repoUrl: repoUrl || null,
                userId,
                organizationId,
                personas: {
                    create: [
                        { name: 'Impatient Developer', traits: 'Technical, fast, low patience', behaviorModel: 'claude-sonnet' },
                        { name: 'Non-technical Founder', traits: 'Business-focused, unfamiliar with technical jargon', behaviorModel: 'claude-sonnet' },
                        { name: 'Enterprise Buyer', traits: 'Security-conscious, careful decision maker', behaviorModel: 'claude-sonnet' }
                    ]
                }
            },
            include: { personas: true }
        });
        return { planUsage, project };
    });
    if (!creation.project) {
        return res.status(403).json({ error: `Your ${creation.planUsage.plan} plan allows ${creation.planUsage.limits.projects} project. Upgrade to add another.` });
    }
    res.status(201).json(creation.project);
}));

router.get('/projects/:projectId', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const project = await prisma.project.findFirst({
        where: { id: routeParam(req, 'projectId'), ...projectScopeWhere(req) },
        include: { personas: { orderBy: { createdAt: 'asc' } } }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
}));

router.patch('/projects/:projectId', asyncHandler(async (req, res) => {
    const parsed = projectUpdateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid project details', parsed.error.issues);

    const userId = await ensureUser(req);
    const ownedProject = await prisma.project.findFirst({
        where: { id: routeParam(req, 'projectId'), ...projectScopeWhere(req) },
        select: { id: true, userId: true, organizationId: true }
    });
    if (!ownedProject) return res.status(404).json({ error: 'Project not found' });
    if (!canManageProject(req, ownedProject)) return res.status(403).json({ error: 'Only project owners and organization admins can update project settings.' });

    if (parsed.data.productUrl !== undefined || parsed.data.repoUrl !== undefined) {
        try {
            await validateProjectSources(
                parsed.data.productUrl || undefined,
                parsed.data.repoUrl || undefined
            );
        } catch (error) {
            if (error instanceof SimulationServiceError) {
                return res.status(error.statusCode).json({ error: error.message });
            }
            throw error;
        }
    }

    const project = await prisma.project.update({
        where: { id: ownedProject.id },
        data: {
            ...parsed.data,
            productUrl: parsed.data.productUrl === '' ? null : parsed.data.productUrl,
            repoUrl: parsed.data.repoUrl === '' ? null : parsed.data.repoUrl
        },
        include: { personas: true }
    });
    res.json(project);
}));

router.get('/projects/:projectId/personas', asyncHandler(async (req, res) => {
    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) return invalid(res, 'Invalid pagination parameters', pagination.error.issues);
    const userId = await ensureUser(req);
    const project = await prisma.project.findFirst({
        where: { id: routeParam(req, 'projectId'), ...projectScopeWhere(req) },
        select: { id: true, userId: true, organizationId: true }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const where = { projectId: project.id };
    const [personas, totalCount] = await Promise.all([prisma.persona.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: pagination.data.limit + 1,
        ...cursorArgs(pagination.data.cursor)
    }), prisma.persona.count({ where })]);
    res.json(cursorPage(personas, pagination.data.limit, totalCount));
}));

router.post('/projects/:projectId/personas', asyncHandler(async (req, res) => {
    const parsed = personaCreateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid persona details', parsed.error.issues);

    const userId = await ensureUser(req);
    const project = await prisma.project.findFirst({
        where: { id: routeParam(req, 'projectId'), ...projectScopeWhere(req) },
        select: { id: true, userId: true, organizationId: true }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageProject(req, project)) return res.status(403).json({ error: 'Only project owners and organization admins can create personas.' });

    const persona = await prisma.persona.create({ data: { ...parsed.data, projectId: project.id } });
    res.status(201).json(persona);
}));

router.patch('/personas/:personaId', asyncHandler(async (req, res) => {
    const parsed = personaUpdateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid persona details', parsed.error.issues);

    const userId = await ensureUser(req);
    const persona = await prisma.persona.findFirst({
        where: { id: routeParam(req, 'personaId'), project: projectScopeWhere(req) },
        include: { project: { select: { userId: true, organizationId: true } } }
    });
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    if (!canManageProject(req, persona.project)) return res.status(403).json({ error: 'Only project owners and organization admins can update personas.' });

    res.json(await prisma.persona.update({ where: { id: persona.id }, data: parsed.data }));
}));

router.delete('/personas/:personaId', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const persona = await prisma.persona.findFirst({
        where: { id: routeParam(req, 'personaId'), project: projectScopeWhere(req) },
        include: { _count: { select: { simulations: true } }, project: { select: { userId: true, organizationId: true } } }
    });
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    if (!canManageProject(req, persona.project)) return res.status(403).json({ error: 'Only project owners and organization admins can delete personas.' });
    if (persona._count.simulations > 0) return res.status(409).json({ error: 'Personas with simulation history cannot be deleted' });

    await prisma.persona.delete({ where: { id: persona.id } });
    res.status(204).end();
}));

router.get('/projects/:projectId/simulations', asyncHandler(async (req, res) => {
    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) return invalid(res, 'Invalid pagination parameters', pagination.error.issues);
    const userId = await ensureUser(req);
    const project = await prisma.project.findFirst({ where: { id: routeParam(req, 'projectId'), ...projectScopeWhere(req) }, select: { id: true } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const where = { projectId: project.id };
    const [simulations, totalCount] = await Promise.all([prisma.simulation.findMany({
        where,
        include: { persona: true, steps: { orderBy: { stepNumber: 'asc' } }, reports: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pagination.data.limit + 1,
        ...cursorArgs(pagination.data.cursor)
    }), prisma.simulation.count({ where })]);
    res.json(cursorPage(simulations, pagination.data.limit, totalCount));
}));

router.get('/simulations', asyncHandler(async (req, res) => {
    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) return invalid(res, 'Invalid pagination parameters', pagination.error.issues);
    const userId = await ensureUser(req);
    const where = { project: projectScopeWhere(req) };
    const [simulations, totalCount] = await Promise.all([prisma.simulation.findMany({
        where,
        include: {
            project: { select: { id: true, name: true } },
            persona: true,
            steps: { orderBy: { stepNumber: 'asc' } },
            reports: true
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pagination.data.limit + 1,
        ...cursorArgs(pagination.data.cursor)
    }), prisma.simulation.count({ where })]);
    res.json(cursorPage(simulations, pagination.data.limit, totalCount));
}));

router.get('/reports', asyncHandler(async (req, res) => {
    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) return invalid(res, 'Invalid pagination parameters', pagination.error.issues);
    const userId = await ensureUser(req);
    const where = { simulation: { project: projectScopeWhere(req) } };
    const [reports, totalCount] = await Promise.all([prisma.report.findMany({
        where,
        include: {
            simulation: {
                include: {
                    project: { select: { id: true, name: true } },
                    persona: { select: { id: true, name: true } },
                    events: { orderBy: [{ stepNumber: 'asc' }, { createdAt: 'asc' }] }
                }
            }
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pagination.data.limit + 1,
        ...cursorArgs(pagination.data.cursor)
    }), prisma.report.count({ where })]);
    res.json(cursorPage(reports, pagination.data.limit, totalCount));
}));

router.get('/reports/:id', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const report = await prisma.report.findFirst({
        where: { id: routeParam(req, 'id'), simulation: { project: projectScopeWhere(req) } },
        include: {
            simulation: {
                include: {
                    project: { select: { id: true, name: true } },
                    persona: { select: { id: true, name: true } },
                    steps: { orderBy: { stepNumber: 'asc' } },
                    events: { orderBy: [{ stepNumber: 'asc' }, { createdAt: 'asc' }] }
                }
            }
        }
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
}));

router.get('/reports/:id/shares', asyncHandler(async (req, res) => {
    await ensureUser(req);
    const report = await prisma.report.findFirst({
        where: { id: routeParam(req, 'id'), simulation: { project: projectScopeWhere(req) } },
        select: { id: true, simulation: { select: { project: { select: { userId: true, organizationId: true } } } } }
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (!canManageProject(req, report.simulation.project)) {
        return res.status(403).json({ error: 'Only project owners and organization admins can manage report sharing.' });
    }

    const shares = await prisma.reportShare.findMany({
        where: { reportId: report.id, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' }
    });
    res.json(shares);
}));

router.post('/reports/:id/shares', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const parsed = reportShareCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return invalid(res, 'Share expiration must be 1, 7, or 30 days', parsed.error.issues);

    const report = await prisma.report.findFirst({
        where: { id: routeParam(req, 'id'), simulation: { project: projectScopeWhere(req) } },
        select: { id: true, simulation: { select: { project: { select: { userId: true, organizationId: true } } } } }
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (!canManageProject(req, report.simulation.project)) {
        return res.status(403).json({ error: 'Only project owners and organization admins can share reports.' });
    }

    const now = new Date();
    const activeShares = await prisma.reportShare.count({
        where: { reportId: report.id, revokedAt: null, expiresAt: { gt: now } }
    });
    if (activeShares >= MAX_ACTIVE_REPORT_SHARES) {
        return res.status(409).json({ error: 'This report already has the maximum number of active share links.' });
    }

    const { token, tokenHash } = createReportShareToken();
    const expiresAt = reportShareExpiry(parsed.data.expiresInDays, now);
    await prisma.reportShare.create({
        data: { reportId: report.id, createdByUserId: userId, tokenHash, expiresAt }
    });
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    res.status(201).json({
        url: `${appUrl}/shared/reports#${token}`,
        expiresAt
    });
}));

router.delete('/reports/:id/shares/:shareId', asyncHandler(async (req, res) => {
    await ensureUser(req);
    const report = await prisma.report.findFirst({
        where: { id: routeParam(req, 'id'), simulation: { project: projectScopeWhere(req) } },
        select: { id: true, simulation: { select: { project: { select: { userId: true, organizationId: true } } } } }
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (!canManageProject(req, report.simulation.project)) {
        return res.status(403).json({ error: 'Only project owners and organization admins can revoke report shares.' });
    }

    const revoked = await prisma.reportShare.updateMany({
        where: { id: routeParam(req, 'shareId'), reportId: report.id, revokedAt: null },
        data: { revokedAt: new Date() }
    });
    if (!revoked.count) return res.status(404).json({ error: 'Active report share not found' });
    res.status(204).end();
}));

router.get('/simulations/:id/steps', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const simulation = await prisma.simulation.findFirst({
        where: { id: routeParam(req, 'id'), project: projectScopeWhere(req) },
        select: { id: true }
    });
    if (!simulation) return res.status(404).json({ error: 'Simulation not found' });

    const steps = await prisma.simulationStep.findMany({
        where: { simulationId: simulation.id },
        orderBy: [{ stepNumber: 'asc' }, { createdAt: 'asc' }]
    });
    res.json(steps);
}));

router.post('/simulations/:id/progress-ticket', asyncHandler(async (req, res) => {
    await ensureUser(req);
    const simulationId = routeParam(req, 'id');
    const simulation = await prisma.simulation.findFirst({
        where: { id: simulationId, project: projectScopeWhere(req) },
        select: { id: true }
    });
    if (!simulation || !req.auth) return res.status(404).json({ error: 'Simulation not found' });
    const ticket = await createProgressTicket({
        simulationId,
        organizationId: getWorkspaceId(req.auth),
        userId: req.auth.userId
    });
    res.status(201).json({ ticket, expiresInSeconds: 30 });
}));

router.post('/simulations/start', asyncHandler(async (req, res) => {
    const parsed = simulationStartSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid simulation request', parsed.error.issues);
    const idempotencyKey = req.header('idempotency-key');
    if (idempotencyKey && !/^[A-Za-z0-9._:-]{1,128}$/.test(idempotencyKey)) {
        return res.status(400).json({ error: 'Idempotency-Key must be 1-128 safe characters.' });
    }

    await ensureUser(req);
    if (!req.auth) throw new Error('Authenticated user context is missing');
    if (!canRunTenantSimulation(req.auth)) {
        return res.status(403).json({ error: 'Your organization role does not allow running simulations.' });
    }
    const project = await prisma.project.findFirst({
        where: { id: parsed.data.projectId, ...projectScopeWhere(req) },
        select: { id: true, productUrl: true, repoUrl: true, description: true }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const persona = await prisma.persona.findFirst({
        where: { id: parsed.data.personaId, projectId: project.id }
    });
    if (!persona) return res.status(404).json({ error: 'Persona not found in this project' });

    if (!req.auth) throw new Error('Authenticated user context is missing');
    const organizationId = getWorkspaceId(req.auth);
    const creation = await createSimulationWithinQuota(prisma, organizationId, {
        ...parsed.data,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        status: 'PENDING'
    });
    if (!creation.reserved) {
        if (creation.rejection === 'concurrency_limit') {
            res.setHeader('Retry-After', '30');
            return res.status(429).json({ error: 'Your organization already has the maximum number of active simulations.' });
        }
        return res.status(403).json({ error: `You have reached the ${creation.limits.simulationsPerMonth} simulation monthly limit for your ${creation.plan} plan.` });
    }
    const simulation = creation.simulation;
    if (creation.deduplicated) return res.status(200).json(simulation);
    try {
        const started = await enqueueSimulationRun(
            simulation,
            organizationId,
            project,
            persona,
            parsed.data.task
        );
        res.status(202).json(started);
    } catch (error) {
        await releaseSimulationUsage(prisma, simulation.id, organizationId, creation.periodStart);
        console.error(`Failed to contact simulation service for ${simulation.id}:`, error);
        const statusCode = error instanceof SimulationServiceError ? error.statusCode : 502;
        const message = error instanceof SimulationServiceError
            ? error.message
            : 'Unable to reach the simulation service. Retry the simulation.';
        res.status(statusCode).json({ error: message });
    }
}));

router.post('/simulations/:id/retry', asyncHandler(async (req, res) => {
    await ensureUser(req);
    if (!req.auth) throw new Error('Authenticated user context is missing');
    if (!canRunTenantSimulation(req.auth)) {
        return res.status(403).json({ error: 'Your organization role does not allow running simulations.' });
    }
    const previous = await prisma.simulation.findFirst({
        where: { id: routeParam(req, 'id'), status: 'FAILED', project: projectScopeWhere(req) },
        include: { project: true, persona: true }
    });
    if (!previous) return res.status(404).json({ error: 'Failed simulation not found' });

    const organizationId = getWorkspaceId(req.auth);
    const creation = await createSimulationWithinQuota(prisma, organizationId, {
        projectId: previous.projectId,
        personaId: previous.personaId,
        task: previous.task,
        status: 'PENDING'
    });
    if (!creation.reserved) {
        if (creation.rejection === 'concurrency_limit') {
            res.setHeader('Retry-After', '30');
            return res.status(429).json({ error: 'Your organization already has the maximum number of active simulations.' });
        }
        return res.status(403).json({ error: `You have reached the ${creation.limits.simulationsPerMonth} simulation monthly limit for your ${creation.plan} plan.` });
    }
    const retry = creation.simulation;
    try {
        const started = await enqueueSimulationRun(
            retry,
            organizationId,
            previous.project,
            previous.persona,
            retry.task
        );
        res.status(202).json(started);
    } catch (error) {
        await releaseSimulationUsage(prisma, retry.id, organizationId, creation.periodStart);
        console.error(`Failed to retry simulation ${previous.id}:`, error);
        const statusCode = error instanceof SimulationServiceError ? error.statusCode : 502;
        const message = error instanceof SimulationServiceError
            ? error.message
            : 'Unable to reach the simulation service. Retry the simulation.';
        res.status(statusCode).json({ error: message });
    }
}));

router.post('/simulations/:id/cancel', asyncHandler(async (req, res) => {
    await ensureUser(req);
    if (!req.auth) throw new Error('Authenticated user context is missing');
    if (!canRunTenantSimulation(req.auth)) {
        return res.status(403).json({ error: 'Your organization role does not allow canceling simulations.' });
    }

    const simulation = await prisma.simulation.findFirst({
        where: { id: routeParam(req, 'id'), project: projectScopeWhere(req) },
        select: {
            id: true,
            status: true,
            createdAt: true,
            project: { select: { organizationId: true } }
        }
    });
    if (!simulation) return res.status(404).json({ error: 'Simulation not found' });
    if (!['PENDING', 'RUNNING'].includes(simulation.status)) {
        return res.status(409).json({ error: `Cannot cancel a ${simulation.status.toLowerCase()} simulation.` });
    }

    const queue = process.env.REDIS_URL ? getSimulationQueue() : undefined;
    const job = queue ? await queue.getJob(`simulation-${simulation.id}`) : undefined;
    const state = job ? await job.getState() : undefined;
    if (job && state && ['waiting', 'delayed', 'paused', 'waiting-children'].includes(state)) {
        try {
            await job.remove();
            const periodStart = new Date(Date.UTC(
                simulation.createdAt.getUTCFullYear(),
                simulation.createdAt.getUTCMonth(),
                1
            ));
            await releaseSimulationUsage(
                prisma,
                simulation.id,
                simulation.project.organizationId,
                periodStart,
                'CANCELLED'
            );
            await publishSimulationProgress(simulation.id, { type: 'simulation.status', status: 'CANCELLED' });
            return res.json({ id: simulation.id, status: 'CANCELLED' });
        } catch (error) {
            console.info(`Simulation ${simulation.id} became active while cancellation was requested:`, error);
        }
    }

    const internalApiKey = process.env.INTERNAL_API_KEY;
    if (!internalApiKey) return res.status(503).json({ error: 'Simulation cancellation is not configured.' });
    let response: globalThis.Response;
    try {
        response = await fetch(`${AI_ENGINE_URL}/simulate/${encodeURIComponent(simulation.id)}/cancel`, {
            method: 'POST',
            headers: { 'X-Internal-Api-Key': internalApiKey },
            signal: AbortSignal.timeout(10_000)
        });
    } catch (error) {
        console.error(`Unable to request cancellation for simulation ${simulation.id}:`, error);
        return res.status(503).json({ error: 'Simulation cancellation is temporarily unavailable.' });
    }
    if (!response.ok) return res.status(503).json({ error: 'Simulation cancellation is temporarily unavailable.' });
    return res.status(202).json({ id: simulation.id, status: 'CANCELLATION_REQUESTED' });
}));

export default router;
