import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireInternalAuth, requireSession } from './security';
import { personaCreateSchema, personaUpdateSchema, projectCreateSchema, projectUpdateSchema, simulationReportSchema, simulationStartSchema, simulationStatusSchema, simulationStepSchema } from './schemas';
import { getPlanUsage } from './plans';

const prisma = new PrismaClient();
const router = Router();
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

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
    await prisma.user.upsert({
        where: { id: req.auth.userId },
        create: { id: req.auth.userId, ...(req.auth.email ? { email: req.auth.email } : {}) },
        update: req.auth.email ? { email: req.auth.email } : {}
    });
    return req.auth.userId;
}

async function dispatchSimulation(
    simulationId: string,
    project: { id: string; productUrl: string | null; repoUrl: string | null; description: string | null },
    persona: { id: string; traits: string },
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
            persona_traits: persona.traits
        }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new SimulationServiceError('Simulation service rejected the request', 502);
    const simulation = await prisma.simulation.findUnique({ where: { id: simulationId } });
    if (!simulation) throw new SimulationServiceError('Simulation record was not found', 500);
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

    const simulation = await prisma.simulation.update({
        where: { id: routeParam(req, 'id') },
        data: { status: parsed.data.status }
    });
    res.json(simulation);
}));

router.post('/simulations/:id/steps', requireInternalAuth, asyncHandler(async (req, res) => {
    const parsed = simulationStepSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid simulation step', parsed.error.issues);

    const { step_number: stepNumber, ...step } = parsed.data;
    const savedStep = await prisma.simulationStep.create({
        data: { simulationId: routeParam(req, 'id'), stepNumber, ...step }
    });
    res.status(201).json(savedStep);
}));

router.post('/simulations/:id/report', requireInternalAuth, asyncHandler(async (req, res) => {
    const parsed = simulationReportSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid simulation report', parsed.error.issues);

    const simulationId = routeParam(req, 'id');
    const simulation = await prisma.simulation.findUnique({ where: { id: simulationId }, select: { id: true } });
    if (!simulation) return res.status(404).json({ error: 'Simulation not found' });

    const [report] = await prisma.$transaction([
        prisma.report.create({
            data: {
                simulationId,
                summary: parsed.data.summary,
                insights: JSON.stringify(parsed.data.insights)
            }
        }),
        prisma.simulation.update({
            where: { id: simulationId },
            data: { success: parsed.data.success }
        })
    ]);
    res.status(201).json(report);
}));

router.use(requireSession);

router.get('/projects', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const projects = await prisma.project.findMany({
        where: { userId },
        include: { _count: { select: { simulations: true } } },
        orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
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
    const planUsage = await getPlanUsage(prisma, userId);
    if (!planUsage.canCreateProject) {
        return res.status(403).json({ error: `Your ${planUsage.plan} plan allows ${planUsage.limits.projects} project. Upgrade to add another.` });
    }
    const { productUrl, repoUrl, ...projectData } = parsed.data;
    const project = await prisma.project.create({
        data: {
            ...projectData,
            productUrl: productUrl || null,
            repoUrl: repoUrl || null,
            userId,
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
    res.status(201).json(project);
}));

router.get('/projects/:projectId', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const project = await prisma.project.findFirst({
        where: { id: routeParam(req, 'projectId'), userId },
        include: { personas: { orderBy: { createdAt: 'asc' } } }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
}));

router.patch('/projects/:projectId', asyncHandler(async (req, res) => {
    const parsed = projectUpdateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid project details', parsed.error.issues);

    const userId = await ensureUser(req);
    const ownedProject = await prisma.project.findFirst({ where: { id: routeParam(req, 'projectId'), userId }, select: { id: true } });
    if (!ownedProject) return res.status(404).json({ error: 'Project not found' });

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
    const userId = await ensureUser(req);
    const project = await prisma.project.findFirst({ where: { id: routeParam(req, 'projectId'), userId }, select: { id: true } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const personas = await prisma.persona.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'asc' }
    });
    res.json(personas);
}));

router.post('/projects/:projectId/personas', asyncHandler(async (req, res) => {
    const parsed = personaCreateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid persona details', parsed.error.issues);

    const userId = await ensureUser(req);
    const project = await prisma.project.findFirst({ where: { id: routeParam(req, 'projectId'), userId }, select: { id: true } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const persona = await prisma.persona.create({ data: { ...parsed.data, projectId: project.id } });
    res.status(201).json(persona);
}));

router.patch('/personas/:personaId', asyncHandler(async (req, res) => {
    const parsed = personaUpdateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid persona details', parsed.error.issues);

    const userId = await ensureUser(req);
    const persona = await prisma.persona.findFirst({
        where: { id: routeParam(req, 'personaId'), project: { userId } },
        select: { id: true }
    });
    if (!persona) return res.status(404).json({ error: 'Persona not found' });

    res.json(await prisma.persona.update({ where: { id: persona.id }, data: parsed.data }));
}));

router.delete('/personas/:personaId', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const persona = await prisma.persona.findFirst({
        where: { id: routeParam(req, 'personaId'), project: { userId } },
        include: { _count: { select: { simulations: true } } }
    });
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    if (persona._count.simulations > 0) return res.status(409).json({ error: 'Personas with simulation history cannot be deleted' });

    await prisma.persona.delete({ where: { id: persona.id } });
    res.status(204).end();
}));

router.get('/projects/:projectId/simulations', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const project = await prisma.project.findFirst({ where: { id: routeParam(req, 'projectId'), userId }, select: { id: true } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const simulations = await prisma.simulation.findMany({
        where: { projectId: project.id },
        include: { persona: true, steps: { orderBy: { stepNumber: 'asc' } }, reports: true },
        orderBy: { createdAt: 'desc' },
        take: 100
    });
    res.json(simulations);
}));

router.get('/simulations', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const simulations = await prisma.simulation.findMany({
        where: { project: { userId } },
        include: {
            project: { select: { id: true, name: true } },
            persona: true,
            steps: { orderBy: { stepNumber: 'asc' } },
            reports: true
        },
        orderBy: { createdAt: 'desc' },
        take: 100
    });
    res.json(simulations);
}));

router.get('/reports', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const reports = await prisma.report.findMany({
        where: { simulation: { project: { userId } } },
        include: {
            simulation: {
                include: {
                    project: { select: { id: true, name: true } },
                    persona: { select: { id: true, name: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
    });
    res.json(reports);
}));

router.get('/reports/:id', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const report = await prisma.report.findFirst({
        where: { id: routeParam(req, 'id'), simulation: { project: { userId } } },
        include: {
            simulation: {
                include: {
                    project: { select: { id: true, name: true } },
                    persona: { select: { id: true, name: true } },
                    steps: { orderBy: { stepNumber: 'asc' } }
                }
            }
        }
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
}));

router.get('/simulations/:id/steps', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const simulation = await prisma.simulation.findFirst({
        where: { id: routeParam(req, 'id'), project: { userId } },
        select: { id: true }
    });
    if (!simulation) return res.status(404).json({ error: 'Simulation not found' });

    const steps = await prisma.simulationStep.findMany({
        where: { simulationId: simulation.id },
        orderBy: [{ stepNumber: 'asc' }, { createdAt: 'asc' }]
    });
    res.json(steps);
}));

router.post('/simulations/start', asyncHandler(async (req, res) => {
    const parsed = simulationStartSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, 'Invalid simulation request', parsed.error.issues);

    const userId = await ensureUser(req);
    const project = await prisma.project.findFirst({
        where: { id: parsed.data.projectId, userId },
        select: { id: true, productUrl: true, repoUrl: true, description: true }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const persona = await prisma.persona.findFirst({
        where: { id: parsed.data.personaId, projectId: project.id }
    });
    if (!persona) return res.status(404).json({ error: 'Persona not found in this project' });

    const planUsage = await getPlanUsage(prisma, userId);
    if (!planUsage.canRunSimulation) {
        return res.status(403).json({ error: `You have reached the ${planUsage.limits.simulationsPerMonth} simulation monthly limit for your ${planUsage.plan} plan.` });
    }

    const simulation = await prisma.simulation.create({
        data: { ...parsed.data, status: 'PENDING' }
    });
    try {
        const started = await dispatchSimulation(simulation.id, project, persona, parsed.data.task);
        res.status(202).json(started);
    } catch (error) {
        await prisma.simulation.update({ where: { id: simulation.id }, data: { status: 'FAILED' } });
        console.error(`Failed to contact simulation service for ${simulation.id}:`, error);
        const statusCode = error instanceof SimulationServiceError ? error.statusCode : 502;
        const message = error instanceof SimulationServiceError
            ? error.message
            : 'Unable to reach the simulation service. Retry the simulation.';
        res.status(statusCode).json({ error: message });
    }
}));

router.post('/simulations/:id/retry', asyncHandler(async (req, res) => {
    const userId = await ensureUser(req);
    const previous = await prisma.simulation.findFirst({
        where: { id: routeParam(req, 'id'), status: 'FAILED', project: { userId } },
        include: { project: true, persona: true }
    });
    if (!previous) return res.status(404).json({ error: 'Failed simulation not found' });

    const retry = await prisma.simulation.create({
        data: { projectId: previous.projectId, personaId: previous.personaId, task: previous.task, status: 'PENDING' }
    });
    try {
        const started = await dispatchSimulation(retry.id, previous.project, previous.persona, retry.task);
        res.status(202).json(started);
    } catch (error) {
        await prisma.simulation.update({ where: { id: retry.id }, data: { status: 'FAILED' } });
        console.error(`Failed to retry simulation ${previous.id}:`, error);
        const statusCode = error instanceof SimulationServiceError ? error.statusCode : 502;
        const message = error instanceof SimulationServiceError
            ? error.message
            : 'Unable to reach the simulation service. Retry the simulation.';
        res.status(statusCode).json({ error: message });
    }
}));

export default router;
