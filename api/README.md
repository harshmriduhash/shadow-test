# ShadowTest API

The Express API authenticates Clerk bearer tokens, scopes product data to the
authenticated user, persists projects/personas/simulations/reports with Prisma,
enforces subscription limits, and dispatches simulations to the AI service.
Internal AI callbacks require the shared `INTERNAL_API_KEY`; client-supplied
user IDs are not trusted.

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

The Redis URL is optional for local development; without it the rate limiter
uses its in-process store. Production startup requires Redis so rate limits are
shared across API instances.
