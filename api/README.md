# ShadowTest API

The Express API authenticates Clerk bearer tokens, persists
projects/personas/simulations/reports with Prisma, enforces subscription
limits, and dispatches simulations to the AI service. Internal AI callbacks
require the shared `INTERNAL_API_KEY`; client-supplied user IDs are not trusted.

`/api/v1` is the canonical versioned API. JSON success responses use
`{ "data": ..., "requestId": "..." }`; errors use
`{ "error": { "code": "...", "message": "...", "requestId": "..." } }`.
The `X-Request-Id` header is accepted when it contains a bounded safe value;
otherwise the API creates a UUID. Existing unversioned `/api` routes remain
available during the client migration and retain their existing response
shape. The web proxy forwards request IDs and uses `/api/v1`.

## Local development

1. Copy `.env.example` to `.env` and set PostgreSQL, Clerk, and internal service
   values.
2. Install dependencies and generate Prisma Client:
   ```sh
   npm install
   npx prisma generate
   ```
3. Apply migrations:
   ```sh
   npm run migrate:deploy
   ```
4. Start the API:
   ```sh
   npm run dev
   ```
5. Run the API build and tests:
   ```sh
   npm test
   ```

The Redis URL is optional for local development; without it the rate limiter
uses its in-process store. Production startup requires Redis so rate limits are
shared across API instances.
