###
## Remaining launch plan — roughly 35%
This is an estimate, not a precise project measurement. The code changes are pushed and targeted tests passed; the **backend is not deployed**, the documented API host returned 404, and database migration and live integrations remain unverified.

### Phase 1 — Deploy the backend to staging · ~8%

**Status:** deployment remains pending. The API now verifies a worker heartbeat
in addition to Redis connectivity, but Render/Vercel configuration and live
staging checks require deployment access and service credentials.

1. Create the Render services from the repository blueprint: API, AI service, worker, and Redis.
2. Set the required service configuration in Render’s environment settings—especially the shared internal key, AI key, database URLs, Clerk issuer, and service URLs. Don’t put secrets in source control or chat.
3. Set Vercel’s `API_SERVER_URL` to the actual deployed API origin ending in `/api`.
4. Deploy and check service logs and liveness endpoints.
**Pass when:** API and AI services are running, worker and Redis connect, and Vercel can reach the real API address.

### Phase 2 — Prepare and migrate staging PostgreSQL · ~7%

1. Provision a staging PostgreSQL database and configure its pooled and direct URLs.
2. Inspect the database’s current schema and Prisma migration status.
3. If it’s an existing database initialized outside Prisma migrations, verify its schema and baseline appropriately—don’t blindly replay the initial migration.
4. Apply migrations in staging and verify the new persona fields and simulation-event table exist.
5. Check the API’s `/health/ready` endpoint.
**Pass when:** migration status is clean and readiness confirms database connectivity and required schema. **Do not migrate production yet.**

### Phase 3 — Configure live integrations · ~8%

1. Configure Clerk for the production app origin; verify sign-in, session tokens, organization membership, and roles.
2. Configure Anthropic on both AI services and verify the worker can process a queued job.
3. Configure S3 credentials, bucket permissions, and Vercel-origin CORS; test upload, indexing, download, and deletion.
4. Configure Qdrant; test document indexing and project-scoped search.
5. Confirm Redis-backed jobs and retries behave correctly.
**Pass when:** the readiness checks report configured services as healthy, and each user-facing integration has a successful staging test. If S3 or Qdrant is intentionally excluded from launch, first make readiness and the UI accurately treat those features as unavailable rather than launch with false health reporting.

### Phase 4 — End-to-end and failure testing · ~7%
Run tests in staging with a test account:

1. Sign up/sign in, create a project, and select or edit a persona.
2. Run a simulation against a public test site; confirm safe tabs/disclosures and same-host links work.
3. Verify reports and evidence persist and appear in the dashboard.
4. Confirm blocked behavior: form submission, write requests, sign-in, purchases, popups, and off-host requests must not proceed.
5. Exercise document upload/search, organization permissions, pagination, report export, and failed-job retry.
6. Test useful failure behavior for unavailable AI, Redis, database, S3, or Qdrant.
**Pass when:** the staging run completes end to end, denied actions are blocked, and failures are clearly surfaced without corrupting data.

### Phase 5 — Production rollout and early-user gate · ~5%

1. Take a database backup and review migration/rollback steps.
2. Configure production URLs, Clerk origins, CORS, and all required secrets in hosting dashboards.
3. Deploy backend, verify migrations and `/health/ready`, then point Vercel at the production API.
4. Run a production smoke test with a non-sensitive test project.
5. Check logs, costs, and error rates; invite a small early-user group and monitor feedback before broad launch.
**Go/no-go:** hold launch if readiness is degraded, migrations are uncertain, Clerk permissions are incorrect, a simulation can mutate a target site, or reports/jobs fail to persist.

**Important boundary:** the simulation product remains limited to public pages and safe, non-mutating interactions. Login-only workflows and form-submission journeys are not part of this launch plan.