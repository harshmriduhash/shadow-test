"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';
// --- Projects ---
router.get('/projects', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || 'user_1';
        const projects = await prisma.project.findMany({
            where: { userId },
            include: { _count: { select: { simulations: true } } }
        });
        res.json(projects);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
router.post('/projects', async (req, res) => {
    try {
        const { name, description, repoUrl, productUrl, userId } = req.body;
        const project = await prisma.project.create({
            data: {
                name,
                description,
                repoUrl,
                productUrl,
                userId: userId || 'user_1',
                personas: {
                    create: [
                        { name: 'Impatient Developer', traits: 'Technical, fast, low patience', behaviorModel: 'sonnet-3.5' },
                        { name: 'Non-technical Founder', traits: 'Business-focused, confused by jargon', behaviorModel: 'sonnet-3.5' },
                        { name: 'Enterprise Buyer', traits: 'Security-conscious, slow decision maker', behaviorModel: 'sonnet-3.5' }
                    ]
                }
            }
        });
        res.json(project);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create project' });
    }
});
// --- Simulations ---
router.get('/projects/:projectId/simulations', async (req, res) => {
    try {
        const { projectId } = req.params;
        const simulations = await prisma.simulation.findMany({
            where: { projectId },
            include: { persona: true, _count: { select: { steps: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(simulations);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});
router.post('/simulations/start', async (req, res) => {
    try {
        const { projectId, personaId, task } = req.body;
        // Fetch project and persona for context
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        const persona = await prisma.persona.findUnique({ where: { id: personaId } });
        if (!project || !persona) {
            return res.status(404).json({ error: 'Project or Persona not found' });
        }
        // Create recording
        const simulation = await prisma.simulation.create({
            data: { projectId, personaId, task, status: 'RUNNING' }
        });
        // Trigger Python AI Engine asynchronously
        fetch(`${AI_ENGINE_URL}/simulate/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId,
                persona_id: personaId,
                task: task,
                simulation_id: simulation.id,
                product_url: project.productUrl,
                persona_traits: persona.traits
            })
        }).catch(err => console.error('Failed to trigger AI Engine:', err));
        res.json(simulation);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to start simulation' });
    }
});
router.patch('/simulations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const simulation = await prisma.simulation.update({
            where: { id },
            data: { status }
        });
        res.json(simulation);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});
router.post('/simulations/:id/steps', async (req, res) => {
    try {
        const { id } = req.params;
        const { step_number, type, content } = req.body;
        // Map AI engine JSON keys to Prisma model
        const step = await prisma.simulationStep.create({
            data: {
                simulationId: id,
                stepNumber: step_number,
                [type]: content // Dynamically set observation, interpretation, etc.
            }
        });
        res.json(step);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});
exports.default = router;
