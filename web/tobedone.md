# Remaining launch work — approximately 35%

**This is a planning estimate, not a measured completion score.** The product
code and automated checks cover the core implementation, but ShadowTest is not
yet verified as a live service: the backend has not been deployed to staging,
database migration status is unconfirmed, and external integrations have not
passed live checks.

## Latest verified status — 2026-11-12

- API build and 19 API tests pass.
- Web lint and production build pass.
- AI-engine/worker test suite passes (33 tests). Its test output includes an
  expected S3-unavailable readiness diagnostic; this is not a live S3 check.
- Render blueprint parses and declares four services.
- The Render API endpoint checked during this review returns HTTP 404; there is
  no confirmed live backend to serve beta traffic.
- Required deployment credentials and integrations have not been verified.
  Automated tests do not substitute for a staging deployment, applied
  migrations, or real end-to-end checks.

**Conclusion:** the codebase is a tested beta candidate, not a working deployed
beta product yet. Keep the staging and production launch gates below open until
their pass conditions are verified against the actual services.

## Is the engine ready?

**The AI engine is implemented and locally testable, but it is not launch-ready
as a live service yet.** Its automated tests pass, but production readiness
depends on valid Anthropic credentials, the shared internal API key, Redis, a
running worker, and configured document services. The API's `/health/ready`
must return HTTP 200 after PostgreSQL migrations, Clerk, AI, Redis, worker,
S3, and Qdrant are all healthy. No live staging or production readiness result
has been confirmed.

The product's current interaction boundary is intentional: simulations cover
public HTTPS pages and safe, non-mutating interactions. They do not sign in,
submit forms, make purchases, or alter a target site's data.

## Before starting: prepare configuration safely

The repository-root `.env` is a **local configuration worksheet**. It is
gitignored and is not automatically loaded by the web, API, or AI service.
Never commit it or paste real secret values into issues, chat, logs, or
`NEXT_PUBLIC_*` variables.

1. Fill in the placeholders in the root `.env` as a private checklist.
2. Copy only the variables each service needs into its own local environment:
   - API: `api/.env`
   - AI service and worker: `ai-engine/.env`
   - Web: `web/.env.local`
   Preserve any existing local values when editing those files.
3. In staging and production, enter each value in the matching hosting
   provider's environment-variable settings instead of uploading `.env`.
4. Use different credentials for staging and production when the provider
   supports separate projects/keys. Rotate any key that has been exposed.

### Credential and configuration inventory

| Service/value | Required for | Where to obtain it |
|---|---|---|
| PostgreSQL pooled and direct URLs (`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`) | API and migrations | Database provider dashboard; for Render, [Render Dashboard](https://dashboard.render.com/) → PostgreSQL → Connect |
| Clerk publishable and secret keys | Web sign-in | [Clerk Dashboard](https://dashboard.clerk.com/) → your application → API keys. Publishable key is public; secret key is server-only. |
| Clerk issuer URL (and optional JWT audience) | API token validation/readiness | [Clerk Dashboard](https://dashboard.clerk.com/) → your application/JWT settings. Use the issuer for the same Clerk instance as the web keys. |
| `ANTHROPIC_API_KEY` | AI service and worker | [Anthropic Console](https://console.anthropic.com/settings/keys). Confirm billing and model access. |
| `INTERNAL_API_KEY` | API, AI service, and worker | Generate a private random secret, e.g. `openssl rand -hex 32`; set the exact same value on all three services. Render's blueprint can generate and share it. |
| `REDIS_URL` | API, AI service, and worker | Local development: local Redis URL. Staging/production: Render Redis connection string from the [Render Dashboard](https://dashboard.render.com/). |
| S3 bucket, region, access ID, secret (`AWS_*`) | API, AI service, and worker for document storage | Create a private bucket in [Amazon S3](https://console.aws.amazon.com/s3/) and least-privilege credentials/role in [AWS IAM](https://console.aws.amazon.com/iam/). Prefer a provider role over long-lived keys in production. |
| `QDRANT_URL`, `QDRANT_API_KEY` | AI service and worker for document vector search | Create a cluster and API key in [Qdrant Cloud](https://cloud.qdrant.io/). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `API_SERVER_URL` | Vercel web deployment | Clerk keys come from Clerk's API keys page; `API_SERVER_URL` is the deployed API origin ending in `/api`, shown by the [Render Dashboard](https://dashboard.render.com/). |
| Stripe secret, webhook secret, and price IDs | Optional billing | [Stripe API keys](https://dashboard.stripe.com/apikeys), [webhooks](https://dashboard.stripe.com/webhooks), and product/price settings. Use test-mode values for staging. |
| `GITHUB_TOKEN` | Optional access to private GitHub sources | [GitHub personal access tokens](https://github.com/settings/personal-access-tokens); grant only the needed repository read access. |

`NEXT_PUBLIC_CONTACT_EMAIL`, service URLs, allowed origins, AWS region, and
model name are configuration values, not API secrets. Stripe and GitHub access
are optional unless those features are part of the launch scope. S3 and Qdrant
are required for the currently implemented document upload/search experience
and for the existing API readiness gate.

## Phase 1 — Deploy a complete staging environment · approximately 8%

1. Create a separate staging PostgreSQL database and connect the repository to
   Render using the checked-in blueprint. It provisions the API, AI service,
   simulation worker, and Redis; provision PostgreSQL and external accounts
   separately.
2. Set the required environment variables on the right service:
   - **API:** database URLs, Clerk issuer, shared internal key, allowed web
     origin, app URL, AI service URL, Redis, and S3 configuration.
   - **AI service and worker:** shared internal key, Redis, Anthropic key/model,
     API URL, S3 configuration, and Qdrant endpoint/key.
   - **Vercel web:** Clerk publishable/secret keys, `API_SERVER_URL` ending in
     `/api`, and the optional contact email.
3. Enable Clerk Organizations if team workspaces are included in early access;
   allow the exact staging web origin in Clerk and the API.
4. Deploy the backend first, then configure and deploy the Vercel web app.
5. Check service logs and `/health` liveness endpoints.

**Pass when:** the deployed services start, the API can reach PostgreSQL and
Redis, the AI service can reach Anthropic, and the web app can reach the
deployed API. Do not copy production secrets into staging.

## Phase 2 — Verify and migrate staging PostgreSQL · approximately 7%

1. Confirm the pooled and direct database URLs point to staging, not production.
2. Back up the staging database and inspect its existing schema and Prisma
   migration history.
3. Apply migrations with the repository's deployment command:
   `cd api && npm run migrate:deploy`.
4. If the database was previously initialized with `prisma db push`, stop and
   verify the existing schema before baselining. Do not blindly replay the
   initial migration or mark it applied without checking the schema.
5. Confirm the required persona profile columns and `SimulationEvent` table
   exist; check migration status and API readiness.

**Pass when:** migrations are clean, expected schema is present, and the API's
database check passes. Do not migrate production as part of this phase.

## Phase 3 — Configure and verify external integrations · approximately 8%

1. **Clerk:** verify sign-in/sign-out, token issuer and audience, organization
   membership, invitations, and role-based project access with test users.
2. **Anthropic and worker:** enqueue a staging simulation; verify the worker
   heartbeat is present, the job is consumed, and its status, trace, and report
   persist.
3. **S3:** confirm private bucket access, exact-origin upload CORS, permissions,
   file-size/type validation, upload, indexing, download, and deletion.
4. **Qdrant:** index a test document and verify search results are scoped to
   its project; verify deletion removes associated vectors.
5. **Redis:** verify job dispatch, worker processing, abandoned-job recovery,
   rate limits, and cache behavior.
6. **Optional Stripe:** run a test checkout and verify webhook signature,
   subscription state, and cancellation/update handling.

**Pass when:** each enabled integration succeeds in staging and
`/health/ready` returns HTTP 200. If document upload/search is intentionally
out of scope, do not claim it works; readiness and UI behavior must instead be
changed and tested before launch.

## Phase 4 — End-to-end, safety, and failure testing · approximately 7%

Use a staging account and non-sensitive test data:

1. Sign up, create a project, create/edit a persona, and run a simulation on a
   public test site.
2. Confirm safe same-host links, tabs, and disclosure panels work; verify each
   trace step and report evidence persists and appears in the dashboard.
3. Verify blocked actions remain blocked: form submission, non-GET requests,
   sign-in, purchases, downloads, popups, cross-host requests, and unsafe
   navigation.
4. Test document upload/search, organization permissions, pagination,
   dashboard search, report export, and failed-job retry.
5. Exercise dependency failures (AI, Redis, database, worker, S3, Qdrant,
   Clerk) and confirm errors are surfaced without false success or corrupted
   records.
6. Review API/worker logs, rate limits, data retention/deletion, and expected
   cloud/model costs.

**Pass when:** core flows pass end to end, safety restrictions hold, and
failure behavior is understandable and recoverable. Record and fix any
launch-blocking defects before proceeding.

## Phase 5 — Production rollout and early-user gate · approximately 5%

1. Review staging results, known limitations, privacy/data handling, support
   contact, and incident/rollback procedure.
2. Back up production data and obtain explicit approval before applying
   production migrations. Verify the migration plan against the actual schema.
3. Configure production-only secrets, Clerk origins, CORS, service URLs,
   storage permissions, monitoring, and billing settings in provider dashboards.
4. Deploy the backend and worker; verify migrations and HTTP 200 from
   `/health/ready` before switching web traffic.
5. Set Vercel's production `API_SERVER_URL`, deploy, and run a smoke test with
   a non-sensitive test project.
6. Invite a small early-access cohort. Monitor job completion, errors, latency,
   spend, and user feedback; pause rollout if readiness degrades or data is
   lost.

**Go/no-go:** do not open early access while migrations are uncertain,
readiness is degraded, authentication/organization access is incorrect,
simulation safety restrictions fail, or jobs/reports do not persist.

## Launch completion checklist

- [ ] Staging API, AI service, worker, Redis, and web app are deployed.
- [ ] Staging database migrations are verified and API readiness is healthy.
- [ ] Clerk, Anthropic, S3, and Qdrant have passed live staging checks.
- [ ] Core user journeys, permissions, safety restrictions, and failure paths
      pass end-to-end testing.
- [ ] Production secrets and URLs are configured only in provider dashboards.
- [ ] Production migration, backup, rollback, monitoring, and early-user plan
      are reviewed.
- [ ] Production smoke test passes and the early-user cohort is monitored.

**Current boundary:** the engine evaluates public pages and performs safe,
non-mutating interactions. Login-only workflows and form-submission journeys
are not part of this launch scope.
