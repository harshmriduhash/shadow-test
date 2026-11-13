import type { PrismaClient } from '@prisma/client';

export interface TenantIdentity {
    userId: string;
    email?: string;
    organizationId?: string;
    organizationName?: string;
    organizationRole?: string;
}

export function getWorkspaceId(identity: TenantIdentity): string {
    return identity.organizationId || `personal_${identity.userId}`;
}

function membershipRole(identity: TenantIdentity): string {
    if (!identity.organizationId) return 'org:owner';
    if (
        identity.organizationRole === 'org:owner'
        || identity.organizationRole === 'org:admin'
        || identity.organizationRole === 'org:member'
        || identity.organizationRole === 'org:viewer'
    ) {
        return identity.organizationRole;
    }
    return 'org:viewer';
}

export function getWorkspaceRole(identity: TenantIdentity): string {
    return membershipRole(identity);
}

export function canRunTenantSimulation(identity: TenantIdentity): boolean {
    return ['org:owner', 'org:admin', 'org:member'].includes(membershipRole(identity));
}

export function canManageTenant(identity: TenantIdentity): boolean {
    return ['org:owner', 'org:admin'].includes(membershipRole(identity));
}

export function projectScopeWhere(organizationId: string) {
    return { organizationId };
}

export function canManageTenantProject(
    identity: TenantIdentity,
    project: { userId: string; organizationId: string }
): boolean {
    if (project.organizationId !== getWorkspaceId(identity)) return false;
    if (!identity.organizationId) return project.userId === identity.userId;
    return identity.organizationRole === 'org:admin' || identity.organizationRole === 'org:owner';
}

export async function ensureWorkspace(prisma: PrismaClient, identity: TenantIdentity) {
    const organizationId = getWorkspaceId(identity);
    const isPersonal = !identity.organizationId;

    await prisma.user.upsert({
        where: { id: identity.userId },
        create: { id: identity.userId, ...(identity.email ? { email: identity.email } : {}) },
        update: identity.email ? { email: identity.email } : {}
    });

    await prisma.organization.upsert({
        where: { id: organizationId },
        create: {
            id: organizationId,
            name: identity.organizationName || (isPersonal ? 'Personal workspace' : 'Workspace'),
            isPersonal
        },
        update: identity.organizationName ? { name: identity.organizationName } : {}
    });

    const role = membershipRole(identity);
    await prisma.membership.upsert({
        where: { organizationId_userId: { organizationId, userId: identity.userId } },
        create: { organizationId, userId: identity.userId, role },
        update: { role }
    });

    return { userId: identity.userId, organizationId, role };
}
