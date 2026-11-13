# ShadowTest PRD v3 — Phase-by-Phase Delivery Plan

## 1. Purpose and how to use this plan

This roadmap converts all five ShadowTest PRD v3 documents into an implementation sequence with explicit dependencies, deliverables, verification, and release gates. It is a plan, not a claim that the work or launch evidence already exists.

The sequence aims to reach the PRD's stated first-public-launch bar: **Level 1 fully cleared and Level 2 substantially underway**. Scale and enterprise work is separated into later, demand-triggered phases rather than being treated as a prerequisite to an honest early beta.

### Delivery rules

1. Keep a requirement-to-test trace for every P0/P1 acceptance criterion.
2. Do not mark a feature complete because a route, screen, or service exists; verify the user outcome end-to-end.
3. Before implementation, resolve cross-document contract conflicts in Phase 0 and record decisions as ADRs.
4. For every engineering phase: run its focused tests, then its required regression suite; if green, commit and push that phase. Do not push a phase as complete when its acceptance gate is failing.
5. Promote through local → CI/preview → staging → production. Use feature flags and reversible migrations for risky changes.
6. Handle live-site simulation only on customer-authorized targets. Use disposable, customer-provisioned test accounts; never use real end-user credentials or real payment flows. Keep browser egress restricted to the approved project domains.
7. Label claims as implemented, tested, or measured; do not use those terms interchangeably.

### Current baseline to carry into execution

Prior repository review found useful foundations, but not proof of PRD completion:

- The API, Prisma models, projects/personas/simulations/reports, structured AI output, Playwright, Redis-backed worker, CSV export, report-share links, Stripe checkout/webhooks, responsive UI work, deployment configuration, and a guarded load-test harness exist in some form.
- The engine remains narrower than the PRD: it is not yet a complete plan-budgeted Observe→Interpret→Decide→Act→Outcome product flow and does not complete authenticated or form-based tasks.
- The current queue uses Redis lists and the UI polls; this differs from the PRD's BullMQ/WebSocket contract.
- Data and quota models are principally user-scoped, rather than the PRD's organization-scoped model. PDF export, trace-linked report findings, complete billing lifecycle, and several account/admin workflows remain incomplete or unproven.
- Load, uptime, backup-restore, cross-tenant, AI quality, and browser/accessibility targets have not been demonstrated by production-like evidence.

Reconfirm this baseline at Phase 0 against the actual branch before assigning work. Preserve existing behavior where it meets the approved contract; migrate only where the agreed decisions require it.

## 2. Decisions required before broad implementation

These are blocking product/architecture decisions, not implementation details to silently guess.

| Decision | PRD/repository mismatch | Phase 0 output |
|---|---|---|
| Launch engine and pricing | Part 4 estimates roughly $0.60 per real-agent run versus roughly $0.02 for a lightweight run. Part 1 pricing and caps differ from Part 5 ADR-003 pricing proposals and their implied run economics. | Select launch engine mode, model/step limits, plan prices/caps, gross-margin guardrails, and customer-facing claims in one approved unit-economics sheet. |
| Tenant and billing boundary | PRD specifies Organization, Membership, and UsageRecord with organization-scoped roles, data, quotas, and subscriptions; current implementation is largely user-scoped. | Approve the tenant model, Clerk organization mapping, role/ownership rules, migration/backfill, and how existing users become organizations. |
| API contract | PRD specifies `/api/v1`, cursor pagination, defined response envelopes and route names; existing app/API surfaces use unversioned paths and different frontend paths. | Approve canonical public/internal API routes, compatibility/deprecation policy, error format, auth, pagination, and generated/client types. |
| Queue and progress updates | PRD describes BullMQ and WebSocket progress; implementation uses a custom Redis-list worker and polling. | Decide whether to adopt BullMQ + WebSocket/SSE or formally revise the PRD contract. Specify retries, idempotency, cancellation, visibility timeout, and dead-letter/recovery behavior. |
| Report/export/share behavior | Existing CSV/share foundations do not resolve PRD PDF export, trace-step navigation, share revocation/expiry, or deletion behavior. | Approve report formats, generation limits, share-token lifecycle, public-view fields, and what happens to shared reports after project/account deletion. |
| Feature scope completeness | Part 1 §6 claims eight P0/P1 features are fully specified, but the document contains seven detailed feature specifications: Project Creation, Persona Library, Task Builder, Simulation Engine, Live Trace Viewer, Reports & Export, and Billing & Plan Management. This count itself needs reconciliation. | Reconcile the claimed count with the feature map; identify any missing P0/P1 feature(s), define owner, behavior, edge/loading/error states, acceptance criteria, analytics, permissions, and priority. |
| Market and KPI assumptions | Part 1 explicitly says no structured interviews have been run; positioning/pricing and KPI targets need real validation. | Schedule 10–15 structured interviews; define activation, successful simulation, retained organization, funnel, and business KPI calculations. Record hypotheses that remain unvalidated. |
| Launch SLO definitions | Product goals mentioned in the ongoing launch work include 100 concurrent users, under-3-second simulation steps, under-30-second report generation, and 99% uptime. The measurement windows, percentile, eligible workload, and exclusions must be explicit before they can be launch gates. | Publish an SLO sheet defining workload, percentile/window, error budget, report timing boundaries, what a “step” measures, and whether these are beta targets or contractual promises. |

**Exit gate:** decisions are recorded in ADRs/product notes, the P0/P1 inventory is complete, and each measurable target has a reproducible measurement definition. Until then, use test doubles or reversible prototypes, not a broad irreversible migration.

**Confirmed direction (user instruction: follow the newest PRDs where they agree):**

- Organization-scoped projects, memberships, roles, quotas, and billing; migrate each existing user to a personal organization while preserving project ownership.
- BullMQ on Redis and WebSocket progress, as stated by Part 5 ADR-001 and Part 2 §9; retain compatibility until clients have migrated.
- `/api/v1` as the canonical API with an explicit compatibility period for current routes.
- The genuine guarded browser loop; only public pages or explicitly provisioned disposable test accounts, with no purchases or destructive actions.
- Pricing is phase-gated by engine cost. Because Part 1 prices/caps conflict with Part 5 ADR-003 and the real-agent caps are not specified, keep paid launch disabled until costs and caps are measured and approved.
- Revoke report-share links immediately when a project/account is deleted; retain internal data only during the approved recovery window.

## 3. Phased roadmap

### Phase 0 — Product contract, evidence baseline, and architecture decisions

**Outcome:** a single approved product contract and a traceable starting point. This phase reduces rework across the rest of the roadmap.

**Work**

- Re-audit the current branch against Parts 1–5. Tag each requirement `done and evidenced`, `implemented but unverified`, `partial`, `missing`, `deferred`, or `needs decision`.
- Resolve all seven decisions above; produce ADRs for tenant model, API/versioning, queue/progress, AI mode/provider/cost ceiling, and report-sharing/deletion.
- Reconcile the Part 1 P0/P1 feature count and write acceptance criteria for every P0 and launch-critical P1.
- Conduct the 10–15 interviews called for by Part 1 §1.1. Capture current validation workflow, willingness to pay, buying trigger, trust objections, and evidence that changes positioning or persona assumptions.
- Verify secondary competitor claims with citations and separate observations from assumptions; refresh the product's `/security` and marketing claims to match actual practices.
- Define the KPI dictionary and instrumentable events: activation, first value, weekly active simulations per paying organization, completion/abandonment, usage, retention, conversion, and cost per successful simulation.
- Curate the 15–20-site AI evaluation golden set with documented issues and ground-truth terminal states. Confirm lawful/authorized test access and safe test-account availability.
- Define a dependency map, migration plan, feature-flag strategy, test data policy, and named owner for every phase deliverable.
- Establish the public-vs-authenticated route inventory and map the PRD's paths to current routes with redirects or compatibility decisions.

**Verification / exit criteria**

- Review sign-off on pricing/plan caps and AI-mode economics before launching paid plans.
- Every P0 and launch-critical P1 has user story, permission rules, success/failure states, analytics, and measurable acceptance criteria.
- All contracts and open items have an owner and decision date; no ambiguous item silently blocks a later phase.
- The KPI definitions and interview notes are recorded without overstating market validation.
- The golden set has known issues and expected outcomes, not merely a list of URLs.

**PRD coverage:** Part 1 §§0–5, §6 inventory, §6.1 priorities, §7 lifecycle assumptions; Part 5 §§80–81, §§86–88, §§94–98.

---

### Phase 1 — Secure platform foundation: tenancy, API, data, and jobs

**Outcome:** a tenant-safe, observable platform contract on which the full user experience and simulation engine can rely.

**Work**

1. **Tenant model and data**
   - Add/complete Organization, Membership, UsageRecord, and organization-scoped Subscription/API-key/audit relationships in Prisma.
   - Make every tenant-owned record and repository access path explicitly organization-scoped. Centralize tenant-aware query helpers and forbid client-supplied tenant/user IDs as authorization.
   - Plan and run safe data migration/backfill for existing users/projects; preserve history and provide rollback/forward-fix procedures.
   - Add constraints and indexes for org ownership, quota-period uniqueness, project/status queries, ordered trace retrieval, and audit events.
   - Implement seeded default personas, soft deletion, 30-day retention, export/delete lifecycle hooks, and scheduled hard deletion.
   - Keep query access patterns efficient; add slow-query visibility and migration expand/contract practices.

2. **Identity, authorization, and API**
   - Verify Clerk JWTs on every protected API request; implement organization-scoped Owner/Admin/Member/Viewer checks and staff-only admin authorization.
   - Implement the agreed API route/version contract, standard success/error envelope, request IDs, cursor pagination, and route-level rate limits.
   - Cover the required project/persona/simulation/trace/report/billing/account endpoints, including the formerly missing project detail, project personas, and simulation steps routes.
   - Add validation at boundaries, safe error responses, input/output limits, idempotency keys, and compatibility tests for existing frontend callers.
   - Protect internal AI-engine callbacks with service authentication; verify Stripe/Clerk webhook signatures.

3. **Abuse prevention and browser/network boundary**
   - Add signup/login bot protection, progressive auth abuse throttles, per-IP/user/org rate limits, concurrent-run limits, and atomic organization quota enforcement.
   - Configure explicit CORS origins, CSP/security headers, URL normalization and SSRF protections for project URL/repo validation.
   - Enforce per-simulation browser domain allowlists, redirect checks, private-network/IP blocking, and safe DNS/egress handling.
   - Keep API keys and provider credentials server-side; redact secrets from logs and browser/client bundles.

4. **Queue, reliability, and shared services**
   - Implement the Phase 0 queue decision. Define job states and transitions, retries with backoff/jitter, idempotent enqueue/completion, cancellation semantics, timeouts, worker concurrency, dead-letter recovery, and queue health.
   - Implement a progress channel consistent with the decision (WebSocket/SSE or documented polling) and reconnect/replay behavior.
   - Centralize transient error classification, dependency timeouts, graceful degradation, and safe retry policy. Avoid retrying non-idempotent operations without a key.
   - Implement caching only for approved data with TTL/invalidation; keep quota enforcement authoritative and concurrency-safe.
   - Add object storage controls for generated exports (private by default, short-lived signed URLs), and search indexing/query authorization.

**Verification / exit criteria**

- Unit and integration coverage for RBAC, quotas under concurrent requests, API schema/contracts, idempotency, webhook verification, URL validation, and soft delete.
- Cross-tenant negative tests for every resource family: Org A cannot read, mutate, enumerate, export, or infer Org B records through guessed IDs or search.
- Migration tested on a production-like sanitized snapshot; rollback/forward procedure documented and verified.
- Queue failure-injection tests cover duplicate enqueue, worker crash, provider timeout, cancellation, retry exhaustion, and report-job recovery.
- Security checks prove unapproved CORS origins and blocked network destinations are rejected.
- OpenAPI/API contract is published for the web and AI-engine clients.

**Push gate:** migration, API, security, and queue suites pass in CI; staging smoke test passes. Commit and push the phase, retaining a rollback point.

**PRD coverage:** Part 3 §§19–37 and §82; Part 5 §§53–58, §§65–68, §§73, §§80–81.

#### Phase 1 release gates

Phase 1 will be delivered as independently testable, pushed increments. Each increment has its own focused gate; Phase 1 is not complete until all four are green.

| Increment | Scope | Current status |
|---|---|---|
| 1A — Versioned API contract | `/api/v1` compatibility surface, request IDs, response/error envelopes, frontend proxy/client migration, regression tests | Tested and pushed as `e89ba65` to `feature/prd-v3-phase-1-foundation`. |
| 1B — Organization data and isolation | Organization/Membership/UsageRecord schema and backfill; workspace membership synchronization; strict tenant-scoped queries; cross-tenant tests | Implemented and validated on `feature/prd-v3-phase-1-foundation`; Prisma schema validated; tenancy migration applied to the confirmed disposable database and verified with legacy fixtures in an isolated database; API suite passes 34/34. |
| 1C — Authorization, quotas, and integration hardening | Org roles and plan entitlements; atomic quotas; URL/browser boundary; CORS, secrets, webhook, and API security tests | Organization-scoped subscription/usage reads and atomic project/simulation quota enforcement are implemented and covered by unit tests as foundation work. Full route-level RBAC, browser/network boundary, CORS, and security integration gates remain pending. |
| 1D — Async simulation queue and progress | BullMQ worker lifecycle, retries/cancellation/recovery/idempotency, WebSocket progress, worker health and staging verification | Pending |

An increment may be pushed after its own gate; do not label Phase 1 complete or promote it to production until all four increments satisfy the Phase 1 exit criteria above.

---

### Phase 2 — Complete customer-facing flows and design system

**Outcome:** a new user can reach a useful first report and a returning user can continue work without dead ends.

**Work**

- Implement the public information architecture: landing, features, pricing, security, changelog, blog/docs/contact as committed to in the Phase 0 scope. Server-render marketing pages with unique metadata, canonical URLs, sitemap/robots rules, social cards, and accessible content.
- Complete auth and recovery routes: signup/sign-in, email verification, password reset, SSO callback if selected, clear retry and error states, and post-signup redirect into onboarding rather than an empty dashboard.
- Complete guided onboarding: validated project URL/repo (either or both; never neither), reachability feedback, persona selection/custom persona entitlement, task authoring/suggestions, queued first simulation, live progress, and inline first report.
- Complete the returning-user dashboard: recent runs, friction trend, activation checklist when incomplete, organization context, command-palette search, filtering/sorting, breadcrumbs, and navigable empty/loading/error/success states.
- Complete project, persona, task, simulation, and report list/detail/settings pages per the approved route map. Preserve project/persona/simulation lineage and useful back navigation.
- Complete profile/security/team/billing/API-key/notification/danger-zone settings as their APIs become available; show role and plan permissions accurately.
- Implement all cross-cutting UX states from Part 2 and Part 5: skeletons, empty states, inline validation, specific service errors, timeout/retry, partial/degraded output, 404/500/status, pending jobs, canceled jobs, and success confirmations.
- Apply the design system and brand/copy rules consistently. Implement motion only where it improves comprehension and honor `prefers-reduced-motion`.
- Validate mobile layouts, especially onboarding, navigation, project/task forms, and the Live Trace Viewer; cover current supported browser matrix.
- Meet WCAG 2.1 AA for key flows: keyboard-only use, focus order/visibility, accessible labels/errors, contrast, dialogs, status announcements, and reduced motion.
- Add analytics instrumentation only after the Phase 0 event dictionary is approved; ensure analytics does not leak secrets or sensitive page content.

**Verification / exit criteria**

- Playwright E2E proves fresh-user signup → onboarding → project → persona → task → first simulation → report, including each documented failure/recovery path.
- Playwright E2E proves returning login, recent activity, project navigation, and report deep link behavior.
- Responsive visual checks at agreed mobile/tablet/desktop sizes, including Live Trace Viewer.
- Keyboard and screen-reader smoke tests; automated accessibility checks are clean for launch-critical routes; any exception has an owner and explicit waiver.
- SEO metadata and Core Web Vitals are validated on deployed public pages, not inferred from source.
- Event tests verify expected lifecycle events fire once and no sensitive content is collected.

**Push gate:** frontend lint/typecheck/build, relevant API integration tests, E2E, and accessibility checks pass. Commit and push the phase.

**PRD coverage:** Part 1 §7; Part 2 §§8–18; Part 5 §§46, §§51–52, §61, §§75–76.

---

### Phase 3 — Real, bounded AI simulation engine

**Outcome:** simulations execute real browser actions, produce reproducible evidence, and remain within approved safety, quality, latency, and cost limits.

**Work**

1. **Agent loop and job lifecycle**
   - Implement Observe → Interpret → Decide → Act → Outcome in the isolated worker, with a plan-tier budget and structured action schema (`click`, `fill`, `scroll`, `navigate`, `complete`, `abandon`).
   - Validate every model decision against a strict schema; remove regex/string-splitting model-output parsing.
   - Capture the actual observed state and browser outcome per step. Store ordered trace events with timestamps, action/result, grounded target, model/prompt version, and cost metadata.
   - Expose pause/cancel/retry and terminal outcomes; exhaustion of a step budget becomes an explicit abandon/incomplete result, not a fabricated success.
   - Use disposable, customer-provisioned test identities only when login tasks are enabled. Do not accept real-user passwords, reuse production sessions, or perform purchases/irreversible actions.

2. **Browser sandbox and guarded interaction**
   - Run Playwright in an isolated, resource/time-limited environment with domain allowlisting, restricted network egress, safe redirect handling, download controls, and per-run cleanup.
   - Make interaction permissions explicit per project/task. Support only intentionally authorized actions; exclude real payments, destructive actions, PII submission, and unapproved external domains.
   - Treat page text, hidden content, HTML comments, screenshots, and retrieved repository content as untrusted data. Apply prompt-injection test cases and anomaly detection before executing actions.
   - Store test credentials in a dedicated secret mechanism, masked from logs/traces/model context except the narrowly scoped fill operation needed for the approved test; never return credential values in reports.

3. **Model gateway, context, and retrieval**
   - Add a provider/model gateway with configuration-based routing, centralized timeouts/retries, hard token/step/cost ceilings, structured response validation, and controlled degraded mode.
   - Implement project context ingestion for README/repo summaries and supplied documents. Chunk by logical section, embed, retrieve once at run start, and isolate retrieval by organization/project.
   - Define refresh behavior on repo updates, stale-context indicators, Qdrant-unavailable fallback, and retention/deletion propagation.
   - Keep cross-run personal memory out of scope; distinguish ephemeral simulation trace from project context and future aggregate, anonymized friction data.

4. **Evaluation, observability, and spend**
   - Build the 15–20-case golden suite with expected terminal state and documented friction issues.
   - Measure task-completion accuracy, friction precision/recall, grounding rate, step efficiency, schema failure rate, run latency, and cost by plan/model.
   - Version prompts and models; make golden-set regression a required gate for prompt/model changes.
   - Log structured, request-correlated step metadata and bounded/redacted content only. Define retention and access controls for screenshots/page captures.
   - Review a sample of customer runs manually during early beta; record false positives, missed issues, and prompt/model changes.

**Verification / exit criteria**

- Deterministic unit tests for action schema, state machine, budgets, cost ceiling, terminal outcomes, permission checks, and retry behavior.
- Browser integration tests on controlled test sites for navigation, scrolling, safe filling, completion/abandonment, unreachable site, timeout, malformed model output, and cancellation.
- Prompt-injection suite covers hidden text, comments, off-screen content, malicious redirects, and attempts to induce prohibited actions; no protected action executes.
- Tenant/project RAG isolation tests prove retrieval cannot cross organization boundaries.
- Golden-set baseline and minimum acceptable quality thresholds are approved in Phase 0; regression results are attached to each prompt/model change.
- Cost per simulation and upper bound are measured; pricing/plan caps reflect the selected model mode.
- Product claims match the verified action set and tested quality; no claim of authenticated testing until a secure disposable-account flow is verified.

**Push gate:** AI unit/integration/security tests and golden-set threshold pass; staging run is reviewed end-to-end. Commit and push the phase.

**PRD coverage:** Part 1 §§0, 3, 4, 6, 7; Part 4 §§38–45; Part 3 §§26–27, §§30–33; Part 5 §§64–65, §79.

---

### Phase 4 — Trustworthy reports, billing, usage, support, and control plane

**Outcome:** customers can understand and share results safely, manage their plan, and get support without manual database intervention.

**Work**

- Complete the report model and UI: summary, prioritized findings, confidence/evidence, persona/task context, completion status, timestamps, limitations, and step-by-step trace.
- Link each finding to the exact supporting trace step(s); support trace navigation from report and return navigation to report context.
- Deliver the approved export formats (CSV and PDF if retained in the contract) asynchronously, idempotently, with status/progress, retry, private object storage, and expiring download URLs.
- Complete share flows: create, preview, revoke, expire, rotate, and copy link; public view reveals only approved report fields and never tenant identifiers, credentials, or unrelated project data.
- Enforce quota/usage metering from one source of truth per organization and billing period; handle concurrent simulation creation atomically, plan upgrades, limits, and transparent usage display.
- Complete Stripe checkout and customer portal, upgrade/downgrade/cancel, failed-payment/dunning, entitlement changes, webhook deduplication/replay, and account deletion cancellation behavior.
- Complete org/team roles and membership invitation/removal if included in first-beta scope. Enforce least privilege on project/report/API-key access.
- Build support/admin console with staff-only access, audit logging, safe user/project lookup, quota/trial adjustment, and support actions; no unlogged direct production DB operations.
- Implement transactional notification templates and delivery/retry for verification, password reset, simulation complete/failure, export ready, billing, and account lifecycle events.
- Implement self-serve data export and account/workspace deletion, soft-delete/undo window, subscription cancellation, and scheduled hard deletion per approved retention policy.
- Implement product analytics, feature flags, and experiment controls for staged rollout. Keep consent, retention, and personal-data policy explicit.
- Document API keys and scopes if programmatic access is in first P1 scope; otherwise record as a P1 with a trigger, not as an implied launch feature.

**Verification / exit criteria**

- Report tests prove evidence-to-trace navigation, correct status, and no fabricated or unsupported finding.
- Export tests verify output shape, access control, retry/idempotency, link expiration, and deletion/retention rules.
- Share tests verify unauthenticated access works only with a valid token and stops after revoke/expiry; project/account deletion follows the approved policy.
- Stripe test-mode scenarios cover success, duplicate/out-of-order webhook, failed payment, downgrade, cancellation, reactivation if supported, and quota entitlement correctness.
- Concurrent quota tests prove no overrun/race under simultaneous requests.
- Admin actions require staff role and produce tamper-evident audit records; support workflows never expose secrets.
- Notification retry and provider outage tests prove messages are not silently dropped.
- Data export/delete tests demonstrate what is included, when deletion occurs, and what legally/operationally must be retained.

**Push gate:** API/UI integration tests, billing test-mode suite, share/export authorization tests, and account lifecycle E2E pass. Commit and push the phase.

**PRD coverage:** Part 1 §§4, 6–7; Part 2 §§8–12 and §18; Part 3 §§20–21, §§28, §§30–35, §37; Part 5 §§46–52, §§66–67, §§72, §83.

---

### Dependencies and safe parallel work

The phase numbers define release gates, not a requirement that every contributor wait idle for a whole prior phase:

| Work | Prerequisite | Parallelization rule |
|---|---|---|
| Phase 1 schema/API/queue contract | Phase 0 tenant, route, and queue decisions | Schema and API can proceed together after the contract is signed; migration must not land before the backfill/rollback plan is tested. |
| Phase 2 frontend | Phase 0 route/event/UX decisions; Phase 1 API contracts | UI can be built against typed mocks while API implementation proceeds, but merge/integration must use the contract tests and real staging services. |
| Phase 3 AI engine | Phase 0 engine/cost/safety decision; Phase 1 queue, auth, storage, and network boundary | Agent evaluation harness and controlled-site fixtures can start early; customer-facing use is blocked until sandbox, egress, cost caps, and tenant isolation pass. |
| Phase 4 reports/billing | Phase 1 tenancy/usage/API; Phase 2 product navigation; Phase 3 trace/report data contract | Report UI can use fixture traces early. Production exports, shares, and paid usage require real authorization and lifecycle tests. |
| Phase 5 hardening | Deployed Phase 1–4 candidate | Security/performance checks can be designed earlier, but launch evidence must describe the exact candidate and production-like environment being released. |
| Phase 6 private beta | Phase 5 gates and approved production release | Beta is not a substitute for missing security, restore, monitoring, or cost controls. |
| Phase 7 scale/enterprise | Beta evidence and explicit demand trigger | Each feature is independently prioritized; the whole phase is not a prerequisite for the early-beta launch bar. |

---

### Phase 5 — Production hardening and evidence-based launch readiness

**Outcome:** the product is deployable, recoverable, observable, secure, and measured against explicit beta targets.

**Work**

1. **Environments, delivery, and supply chain**
   - Define local, CI, preview, staging, and production configuration; validate deployment manifests and service health/readiness probes.
   - Store secrets in the hosting secret manager; rotate any credentials that may have been exposed; confirm `.env` files and secrets are absent from current and prior Git history.
   - CI gates: formatting/lint, typecheck, unit, integration, migrations, E2E, AI golden-set on relevant changes, dependency scanning, build, and staging smoke test.
   - Pin reproducible dependencies and container images; scan dependencies and images; protect production deploy with an approval gate and documented rollback.
   - Maintain a concise developer setup guide, architecture diagram, runbooks, service ownership, environment variable inventory, and ADR log.

2. **Monitoring, SRE, and incident response**
   - Add structured correlated logs, exception tracking, metrics, and distributed tracing from web/API → queue → AI worker → report/export.
   - Dashboard queue depth, run status, latency, error rates, provider latency/failures, AI token/cost by plan, quotas, webhook failures, database health, and frontend Web Vitals.
   - Define SLOs/error budgets, alert thresholds, external uptime monitoring, on-call/support owner, incident severity, response, rollback, and customer communication process.
   - Test degradation for AI provider, Redis/queue, PostgreSQL, Qdrant, storage, email, Stripe, and Clerk failures; avoid success-shaped fallbacks.

3. **Performance, scalability, and cost**
   - Set reproducible workload profiles and test data for the approved 100-concurrent-user target. Load-test queue admission, worker capacity, database contention, API p95/p99, and sustained/peak behavior.
   - Verify simulation creation returns promptly independent of run duration; measure per-step latency against the agreed <3-second definition and report-generation duration against the agreed <30-second definition.
   - Measure uptime against the 99% target over a stated window; do not claim attainment from a short smoke test.
   - Optimize query plans/indexes, payload size, caching invalidation, route splitting, streaming/progress updates, browser resource limits, and worker autoscaling based on measurements.
   - Measure cost per run and per organization; configure concurrency, quota, token, storage, and alert ceilings; revisit PgBouncer/worker/API scaling only when observed triggers are met.
   - Confirm public-site Core Web Vitals; retain a repeatable mobile Live Trace Viewer performance/responsiveness check.

4. **Security, privacy, and recovery**
   - Run threat-model review against Part 3 §82; verify auth/session security, staff role separation, CSRF/CORS/CSP, API rate limits, SSRF/browser egress, upload handling, secret redaction, and webhook signatures.
   - Complete cross-tenant penetration-style tests for read/write/list/search/export/share and internal callbacks; remediate all critical/high findings before beta.
   - Run prompt-injection and dependency/security scans continuously and before launch; document residual risks.
   - Verify data minimization, privacy/security page accuracy, subprocessor list, telemetry redaction, retention schedule, export/deletion, and storage lifecycle.
   - Perform a real backup restore into an isolated environment; measure recovery time/data point and revise RPO/RTO to realistic targets. Verify scheduled retention/deletion jobs.
   - Validate business-continuity and incident runbooks; test rollback and recovery without exposing customer data.

**Verification / exit criteria**

- All Part 5 §85 checklist items have evidence, owner, date, and pass/waiver status; no unchecked item is represented as complete.
- Load-test report includes workload, duration, concurrency, dataset, p50/p95/p99, error rate, queue lag, worker saturation, and cost; results meet the approved targets or the scope/target is explicitly changed before launch.
- 99% uptime is evaluated over a defined observation period with external monitoring; beta messaging states the actual measurement window.
- Backup restore is witnessed and recorded; recovery objectives are documented.
- Cross-tenant and AI prompt-injection suites pass; no unresolved critical/high security issue.
- Every production service has health checks, dashboards, actionable alerts, rollback path, and named operator.

**Push gate:** CI and security scans pass; staging release is approved after load/restore/E2E evidence review. Commit and push the phase; production rollout remains a separately approved release.

**PRD coverage:** Part 5 §§53–70, §§73–81, §§84–88; Part 3 §§31–34, §82; Part 2 §§14, §§16–18; Part 4 §§42–45.

---

### Phase 6 — Private beta, controlled launch, and learning loop

**Outcome:** real early users can use the product safely while the team can see, support, and correct failures quickly.

**Work**

- Start with a small, invited cohort matching the validated primary personas; onboard users directly and obtain authorization for each target site and test account.
- Use feature flags and staged rollout; set cohort size, simulation/concurrency caps, spend ceiling, support coverage, rollback conditions, and explicit pause authority before inviting users.
- Run the complete first-value journey with a first-time user who has never seen the product; observe without coaching and fix confusing steps.
- Review a sample of simulations weekly for grounding, false positives, missed friction, unsafe actions, time-to-report, and cost.
- Monitor activation, first successful report, repeat runs, report sharing/export, paid conversion intent, support burden, reliability, and AI quality against the Phase 0 KPI dictionary.
- Maintain a clear support channel and response owner. Publish honest `/security`, privacy, AI limitations, retention, supported browser actions, pricing, and beta status.
- Triage beta feedback into defects, missing P0/P1 acceptance criteria, and later roadmap requests; update the PRD traceability ledger rather than accumulating undocumented exceptions.
- Reassess readiness after each cohort; do not scale acquisition until reliability, unit economics, and support capacity are acceptable.

**Verification / exit criteria**

- Level 1 maturity criteria from Part 5 §84 are all evidenced.
- Level 2 is substantially underway: load tested, tenant isolation tested, backup restore performed, SLOs tracked, billing lifecycle self-serve, and runbooks active.
- No unresolved Sev-1/critical incident, cross-tenant access defect, credential leak, or unbounded AI cost path.
- Cohort metrics and interviews support the next decision; the product does not claim statistically significant results from a small beta.
- Go/no-go review signs off product, AI, engineering, security, support, and business checklist owners.

**Push/release gate:** every fix follows its engineering-phase tests and push rule. Beta rollout requires a tagged, approved production release and rollback plan.

**PRD coverage:** Part 1 §§1, 4–7; Part 5 §§46, §§51, §§69–70, §§84–87, §85.

---

### Phase 7 — Scale and demand-triggered P1/P2 roadmap

**Outcome:** extend the product only when beta evidence, demand, and operating capacity justify the investment.

**Candidate work**

- P1: API keys with least-privilege scopes, CI/GitHub Action integration, mature support/admin workflows, and targeted agency/team needs.
- P2/later: SSO/SAML/SCIM, compliance certifications, extended audit retention, multi-region resilience, read replicas/partitioning, broader enterprise controls, and friction-pattern benchmarks.
- Add API gateway instances/load balancing, queue worker autoscaling, read replicas, SimulationStep partition/archive, and connection pooling only when the thresholds in Part 3 §28 / Part 5 §§62 and 78 are reached.
- Validate aggregate friction insights are anonymized, privacy-reviewed, opt-in where appropriate, and never leak one organization's data into another's simulation context.
- Refresh market interviews, competitor evidence, price/cost model, support capacity, accessibility, localization, and security posture as user mix changes.

**Verification / exit criteria**

- Each candidate has a demand signal, owner, cost/benefit, data/security review, migration strategy, success metric, and rollback plan before entering a committed cycle.
- Level 3 is claimed only after scale triggers are met and rollout/cost dashboards are actively used.
- Level 4 remains deferred until the enterprise strategy is real and funded; do not imply SSO/compliance/multi-region capabilities prematurely.

**PRD coverage:** Part 1 §§0, §§3–6; Part 5 §§62, §§74–75, §§78–79, §§84, §86.

## 4. Requirement-to-phase coverage map

This map ensures no PRD area disappears between workstreams. The individual acceptance criteria and tests are maintained in the implementation backlog.

| PRD | Sections | Primary phase(s) | Coverage |
|---|---|---:|---|
| Part 1 — Product, Market & Business | §§0–2 | 0, 3, 6 | Product philosophy, research limits/validation, problem, scope, defensible value, and claims |
| | §3 / §3.1 | 0, 7 | Vision and long-term roadmap |
| | §§4–5 | 0, 4, 6 | KPIs, north star, personas, anti-persona, pricing research |
| | §6 / §6.1 | 0, 2–4, 7 | P0/P1/P2 feature inventory, acceptance criteria, explicit deferrals |
| | §7 / §§7.1–7.4 | 2, 4, 6 | Discovery, onboarding, returning user, session/account/workspace lifecycle |
| Part 2 — Design & Frontend | §8 | 2 | Sitemap, navigation, search, hierarchy, deep links |
| | §9 | 2, 6 | Critical user flows and recovery paths |
| | §10 | 2, 4 | Wireframes/screens and report details |
| | §11 | 1–2 | Frontend architecture and API/client data contracts |
| | §§12–15 | 2 | Design system, brand/copy, motion, reference decisions |
| | §16 | 2, 5 | Responsive/cross-browser design and performance |
| | §17 | 2, 5 | WCAG 2.1 AA and keyboard/accessibility proof |
| | §18 | 2, 5, 6 | Public site, SSR/metadata, SEO, security page, Core Web Vitals |
| Part 3 — Backend, Data & Security | §§19–20.1 | 1 | Service boundaries, API routes/conventions, versioning, pagination |
| | §§21–27 | 1, 3, 5 | Auth/RBAC, abuse, quotas, API/frontend/input/browser security |
| | §§28–28.1, §37 | 1, 4, 5 | Data model, tenancy, isolation, migration, multi-tenancy |
| | §§29–30 | 1, 3, 5 | Cache and async jobs/progress |
| | §§31–34 | 1, 3, 5 | Errors, reliability, failure modes, idempotency/concurrency |
| | §§35–36 | 1, 4 | File storage and search |
| | §82 | 1, 3, 5 | Threat model and security acceptance tests |
| Part 4 — AI Architecture | §§38–39 | 3 | Agent loop, model/provider gateway, plan routing, cost ceiling |
| | §§40–41 | 3 | RAG, knowledge refresh, scoped memory decisions |
| | §42 | 3, 5 | Guardrails, sandbox, prompt injection, safe actions |
| | §§43–44 | 3, 5, 6 | Golden-set evaluation, prompt versions, observability |
| | §45 | 0, 3, 5 | Cost, latency, performance, unit economics |
| Part 5 — Infra, Ops & Production | §§46–52 | 2, 4, 6 | Analytics, metering, billing, admin, audit logs, flags, notifications |
| | §§53–58 | 1, 5 | Infrastructure, networking, environments, secrets, CI/CD, supply chain |
| | §§59–65 | 1, 3, 5 | Observability, performance, scale, tests, security tests, data quality |
| | §§66–68 | 1, 4, 5 | Privacy, retention/lifecycle, backup and disaster recovery |
| | §§69–72 | 4–6 | SRE, alerts, integrations, webhooks |
| | §§73–76 | 2, 5, 7 | Developer experience, enterprise readiness, i18n, cross-cutting UX states |
| | §§77–79 | 0, 3, 5, 7 | Load tests, capacity, unit cost |
| | §§80–81 | 0, 1, 5 | Architecture docs, ADRs, decision record |
| | §83 | 4 | Admin/control plane |
| | §§84–85 | 5–6 | Maturity levels and launch checklist |
| | §§86–88 | 0, 5–7 | Roadmap, risks, reference architecture |
| | §§89–93 | All | Engineering principles as review guardrails |
| | §§94–98 | 0, 5–7 | Final-review answers and closing notes carried into decisions, evidence, and future revision |

## 5. Per-phase test and Git release protocol

Apply this sequence to every code-bearing phase:

1. Confirm the phase scope and linked acceptance criteria; record any approved deviation.
2. Run focused unit tests and static checks for changed components.
3. Run affected API/database/worker integration tests, including migrations and authorization.
4. Run relevant E2E, accessibility, security, AI golden-set, or load tests required by that phase.
5. Deploy to preview/staging and run smoke tests on the deployed services—not just local mocks.
6. Review test output and artifacts; fix failures before calling the phase complete.
7. Commit the phase with a descriptive message and the required co-author trailer; push the branch only after the gates pass.
8. Promote to production only through the approved rollout gate, with monitoring and rollback ready.

Phase 0 is primarily research and decisions; validate document consistency and approve ADRs before committing/pushing planning artifacts. Phase 6 beta promotions are release decisions, not substitutes for the phase test protocol.

## 6. Program risks and controls

| Risk | Control / decision gate |
|---|---|
| AI run cost exceeds plan revenue | Resolve engine mode and caps in Phase 0; enforce a hard code-level ceiling; measure cost by organization before widening beta. |
| Agent takes an unsafe action or follows injected page text | Disposable accounts, explicit target allowlist, constrained schema/actions, no real purchases/destructive actions, security test suite, anomaly logging, and human review. |
| Cross-tenant data exposure | Organization-aware schema/query helpers plus automated guessed-ID/list/search/export/share isolation tests before launch. |
| Queue/stream contract rework | Decide BullMQ vs. current queue and WebSocket/SSE vs. polling before building against a second, incompatible contract. |
| Beta launch overstated | Use Part 5 maturity criteria and checklist as evidence gates; publish limitations and measured SLO window honestly. |
| Single-provider, single-region dependencies | Accept explicitly at beta with provider outage/degraded-mode behavior, alerting, recovery plan, and trigger for future redundancy. |
| Solo-founder capacity | Sequence P0 first; defer speculative enterprise/platform work; limit beta cohort and support commitments to available coverage. |
| Unvalidated positioning and pricing | Complete interviews and track hypotheses; revisit after real activation, conversion, churn, and cost data. |

## 7. Definition of “ready for early beta”

Early beta is ready only when all of the following are true:

- The PRD's P0/P1 inventory is reconciled, implemented, and acceptance-tested; explicit P2/out-of-scope work is documented.
- A first-time user can complete signup → onboarding → authorized simulation → evidence-backed report without staff intervention.
- Tenant boundaries, authentication, rate limits, cost caps, browser egress, and prompt-injection controls have passing tests.
- Reports, exports, share permissions, billing/usage, support, and account deletion behave according to documented policy.
- Staging load, recovery, monitoring, accessibility, and AI quality evidence exists; measured performance is compared against approved SLO definitions.
- The launch checklist has owners and evidence; no critical/high security defect or unbounded cost path remains.
- Support coverage, beta terms, privacy/security disclosures, rollback, feature flags, and incident response are in place.

This is a release gate, not a calendar estimate. Dates and staffing should be attached only after Phase 0 decisions and the current-branch gap audit are confirmed.

## 8. Source documents

- [Part 1 — Product, Market & Business](./ShadowTest-PRD-v3-Part1-Product-Market-Business.md)
- [Part 2 — Design & Frontend](./ShadowTest-PRD-v3-Part2-Design-Frontend.md)
- [Part 3 — Backend, Data & Security](./ShadowTest-PRD-v3-Part3-Backend-Data-Security.md)
- [Part 4 — AI Architecture](./ShadowTest-PRD-v3-Part4-AI-Architecture.md)
- [Part 5 — Infrastructure, Operations & Production](./ShadowTest-PRD-v3-Part5-Infra-Ops-Production.md)
