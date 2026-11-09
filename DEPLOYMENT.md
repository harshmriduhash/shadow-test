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

## 2. Deploy the web app to Vercel

1. Import the repository and set `web` as the Vercel root directory.
2. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for the
   production Clerk instance.
3. Optionally set `API_SERVER_URL` to the public Render API URL followed by
   `/api`. When omitted, the web app uses the Render URL assigned to the
   `shadowtest-api` service in `render.yaml`.
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
Never commit real `.env` files or place secret values in `NEXT_PUBLIC_*`
variables.

## Document search and team setup

1. Enable Organizations in Clerk. Members use the dashboard organization
   switcher; projects created while an organization is selected are visible to
   that organization's authenticated members. The Clerk organization profile
   handles invitations and membership.
2. Create a private S3 bucket and set `AWS_S3_BUCKET`, `AWS_REGION`,
   `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` on the API, AI service, and
   worker. Grant the key only `s3:GetObject`, `s3:PutObject`, and
   `s3:DeleteObject` for that bucket.
3. Configure bucket CORS to allow `POST` from the exact Vercel application
   origin. Uploads are limited to 10 MB PDF, Markdown, or plain-text files.
4. Create a Qdrant Cloud collection endpoint and set `QDRANT_URL` and
   `QDRANT_API_KEY` on the AI service and worker. The service creates its
   collection and embeds documents with FastEmbed on first use; the first
   indexing job downloads the embedding model.
5. Apply the new database migration during deployment. Existing installations
   must follow the migration-baselining warning above before enabling deploy
   migrations.

The web application defaults to `https://shadowtest-api.onrender.com/api`,
which is the public hostname Render assigns to the blueprint's `shadowtest-api`
service. If Render displays a different public API hostname, set
`API_SERVER_URL` in Vercel to that exact hostname plus `/api` and redeploy.

## 3. Optional billing setup

To enable paid plans, set `STRIPE_SECRET_KEY`, the Starter and Pro Stripe price
IDs, and `STRIPE_WEBHOOK_SECRET` on the API. Configure a Stripe webhook at
`https://<api-host>/api/billing/webhook` for checkout completion and subscription
update/deletion events. The app uses webhook events as the source of truth for
subscription status.

## 4. Verify the deployment

1. Check `/health` on both the API and AI service.
2. Sign in through Clerk and create a project with an optional public HTTPS
   product URL or public GitHub repository.
3. Create/select a persona, start a simulation, and confirm the worker processes
   it and the dashboard displays its persisted trace and report.
4. If billing is enabled, verify a test checkout and webhook delivery in Stripe.

Simulations are read-only page walkthroughs: they inspect public page text and
may follow same-host links. They do not operate browser controls, submit forms,
or change data on the target product.
