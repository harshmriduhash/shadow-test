# Deployment Guide 🚀

ShadowTest is designed to be deployed across three main platforms for optimal performance and cost-efficiency.

## 1. Database (Neon or Supabase)
ShadowTest requires a PostgreSQL database. We recommend **[Neon](https://neon.tech/)** for its serverless capabilities or **[Supabase](https://supabase.com/)**.

1. Create a new PostgreSQL project.
2. Copy the **Connection String** (e.g., `postgresql://user:password@hostname/dbname?sslmode=require`).
3. You will use this as `DATABASE_URL` in both the Backend and Frontend.

---

## 2. API & AI Engine (Render)
We use **[Render](https://render.com/)** to host the compute-intensive parts of the application. The repository includes a `render.yaml` file for automated setup.

1. Connect your GitHub repository to Render.
2. Render will automatically detect the `render.yaml` file.
3. **Configure Environment Variables** in the Render Dashboard:
   - **shadowtest-api**:
     - `POSTGRES_PRISMA_URL`: Your Vercel Postgres connection pooling URL.
     - `POSTGRES_URL_NON_POOLING`: Your Vercel Postgres direct connection URL.
   - **shadowtest-ai-engine**:
     - `ANTHROPIC_API_KEY`: Your Anthropic API key.
     - `API_URL`: The URL of your `shadowtest-api` service.

---

## 3. Frontend (Vercel)
**[Vercel](https://vercel.com/)** is the standard for Next.js applications.

1. Import the repository into Vercel.
2. Select the `apps/web` directory as the **Root Directory**.
3. **Configure Environment Variables**:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: From your Clerk Dashboard.
   - `CLERK_SECRET_KEY`: From your Clerk Dashboard.
   - `NEXT_PUBLIC_API_URL`: The URL of your Render API service + `/api` (e.g., `https://shadowtest-api.onrender.com/api`).
   - `POSTGRES_PRISMA_URL`: Automatically added by Vercel Postgres.
   - `POSTGRES_URL_NON_POOLING`: Automatically added by Vercel Postgres.

---

## 4. Production Verification
Once deployed, verify the connection:
1. Visit your Vercel URL.
2. Sign in (or use mock credentials if configured).
3. Create a project and launch a simulation.
4. Check the "Live Trace" to ensure the frontend is communicating with the Render API and the AI Engine.

---

## Troubleshooting
- **CORS Errors**: Ensure the `API_URL` in the frontend matches the allowed origins in the backend `cors` configuration (in `apps/api/src/index.ts`).
- **AI Engine Timeouts**: If the simulation takes more than 30 seconds, ensure your Render plan allows for long-running requests or use a background worker (Render's "Web Service" usually handles this, but "Free" tiers might spin down).
