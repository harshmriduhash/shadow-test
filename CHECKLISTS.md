# ShadowTest: Operational Checklists

## 🚀 LAUNCH_CHECKLIST
- [ ] Connect custom domain to Vercel (e.g., app.shadowtest.ai).
- [ ] Set Clerk Production keys (switch from `test_` to `live_`).
- [ ] Scale Render API to at least 2 instances for high availability.
- [ ] Verify SSL certificates on all endpoints.
- [ ] Final end-to-end simulation test on a live production site.

## 🛠️ PRODUCTION_CHECKLIST
- [ ] Monitor Anthropic usage quotas to prevent simulation interruption.
- [ ] Review Postgres database backup frequency (Vercel automatic).
- [ ] Set up Sentry or Logtail for real-time error tracking.
- [ ] Audit Clerk logs for unauthorized access attempts.
- [ ] Perform monthly cost allocation review (AI tokens vs. MRR).

## ⚙️ EXECUTION_CHECKLIST
- [ ] Trigger simulation via API/Dashboard.
- [ ] AI Engine: Confirm scraping context is correctly captured.
- [ ] API: Validate state transition from `PENDING` to `RUNNING`.
- [ ] UI: Verify live reasoning traces are streaming to the dashboard.
- [ ] Report: Auto-generate PDF summary for the user once complete.

## 🏁 MVP_LAUNCH_CHECKLIST
- [ ] Core loop: One persona + 3 minute autonomous traversal.
- [ ] Basic dashboard: List simulations and view traces.
- [ ] User Auth: Working Clerk login/signup.
- [ ] Landing Page: High-converting value proposition.
- [ ] Feedback Button: Direct line to founder for beta users.

## ✅ READY_CHECKLIST
- [ ] Local `.env` verified and synchronized with Vercel.
- [ ] Prisma schema pushed and client generated.
- [ ] AI Engine responds to health-check.
- [ ] Web app builds successfully in production mode.
- [ ] Remote Git is pushed and synced with `shadow-test` repo.
