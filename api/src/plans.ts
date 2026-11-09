import { PrismaClient } from '@prisma/client';

export type PlanName = 'FREE' | 'STARTER' | 'PRO';

const PLAN_LIMITS: Record<PlanName, { projects: number | null; simulationsPerMonth: number }> = {
    FREE: { projects: 1, simulationsPerMonth: 3 },
    STARTER: { projects: 10, simulationsPerMonth: 100 },
    PRO: { projects: null, simulationsPerMonth: 1000 }
};

function isPaidPlan(plan: string): plan is Exclude<PlanName, 'FREE'> {
    return plan === 'STARTER' || plan === 'PRO';
}

export async function getPlanUsage(prisma: PrismaClient, userId: string, now = new Date()) {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    let plan: PlanName = 'FREE';
    if (
        subscription
        && isPaidPlan(subscription.plan)
        && ['ACTIVE', 'TRIALING'].includes(subscription.status)
    ) {
        plan = subscription.plan;
    }
    const limits = PLAN_LIMITS[plan];
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [projects, simulations] = await Promise.all([
        prisma.project.count({ where: { userId } }),
        prisma.simulation.count({
            where: { project: { userId }, createdAt: { gte: monthStart } }
        })
    ]);

    return {
        plan,
        limits,
        usage: { projects, simulations },
        canCreateProject: limits.projects === null || projects < limits.projects,
        canRunSimulation: simulations < limits.simulationsPerMonth
    };
}

export function normalizePlan(value: string | null | undefined): PlanName {
    return value === 'STARTER' || value === 'PRO' ? value : 'FREE';
}
