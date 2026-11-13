import { Router, type Request, type RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { z } from 'zod';
import { getPlanUsage, normalizePlan, type PlanName } from './plans';
import { requireSession } from './security';
import { ensureWorkspace, getWorkspaceId } from './tenant';

const prisma = new PrismaClient();
const billingRouter = Router();
const checkoutSchema = z.object({ plan: z.enum(['STARTER', 'PRO']) });

class BillingConfigurationError extends Error {}

function getStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new BillingConfigurationError('STRIPE_SECRET_KEY is not configured');
    return new Stripe(secretKey);
}

function asyncRoute(handler: (req: Request, res: Parameters<RequestHandler>[1]) => Promise<unknown>): RequestHandler {
    return (req, res, next) => {
        void handler(req, res).catch(error => {
            if (error instanceof BillingConfigurationError) {
                return res.status(503).json({ error: error.message });
            }
            next(error);
        });
    };
}

async function ensureUser(req: Request) {
    if (!req.auth) throw new Error('Authenticated user context is missing');
    await ensureWorkspace(prisma, req.auth);
    return prisma.user.findUniqueOrThrow({ where: { id: req.auth.userId } });
}

billingRouter.use(requireSession);

billingRouter.get('/subscription', asyncRoute(async (req, res) => {
    await ensureUser(req);
    if (!req.auth) throw new Error('Authenticated user context is missing');
    const organizationId = getWorkspaceId(req.auth);
    const plan = await getPlanUsage(prisma, organizationId);
    const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
    res.json({
        plan: plan.plan,
        limits: plan.limits,
        usage: plan.usage,
        status: subscription?.status || 'FREE',
        currentPeriodEnd: subscription?.currentPeriodEnd || null
    });
}));

billingRouter.post('/checkout', asyncRoute(async (req, res) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Select a supported subscription plan.' });

    const user = await ensureUser(req);
    if (!req.auth) throw new Error('Authenticated user context is missing');
    const organizationId = getWorkspaceId(req.auth);
    const stripe = getStripe();
    const priceId = process.env[`STRIPE_${parsed.data.plan}_PRICE_ID`];
    if (!priceId) return res.status(503).json({ error: `The ${parsed.data.plan} plan is not configured for checkout.` });

    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    let customerId = organization.stripeCustomerId;
    if (!customerId) {
        const customer = await stripe.customers.create({
            ...(user.email ? { email: user.email } : {}),
            metadata: { organizationId }
        });
        customerId = customer.id;
        await prisma.organization.update({ where: { id: organizationId }, data: { stripeCustomerId: customerId } });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard/settings?billing=success`,
        cancel_url: `${appUrl}/pricing?billing=cancelled`,
        metadata: { organizationId, plan: parsed.data.plan },
        subscription_data: { metadata: { organizationId, plan: parsed.data.plan } }
    });
    if (!session.url) return res.status(502).json({ error: 'Stripe did not return a checkout URL.' });
    res.json({ url: session.url });
}));

async function synchronizeSubscription(
    stripeSubscription: Stripe.Subscription,
    organizationId: string,
    requestedPlan: string | null | undefined
) {
    const plan: PlanName = normalizePlan(requestedPlan);
    const status = stripeSubscription.status === 'active'
        ? 'ACTIVE'
        : stripeSubscription.status === 'trialing'
            ? 'TRIALING'
            : stripeSubscription.status.toUpperCase();
    await prisma.subscription.upsert({
        where: { organizationId },
        create: {
            organizationId,
            stripeSubscriptionId: stripeSubscription.id,
            plan,
            status,
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
        },
        update: {
            stripeSubscriptionId: stripeSubscription.id,
            plan,
            status,
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
        }
    });
}

function organizationIdFromMetadata(metadata: Stripe.Metadata | null | undefined) {
    if (typeof metadata?.organizationId === 'string' && metadata.organizationId.length > 0) {
        return metadata.organizationId;
    }
    if (typeof metadata?.userId === 'string' && metadata.userId.length > 0) {
        return `personal_${metadata.userId}`;
    }
    return undefined;
}

export const stripeWebhookHandler: RequestHandler = (req, res, next) => {
    let stripe: Stripe;
    let event: Stripe.Event;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.header('stripe-signature');
    if (!webhookSecret || !signature || !Buffer.isBuffer(req.body)) {
        return res.status(400).json({ error: 'Stripe webhook configuration or signature is missing.' });
    }

    try {
        stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (error) {
        if (error instanceof BillingConfigurationError) {
            console.error(error.message);
            return res.status(503).json({ error: 'Billing is not configured.' });
        }
        return res.status(400).json({ error: 'Invalid Stripe webhook signature.' });
    }

    void (async () => {
        const existingEvent = await prisma.billingEvent.findUnique({ where: { eventId: event.id } });
        if (existingEvent) return res.json({ received: true, duplicate: true });

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const subscriptionId = typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription?.id;
            const organizationId = organizationIdFromMetadata(session.metadata);
            if (subscriptionId && organizationId) {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                await synchronizeSubscription(subscription, organizationId, session.metadata?.plan);
            }
        } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as Stripe.Subscription;
            const organizationId = organizationIdFromMetadata(subscription.metadata);
            if (organizationId) {
                const plan = event.type === 'customer.subscription.deleted' ? 'FREE' : subscription.metadata.plan;
                await synchronizeSubscription(subscription, organizationId, plan);
            }
        }

        await prisma.billingEvent.create({ data: { eventId: event.id, type: event.type } });
        return res.json({ received: true });
    })().catch(next);
};

export { billingRouter };
