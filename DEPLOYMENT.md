# ShadowTest deployment

ShadowTest consists of a Next.js web app, an authenticated API, a FastAPI
simulation service, a Redis queue and worker, PostgreSQL, Clerk, and Anthropic.
The root `render.yaml` provisions the API, simulation service, worker, and Redis
on Render. PostgreSQL, Clerk, Anthropic, Stripe, and the frontend are configured
separately.

## 1. Configure external services

1. Create a PostgreSQL database with a pooled connection URL and a direct
   connection URL. Set both `POSTGRES_PRISMA_URL` and
   `POSTGRES_URL_NON_POOLING` on the Render API service.
2. Configure Clerk sign-in and allowed providers in the Clerk dashboard. Set
   `CLERK_ISSUER_URL` on the API to the issuer for the same Clerk instance.
3. Create an Anthropic API key and set `ANTHROPIC_API_KEY` on both AI services.
   The Render blueprint sets the default model; change `ANTHROPIC_MODEL` if
   your account uses a different available model.
4. Connect the repository to Render and deploy the root blueprint. It generates
   one `INTERNAL_API_KEY` shared by the API, AI service, and worker, and connects
   all three services to the provisioned Redis instance.

The Render API service runs the checked-in Prisma migration before each
deployment. For an existing database that was previously initialized with
`prisma db push`, do not deploy the initial migration blindly: first verify the
database schema matches it and baseline the migration with Prisma's
`migrate resolve` command.

The blueprint pins the API and AI service ports to `4000` and `8000`. These
must agree with the private service URLs configured for API-to-AI calls and
AI/worker-to-API callbacks. If you change either port, update both the service
port and every corresponding internal URL together.

## 2. Deploy the web app to Vercel

1. Import the repository and set `web` as the Vercel root directory.
2. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for the
   production Clerk instance.
3. Set `API_SERVER_URL` to the public Render API URL followed by `/api`. Use
   the hostname shown by your deployed Render service; do not rely on an
   unverified fallback hostname.
   Set `NEXT_PUBLIC_CONTACT_EMAIL` to the mailbox that should receive contact
   inquiries; the contact form opens a prefilled email draft in the visitor's
   email client and does not send or store the message itself.
4. Add the deployed web origin to the API's `ALLOWED_ORIGINS` value, and set the
   same origin as the API's `APP_URL`.
5. Redeploy after setting environment variables. Dashboard API requests go
   through the authenticated same-origin Next.js proxy, avoiding browser CORS
   configuration. The API's `ALLOWED_ORIGINS` should still include the Vercel
   origin for any direct integrations.

See the service-specific `.env.example` files for local development variables.
The repository-root `.env` is a private configuration worksheet only; it is not
automatically loaded by the individual apps. Copy only the needed values into
`api/.env`, `ai-engine/.env`, and `web/.env.local`, or set them in the hosting
provider dashboards. Never commit real `.env` files or place secret values in
`NEXT_PUBLIC_*` variables.

## Document search and team setup

1. Enable Organizations in Clerk. Members use the dashboard organization
   switcher; projects created while an organization is selected are visible to
   that organization's authenticated members. The Clerk organization profile
   handles invitations and membership.
2. Create a private S3 bucket and set `AWS_S3_BUCKET`, `AWS_REGION`,
   `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` on the API, AI service, and
   worker. Grant the key `s3:GetObject`, `s3:PutObject`, and
   `s3:DeleteObject` on objects in that bucket, plus `s3:ListBucket` on the
   bucket itself for the readiness `HeadBucket` check.
3. Configure bucket CORS to allow `POST` from the exact Vercel application
   origin. Uploads are limited to 10 MB PDF, Markdown, or plain-text files.
4. Create a Qdrant Cloud collection endpoint and set `QDRANT_URL` and
   `QDRANT_API_KEY` on the AI service and worker. The service creates its
   collection and embeds documents with FastEmbed on first use; the first
   indexing job downloads the embedding model.
5. The API's Render pre-deploy command runs `prisma migrate deploy`. Before
   using it against a database previously initialized with `prisma db push`,
   inspect `prisma migrate status` and baseline the existing schema as
   documented above; do not mark a migration applied unless the schema has
   been verified.

## 3. Optional billing setup

To enable paid plans, set `STRIPE_SECRET_KEY`, the Starter and Pro Stripe price
IDs, and `STRIPE_WEBHOOK_SECRET` on the API. Configure a Stripe webhook at
`https://<api-host>/api/billing/webhook` for checkout completion and subscription
update/deletion events. The app uses webhook events as the source of truth for
subscription status.

## 4. Verify the deployment

1. Check `/health` on the API and AI service for process liveness. Then check
   `/health/ready` on the API. It performs live PostgreSQL, Redis, worker
   heartbeat, Clerk JWKS, AI-service, S3, and Qdrant checks and returns `200`
   only when all required checks pass; investigate each false check before
   enabling user traffic. A reachable Redis instance alone does not count as a
   healthy worker.
2. Sign in through Clerk and create a project with an optional public HTTPS
   product URL or public GitHub repository.
3. Create/select a persona, start a simulation, and confirm the worker processes
   it and the dashboard displays its persisted trace and report.
4. If billing is enabled, verify a test checkout and webhook delivery in Stripe.

Simulations run in an isolated Chromium browser. They can follow safe
same-host public links and open accessible tabs and disclosure panels. The
worker blocks form submissions, non-GET requests, downloads, popups,
cross-host requests, and unsafe navigation; it does not sign in, make
purchases, or alter target-product data.
