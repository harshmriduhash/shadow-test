const test = require('node:test');
const assert = require('node:assert/strict');
const {
    canManageTenantProject,
    ensureWorkspace,
    getWorkspaceId,
    projectScopeWhere
} = require('../dist/tenant.js');

test('users without an active Clerk organization receive a stable personal workspace', () => {
    assert.equal(getWorkspaceId({ userId: 'user_123' }), 'personal_user_123');
});

test('organization identity takes precedence over the personal workspace', () => {
    assert.equal(
        getWorkspaceId({ userId: 'user_123', organizationId: 'org_456' }),
        'org_456'
    );
});

test('tenant query scope matches exactly one organization', () => {
    assert.deepEqual(projectScopeWhere('org_456'), { organizationId: 'org_456' });
});

test('personal workspace management is limited to its owner and workspace', () => {
    const identity = { userId: 'user_123' };
    assert.equal(
        canManageTenantProject(identity, { userId: 'user_123', organizationId: 'personal_user_123' }),
        true
    );
    assert.equal(
        canManageTenantProject(identity, { userId: 'user_999', organizationId: 'personal_user_123' }),
        false
    );
    assert.equal(
        canManageTenantProject(identity, { userId: 'user_123', organizationId: 'org_456' }),
        false
    );
});

test('organization project management requires a verified owner or admin role', () => {
    const project = { userId: 'user_123', organizationId: 'org_456' };
    assert.equal(
        canManageTenantProject(
            { userId: 'user_123', organizationId: 'org_456', organizationRole: 'org:owner' },
            project
        ),
        true
    );
    assert.equal(
        canManageTenantProject(
            { userId: 'user_789', organizationId: 'org_456', organizationRole: 'org:admin' },
            project
        ),
        true
    );
    assert.equal(
        canManageTenantProject(
            { userId: 'user_789', organizationId: 'org_456', organizationRole: 'org:member' },
            project
        ),
        false
    );
    assert.equal(
        canManageTenantProject(
            { userId: 'user_789', organizationId: 'org_other', organizationRole: 'org:owner' },
            project
        ),
        false
    );
});

test('workspace synchronization persists organization membership from verified identity claims', async () => {
    const calls = [];
    const prisma = {
        user: {
            upsert: async args => calls.push(['user', args])
        },
        organization: {
            upsert: async args => {
                calls.push(['organization', args]);
                return { deletedAt: null };
            }
        },
        membership: {
            upsert: async args => calls.push(['membership', args])
        }
    };

    const result = await ensureWorkspace(prisma, {
        userId: 'user_123',
        email: 'user@example.test',
        organizationId: 'org_456',
        organizationName: 'Example team',
        organizationRole: 'org:admin'
    });

    assert.deepEqual(result, {
        userId: 'user_123',
        organizationId: 'org_456',
        role: 'org:admin'
    });
    assert.equal(calls[0][1].where.id, 'user_123');
    assert.deepEqual(calls[1][1].create, {
        id: 'org_456',
        name: 'Example team',
        isPersonal: false
    });
    assert.deepEqual(calls[2][1].create, {
        organizationId: 'org_456',
        userId: 'user_123',
        role: 'org:admin'
    });
});

test('workspace synchronization makes a user the owner of their personal workspace', async () => {
    let organizationCreate;
    let membershipCreate;
    const prisma = {
        user: { upsert: async () => undefined },
        organization: {
            upsert: async args => {
                organizationCreate = args.create;
                return { deletedAt: null };
            }
        },
        membership: {
            upsert: async args => {
                membershipCreate = args.create;
            }
        }
    };

    const result = await ensureWorkspace(prisma, { userId: 'user_123' });

    assert.equal(result.organizationId, 'personal_user_123');
    assert.equal(result.role, 'org:owner');
    assert.deepEqual(organizationCreate, {
        id: 'personal_user_123',
        name: 'Personal workspace',
        isPersonal: true
    });
    assert.deepEqual(membershipCreate, {
        organizationId: 'personal_user_123',
        userId: 'user_123',
        role: 'org:owner'
    });
});
