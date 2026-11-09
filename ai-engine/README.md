# ShadowTest AI service and worker

The FastAPI service validates product sources and accepts simulation jobs. Jobs
are placed on Redis and consumed by `worker.py`; the worker writes trace steps,
reports, and status changes through authenticated internal API routes. Redis
jobs left in the processing list after a worker interruption are returned to
the pending queue on worker startup.

Walkthroughs render public HTTPS pages in a fresh, isolated Chromium context.
They can follow safe same-host links and open accessible tabs and disclosure
panels. Form submission, non-GET requests, downloads, popups, cross-host
requests, unsafe navigation, sign-in, and purchase flows are blocked. The
worker pins the target hostname to a validated public IP for the browser
session. GitHub README access is also supported.

## Local development

1. Create and activate a Python environment, then install
   `requirements.txt`, then install Chromium with
   `python -m playwright install chromium`.
2. Copy `.env.example` to `.env` and set `API_URL`, the same
   `INTERNAL_API_KEY` as the API, `ANTHROPIC_API_KEY`, and `REDIS_URL`.
3. Run the API service and worker in separate terminals:
   ```sh
   uvicorn main:app --reload --port 8000
   python worker.py
   ```

The API can run without Redis only in development, where FastAPI background
tasks are used instead of the durable queue.
