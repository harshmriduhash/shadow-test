# ShadowTest

ShadowTest is an early-access SaaS for exploring product usability with
synthetic personas. Users create a project, choose a persona and task, and
receive a persisted, AI-generated walkthrough trace and friction summary.

## Product capabilities

- Clerk authentication and per-user project isolation.
- Project and persona management, simulation history, persisted reports, and
  report export.
- Read-only walkthroughs of public HTTPS pages, optionally informed by a public
  GitHub repository README.
- Durable Redis-backed simulation jobs, retry support, usage limits, and
  optional Stripe subscriptions.

Walkthroughs inspect page text and can follow same-host links. They do not
operate browser controls, submit forms, or modify target products. They are
synthetic evaluations, not a substitute for real user research or browser-based
end-to-end testing.

## Development and deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Vercel, Render, PostgreSQL, Clerk,
Anthropic, Redis, and optional Stripe setup. Each service has an `.env.example`
file; do not commit real environment files.
