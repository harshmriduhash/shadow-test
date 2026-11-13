import { Prisma, PrismaClient, Simulation } from '@prisma/client';

export type PlanName = 'FREE' | 'STARTER' | 'PRO';
type PlanLimits = { projects: number | null; simulationsPerMonth: number };
type PlanUsageClient = Pick<PrismaClient, 'subscription' | 'usageRecord' | 'project'>;
type SimulationQuotaResult = {
    plan: PlanName;
    limits: PlanLimits;
    reserved: false;
    deduplicated: false;
    rejection: 'monthly_limit' | 'concurrency_limit';
    simulationsUsed: number;
    periodStart: Date;
    simulation: null;
} | {
    plan: PlanName;
    limits: PlanLimits;
    reserved: true;
    deduplicated: boolean;
    rejection: null;
    simulationsUsed: number;
    periodStart: Date;
    simulation: Simulation;
};

const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
    FREE: { projects: 1, simulationsPerMonth: 3 },
    STARTER: { projects: 10, simulationsPerMonth: 100 },
    PRO: { projects: null, simulationsPerMonth: 1000 }
};
function maxActiveSimulationsPerOrganization() {
    const limit = Number(process.env.MAX_ACTIVE_SIMULATIONS_PER_ORG ?? 2);
    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error('MAX_ACTIVE_SIMULATIONS_PER_ORG must be a positive integer');
    }
    return limit;
}

function isPaidPlan(plan: string): plan is Exclude<PlanName, 'FREE'> {
    return plan === 'STARTER' || plan === 'PRO';
}

function activePlan(subscription: { plan: string; status: string } | null): PlanName {
    let plan: PlanName = 'FREE';
    if (
        subscription
        && isPaidPlan(subscription.plan)
        && ['ACTIVE', 'TRIALING'].includes(subscription.status)
    ) {
        plan = subscription.plan;
    }
    return plan;
}

function monthStartUtc(now: Date) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getPlanUsage(prisma: PlanUsageClient, organizationId: string, now = new Date()) {
    const periodStart = monthStartUtc(now);
    const [subscription, usageRecord, projects] = await Promise.all([
        prisma.subscription.findUnique({ where: { organizationId } }),
        prisma.usageRecord.findUnique({
            where: { organizationId_periodStart: { organizationId, periodStart } }
        }),
        prisma.project.count({ where: { organizationId } })
    ]);
    const plan = activePlan(subscription);
    const limits = PLAN_LIMITS[plan];
    const simulations = usageRecord?.simulationsUsed || 0;

    return {
        plan,
        limits,
        usage: { projects, simulations },
        canCreateProject: limits.projects === null || projects < limits.projects,
        canRunSimulation: simulations < limits.simulationsPerMonth
    };
}

export async function createSimulationWithinQuota(
    prisma: PrismaClient,
    organizationId: string,
    data: Prisma.SimulationUncheckedCreateInput,
    now = new Date()
): Promise<SimulationQuotaResult> {
    const periodStart = monthStartUtc(now);
    return prisma.$transaction(async transaction => {
        await transaction.$queryRaw<Array<{ id: string }>>`
            SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE
        `;
        const [subscription, usageRecord] = await Promise.all([
            transaction.subscription.findUnique({ where: { organizationId } }),
            transaction.usageRecord.upsert({
                where: { organizationId_periodStart: { organizationId, periodStart } },
                create: { organizationId, periodStart },
                update: {}
            })
        ]);
        const plan = activePlan(subscription);
        const limits = PLAN_LIMITS[plan];
        if (typeof data.idempotencyKey === 'string') {
            const existing = await transaction.simulation.findUnique({
                where: {
                    projectId_idempotencyKey: {
                        projectId: data.projectId,
                        idempotencyKey: data.idempotencyKey
                    }
                }
            });
            if (existing) {
                return {
                    plan,
                    limits,
                    reserved: true as const,
                    deduplicated: true,
                    rejection: null,
                    simulationsUsed: usageRecord.simulationsUsed,
                    periodStart,
                    simulation: existing
                };
            }
        }

        const activeSimulations = await transaction.simulation.count({
            where: {
                project: { organizationId },
                status: { in: ['PENDING', 'RUNNING'] }
            }
        });
        if (activeSimulations >= maxActiveSimulationsPerOrganization()) {
            return {
                plan,
                limits,
                reserved: false as const,
                deduplicated: false as const,
                rejection: 'concurrency_limit' as const,
                simulationsUsed: usageRecord.simulationsUsed,
                periodStart,
                simulation: null
            };
        }
        const reservation = await transaction.usageRecord.updateMany({
            where: {
                id: usageRecord.id,
                simulationsUsed: { lt: limits.simulationsPerMonth }
            },
            data: { simulationsUsed: { increment: 1 } }
        });

        if (reservation.count !== 1) {
            return {
                plan,
                limits,
                reserved: false as const,
                deduplicated: false as const,
                rejection: 'monthly_limit' as const,
                simulationsUsed: usageRecord.simulationsUsed,
                periodStart,
                simulation: null
            };
        }

        const simulation = await transaction.simulation.create({ data });
        return {
            plan,
            limits,
            reserved: true as const,
            deduplicated: false,
            rejection: null,
            simulationsUsed: usageRecord.simulationsUsed + 1,
            periodStart,
            simulation
        };
    });
}

export async function releaseSimulationUsage(
    prisma: PrismaClient,
    simulationId: string,
    organizationId: string,
    periodStart: Date,
    terminalStatus: 'FAILED' | 'CANCELLED' = 'FAILED'
) {
    return prisma.$transaction(async transaction => {
        const transitioned = await transaction.simulation.updateMany({
            where: {
                id: simulationId,
                status: { in: ['PENDING', 'RUNNING'] }
            },
            data: { status: terminalStatus }
        });
        if (transitioned.count !== 1) return false;
        await transaction.usageRecord.updateMany({
            where: {
                organizationId,
                periodStart,
                simulationsUsed: { gt: 0 }
            },
            data: { simulationsUsed: { decrement: 1 } }
        });
        return true;
    });
}

export function normalizePlan(value: string | null | undefined): PlanName {
    return value === 'STARTER' || value === 'PRO' ? value : 'FREE';
}
