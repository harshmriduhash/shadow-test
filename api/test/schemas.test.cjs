const test = require('node:test');
const assert = require('node:assert/strict');
const {
    personaCreateSchema,
    projectCreateSchema,
    projectUpdateSchema,
    documentSearchSchema,
    dashboardSearchSchema,
    documentUploadSchema,
    simulationReportSchema,
    simulationStartSchema,
    simulationStatusSchema,
    simulationStepSchema,
    reportShareCreateSchema
} = require('../dist/schemas.js');
const { createSimulationWithinQuota, getPlanUsage } = require('../dist/plans.js');

test('project creation accepts required details and optional URLs', () => {
    const result = projectCreateSchema.safeParse({
        name: 'ShadowTest',
        description: 'Test a user journey',
        productUrl: 'https://example.com',
        repoUrl: 'https://github.com/acme/product'
    });
    assert.equal(result.success, true);
});

test('project URL validation rejects non-HTTPS and non-GitHub repositories', () => {
    assert.equal(projectCreateSchema.safeParse({
        name: 'Project',
        description: 'Description',
        productUrl: 'http://example.com'
    }).success, false);
    assert.equal(projectCreateSchema.safeParse({
        name: 'Project',
        description: 'Description',
        repoUrl: 'https://example.com/acme/product'
    }).success, false);
    assert.equal(projectCreateSchema.safeParse({
        name: 'Project',
        description: 'Description',
        repoUrl: 'not-a-url'
    }).success, false);
});

test('project updates cannot be empty', () => {
    assert.equal(projectUpdateSchema.safeParse({}).success, false);
    assert.equal(projectUpdateSchema.safeParse({ name: 'Updated name' }).success, true);
});

test('persona defaults to the supported model when omitted', () => {
    const result = personaCreateSchema.safeParse({ name: 'New user', traits: 'Curious and cautious' });
    assert.equal(result.success, true);
    assert.equal(result.data.behaviorModel, 'claude-sonnet');
    assert.equal(result.data.technicalKnowledge, 3);
    assert.equal(result.data.patience, 3);
    assert.equal(personaCreateSchema.safeParse({
        name: 'Expert',
        traits: 'Highly experienced',
        technicalKnowledge: 6
    }).success, false);
});

test('simulation tasks must be non-empty and bounded', () => {
    assert.equal(simulationStartSchema.safeParse({ projectId: 'p1', personaId: 'u1', task: ' ' }).success, false);
    assert.equal(simulationStartSchema.safeParse({ projectId: 'p1', personaId: 'u1', task: 'Create an account' }).success, true);
    assert.equal(simulationStartSchema.safeParse({ projectId: 'p1', personaId: 'u1', task: 'x'.repeat(2001) }).success, false);
});

test('internal simulation updates accept only known statuses', () => {
    assert.equal(simulationStatusSchema.safeParse({ status: 'COMPLETED' }).success, true);
    assert.equal(simulationStatusSchema.safeParse({ status: 'DELETED' }).success, false);
});

test('simulation steps require content and a positive step number', () => {
    assert.equal(simulationStepSchema.safeParse({ step_number: 1, observation: 'A sign-in button is visible' }).success, true);
    assert.equal(simulationStepSchema.safeParse({ step_number: 0, action: 'Click sign in' }).success, false);
    assert.equal(simulationStepSchema.safeParse({ step_number: 1 }).success, false);
});

test('simulation reports require a summary, bounded insight list, and outcome', () => {
    assert.equal(simulationReportSchema.safeParse({
        summary: 'The persona could not confirm the requested task.',
        insights: ['The navigation label was unclear.'],
        success: false
    }).success, true);
    const report = simulationReportSchema.safeParse({
        summary: 'A confusing label slowed the task.',
        insights: ['The navigation label was unclear.'],
        success: false,
        events: [{
            step_number: 1,
            type: 'CONFUSION',
            severity: 'MEDIUM',
            description: 'The persona could not distinguish the two navigation labels.',
            evidence: 'The page shows both labels in the primary navigation.'
        }]
    });
    assert.equal(report.success, true);
    assert.equal(simulationReportSchema.safeParse({
        summary: 'A result.',
        insights: [],
        success: false,
        events: [{ step_number: 0, type: 'ABANDONMENT', severity: 'HIGH', description: 'Stopped.' }]
    }).success, false);
    assert.equal(simulationReportSchema.safeParse({ summary: '', insights: [], success: false }).success, false);
});

test('document uploads accept bounded PDF and text files only', () => {
    assert.equal(documentUploadSchema.safeParse({
        fileName: 'guide.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1024
    }).success, true);
    assert.equal(documentUploadSchema.safeParse({
        fileName: 'large.pdf',
        contentType: 'application/pdf',
        sizeBytes: 10 * 1024 * 1024 + 1
    }).success, false);
    assert.equal(documentUploadSchema.safeParse({
        fileName: 'script.exe',
        contentType: 'application/octet-stream',
        sizeBytes: 1024
    }).success, false);
});

test('semantic document searches require a bounded non-empty query', () => {
    assert.equal(documentSearchSchema.safeParse({ query: 'Where are invoices?' }).success, true);
    assert.equal(documentSearchSchema.safeParse({ query: '  ' }).success, false);
    assert.equal(documentSearchSchema.safeParse({ query: 'x'.repeat(2001) }).success, false);
});

test('dashboard search requires two through 120 characters', () => {
    assert.equal(dashboardSearchSchema.safeParse({ query: 'billing' }).success, true);
    assert.equal(dashboardSearchSchema.safeParse({ query: 'x' }).success, false);
    assert.equal(dashboardSearchSchema.safeParse({ query: 'x'.repeat(121) }).success, false);
});

test('report share links are limited to 1, 7, or 30 day expiration periods', () => {
    assert.deepEqual(reportShareCreateSchema.parse({}), { expiresInDays: 7 });
    assert.equal(reportShareCreateSchema.safeParse({ expiresInDays: 1 }).success, true);
    assert.equal(reportShareCreateSchema.safeParse({ expiresInDays: 30 }).success, true);
    assert.equal(reportShareCreateSchema.safeParse({ expiresInDays: 2 }).success, false);
});

test('organizations use free plan quotas and UTC month usage', async () => {
    let periodStart;
    const prisma = {
        subscription: { findUnique: async () => null },
        project: { count: async () => 1 },
        usageRecord: {
            findUnique: async ({ where }) => {
                periodStart = where.organizationId_periodStart.periodStart;
                return { simulationsUsed: 2 };
            }
        }
    };
    const usage = await getPlanUsage(prisma, 'org', new Date('2026-06-15T12:00:00Z'));
    assert.equal(usage.plan, 'FREE');
    assert.equal(usage.limits.projects, 1);
    assert.equal(usage.limits.simulationsPerMonth, 3);
    assert.equal(usage.canCreateProject, false);
    assert.equal(usage.canRunSimulation, true);
    assert.equal(periodStart.toISOString(), '2026-06-01T00:00:00.000Z');
});

test('active starter subscriptions receive starter quotas', async () => {
    const prisma = {
        subscription: { findUnique: async () => ({ plan: 'STARTER', status: 'ACTIVE' }) },
        project: { count: async () => 2 },
        usageRecord: { findUnique: async () => ({ simulationsUsed: 99 }) }
    };
    const usage = await getPlanUsage(prisma, 'org');
    assert.equal(usage.plan, 'STARTER');
    assert.equal(usage.canCreateProject, true);
    assert.equal(usage.canRunSimulation, true);
});

test('inactive subscriptions fall back to free quotas', async () => {
    const prisma = {
        subscription: { findUnique: async () => ({ plan: 'PRO', status: 'PAST_DUE' }) },
        project: { count: async () => 1 },
        usageRecord: { findUnique: async () => ({ simulationsUsed: 3 }) }
    };
    const usage = await getPlanUsage(prisma, 'org');
    assert.equal(usage.plan, 'FREE');
    assert.equal(usage.canRunSimulation, false);
});

test('simulation creation atomically reserves organization quota', async () => {
    const calls = [];
    const simulationCreates = [];
    const makePrisma = (simulationsUsed, activeCount = 0, existingSimulation = null) => ({
        $transaction: async callback => callback({
            $queryRaw: async () => [{ id: 'org' }],
            subscription: { findUnique: async () => null },
            simulation: {
                count: async () => activeCount,
                findUnique: async () => existingSimulation,
                create: async ({ data }) => {
                    simulationCreates.push(data);
                    return { id: 'simulation' };
                }
            },
            usageRecord: {
                upsert: async ({ where }) => {
                    calls.push(where.organizationId_periodStart);
                    return { id: 'usage', simulationsUsed };
                },
                updateMany: async ({ where, data }) => {
                    calls.push({ where, data });
                    return { count: simulationsUsed < 3 ? 1 : 0 };
                }
            }
        })
    });

    const data = { projectId: 'project', personaId: 'persona', task: 'Test', status: 'PENDING' };
    const allowed = await createSimulationWithinQuota(makePrisma(2), 'org', data, new Date('2026-06-15T12:00:00Z'));
    assert.equal(allowed.reserved, true);
    assert.equal(allowed.simulationsUsed, 3);
    assert.equal(allowed.simulation.id, 'simulation');
    const blocked = await createSimulationWithinQuota(makePrisma(3), 'org', data, new Date('2026-06-15T12:00:00Z'));
    assert.equal(blocked.reserved, false);
    assert.equal(blocked.simulationsUsed, 3);
    const concurrentBlocked = await createSimulationWithinQuota(makePrisma(1, 2), 'org', data);
    assert.equal(concurrentBlocked.reserved, false);
    assert.equal(concurrentBlocked.rejection, 'concurrency_limit');
    const duplicate = await createSimulationWithinQuota(
        makePrisma(3, 2, { id: 'existing' }),
        'org',
        { ...data, idempotencyKey: 'same-request' }
    );
    assert.equal(duplicate.reserved, true);
    assert.equal(duplicate.deduplicated, true);
    assert.equal(duplicate.simulation.id, 'existing');
    assert.equal(calls[0].periodStart.toISOString(), '2026-06-01T00:00:00.000Z');
    assert.deepEqual(calls[1].where.simulationsUsed, { lt: 3 });
    assert.deepEqual(calls[1].data.simulationsUsed, { increment: 1 });
    assert.equal(simulationCreates.length, 1);
});
