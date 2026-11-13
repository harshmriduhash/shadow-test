import { Prisma, PrismaClient, Simulation } from '@prisma/client';

export type PlanName = 'FREE' | 'STARTER' | 'PRO';
type PlanLimits = { projects: number | null; simulationsPerMonth: number };
type PlanUsageClient = Pick<PrismaClient, 'subscription' | 'usageRecord' | 'project'>;
type SimulationQuotaResult = {
    plan: PlanName;
    limits: PlanLimits;
    reserved: false;
    simulationsUsed: number;
    periodStart: Date;
    simulation: null;
} | {
    plan: PlanName;
    limits: PlanLimits;
    reserved: true;
    simulationsUsed: number;
    periodStart: Date;
    simulation: Simulation;
};

const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
    FREE: { projects: 1, simulationsPerMonth: 3 },
    STARTER: { projects: 10, simulationsPerMonth: 100 },
    PRO: { projects: null, simulationsPerMonth: 1000 }
};

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
            simulationsUsed: usageRecord.simulationsUsed + 1,
            periodStart,
            simulation
        };
    });
}

export async function releaseSimulationUsage(
    prisma: PrismaClient,
    organizationId: string,
    periodStart: Date
) {
    await prisma.usageRecord.updateMany({
        where: {
            organizationId,
            periodStart,
            simulationsUsed: { gt: 0 }
        },
        data: { simulationsUsed: { decrement: 1 } }
    });
}

export function normalizePlan(value: string | null | undefined): PlanName {
    return value === 'STARTER' || value === 'PRO' ? value : 'FREE';
}
