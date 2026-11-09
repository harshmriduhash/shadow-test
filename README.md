# ShadowTest

### Find product friction before it costs you customers.

ShadowTest helps product teams explore how people might experience a website
before spending days arranging interviews or waiting for the next round of user
research. Describe a product, choose a synthetic persona, set a task, and get an
AI-generated, step-by-step walkthrough with a summary of possible friction.

> **In plain English:** ShadowTest is a practice audience for your product. It
> helps you spot questions and usability risks worth investigating with real
> users—not replace real users.

**Early access** · Next.js · TypeScript · FastAPI · PostgreSQL · Redis

---

## The problem

Building a product is fast. Learning where people get confused can be slow.
Traditional usability research is valuable, but coordinating participants,
scheduling sessions, and reviewing feedback takes time. Small teams may not
have a research team or budget for every design decision.

That creates a difficult choice: ship based on assumptions, or delay decisions
while waiting for more feedback.

## How ShadowTest helps

ShadowTest gives teams a quick way to examine a product journey and generate
research prompts:

1. **Create a project** and optionally provide a public HTTPS product page or a
   public GitHub repository.
2. **Choose a persona**—for example, an impatient developer or a cautious
   enterprise buyer—or create one that fits your audience.
3. **Describe a task** such as finding a feature, understanding a price, or
   starting a workflow.
4. **Review the walkthrough.** ShadowTest records what the synthetic persona
   notices, how it interprets the page, and where it encounters potential
   friction.
5. **Use the report to decide what to investigate next.** Review the run with
   your team and validate important conclusions with real users.

The evaluator reads public page content and may follow links on the same host.
It does **not** click controls, submit forms, sign in, or make changes to the
product being reviewed.

## Does it save time and money?

It can help teams get an early signal sooner and reduce the effort needed to
prepare an initial list of questions to investigate. That may help a team avoid
spending engineering time on an assumption that deserved a closer look.

We do not claim a guaranteed dollar amount, research-time reduction, or
conversion lift. Results depend on the product, task, and persona, and AI
walkthroughs can be wrong or incomplete. Treat them as hypotheses—not measured
customer evidence.

Teams can estimate their own potential value:

> **Potential time returned** = research-preparation hours avoided or
> repurposed × the team's hourly cost

For example, compare the time spent setting up and reviewing a ShadowTest run
with the time your team would otherwise spend preparing an early exploratory
review. Track the result over several projects before making an ROI claim.

## Who it is for

- **Founders and entrepreneurs:** pressure-test an idea or onboarding journey
  before committing a sprint to changes.
- **Product managers and designers:** get another structured perspective while
  shaping flows, messaging, and feature discoverability.
- **Developers:** connect a reported friction point to a concrete product task
  and decide what to verify next.
- **Researchers:** use synthetic walkthroughs to generate interview questions
  and hypotheses alongside—not instead of—research with people.
- **Recruiters and HR teams:** understand how a public careers page or
  application-information page may read to different audiences. ShadowTest
  evaluates product content; it is **not** a candidate-screening, employee
  assessment, or hiring recommendation system.
- **Anyone curious about a website:** describe a goal in everyday language and
  review a plain-language walkthrough.

## What you can do

- Organize product reviews into projects and create custom personas.
- Run asynchronous, read-only AI walkthroughs and inspect saved steps and
  reports.
- Upload private PDF, Markdown, and plain-text project documents to provide
  searchable background context for simulations.
- Search indexed project documents for relevant passages.
- Collaborate in Clerk organizations, subject to your workspace configuration.
- Browse large project, persona, simulation, report, and document lists with
  cursor-based pagination.
- Export reports to CSV.
- Use Redis-backed job queues, retry failed simulations, and apply plan limits.
- Optionally connect Stripe subscriptions.

## Architecture

### High-level design (HLD)

This view shows the main services and the direction information travels. The
Next.js application serves the user interface and proxies dashboard requests
to the API. The API manages identity, access, records, and job dispatch. The
Python worker performs AI tasks away from the request path.

```mermaid
flowchart LR
    Person["People<br/>Founders · product teams · curious users"]
    Web["Next.js web app<br/>Dashboard"]
    Proxy["Next.js API proxy<br/>Same-origin requests"]
    Auth["Clerk<br/>Sign-in · organizations"]
    API["Express API<br/>Access control · validation · orchestration"]
    DB[("PostgreSQL<br/>Projects · personas · runs · reports")]
    Redis[("Redis<br/>Job queue · API cache · rate limits")]
    AIService["FastAPI AI service<br/>Job intake · semantic search"]
    Worker["Python background worker<br/>Simulation · document indexing"]
    AI["Anthropic<br/>Persona reasoning"]
    Site["Public product pages<br/>Read-only page text"]
    S3[("Private S3-compatible storage<br/>Original documents")]
    Vector[("Qdrant<br/>Document embeddings")]
    Vercel["Vercel"]
    Render["Render"]

    Person --> Web
    Web --> Auth
    Web --> Proxy
    Proxy --> API
    API --> DB
    API <--> Redis
    API --> S3
    API --> AIService
    AIService --> Redis
    AIService --> Vector
    Redis --> Worker
    Worker --> AI
    Worker --> Site
    Worker --> S3
    Worker --> Vector
    Worker --> API
    Web -. hosted on .-> Vercel
    API -. hosted on .-> Render
    AIService -. hosted on .-> Render
    Worker -. hosted on .-> Render
```

### Low-level design (LLD)

#### A simulation, from request to report

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js dashboard
    participant Auth as Clerk
    participant API as Express API
    participant AIService as FastAPI AI service
    participant DB as PostgreSQL
    participant Queue as Redis queue
    participant Worker as Python worker
    participant Page as Public product page
    participant Model as Anthropic

    User->>Web: Choose project, persona, and task
    Web->>Auth: Get signed session token
    Web->>API: Start simulation through API proxy
    API->>API: Verify Clerk JWT and organization claims
    API->>DB: Check access; save simulation record
    API->>AIService: Request simulation enqueue
    AIService->>Queue: Enqueue job
    API-->>Web: Return saved run
    Queue->>Worker: Deliver queued job
    Worker->>API: Mark run RUNNING
    loop Each walkthrough step
        Worker->>Page: Fetch allowed public page text
        Page-->>Worker: HTML content
        Worker->>Model: Ask persona to reason about task and page
        Model-->>Worker: Observation, interpretation, next step
        Worker->>API: Persist step
    end
    Worker->>API: Persist report and final status
    Web->>API: Fetch run, steps, and report
    API-->>Web: Return saved results
    Web-->>User: Show trace and insights
```

#### Document upload and search

```mermaid
sequenceDiagram
    actor User
    participant Web as Project dashboard
    participant API as Express API
    participant AIService as FastAPI AI service
    participant S3 as Private object storage
    participant Queue as Redis queue
    participant Worker as Python worker
    participant Embed as FastEmbed
    participant Qdrant as Vector database

    User->>Web: Select PDF, Markdown, or text file
    Web->>API: Request short-lived upload form
    API->>S3: Create constrained presigned upload
    API->>API: Save document metadata as UPLOADING
    API-->>Web: Return upload URL and form fields
    Web->>S3: Upload file directly
    Web->>API: Confirm upload
    API->>S3: Check stored object and expected size
    API->>AIService: Request document indexing
    AIService->>Queue: Enqueue indexing job
    Queue->>Worker: Deliver indexing job
    Worker->>S3: Read document
    Worker->>Worker: Extract text and split into chunks
    Worker->>Embed: Create vectors
    Embed-->>Worker: Document vectors
    Worker->>Qdrant: Store project-scoped chunks
    Worker->>API: Mark document READY or FAILED

    User->>Web: Search project documents
    Web->>API: Submit query
    API->>AIService: Request semantic search
    AIService->>Embed: Embed query
    AIService->>Qdrant: Find relevant project chunks
    Qdrant-->>AIService: Matching passages
    AIService-->>API: Search results
    API-->>Web: Return passages and relevance
```

## Technology

| Layer | Technology | Responsibility |
|---|---|---|
| Web | Next.js, React, TypeScript | Dashboard, project workflows, and API proxy |
| Authentication | Clerk | User sessions and organization membership |
| Application API | Node.js, Express, Prisma | Authenticated routes, validation, access checks, and persistence |
| Database | PostgreSQL | Users, projects, personas, simulations, steps, reports, and documents |
| Queue and cache | Redis | Background jobs, short-lived API response cache, and rate-limit storage |
| AI service and worker | Python, FastAPI | Read-only page inspection, simulation jobs, and document processing |
| Language model | Anthropic API | Persona reasoning and generated walkthrough content |
| File storage | S3-compatible object storage | Private source documents |
| Semantic search | Qdrant and FastEmbed | Vector indexing and project-scoped passage retrieval |
| Hosting blueprint | Vercel and Render | Web app and backend services |

## Getting started

### Requirements

- Node.js 20 or later and npm
- Python 3.11 for the AI service
- PostgreSQL and Redis
- Clerk credentials for authenticated dashboard use
- An Anthropic API key for live AI simulations
- For document search: an S3-compatible bucket and Qdrant instance

### Configure environment

Copy the relevant examples and fill in local values:

```sh
cp api/.env.example api/.env
cp ai-engine/.env.example ai-engine/.env
cp web/.env.example web/.env.local
```

Set database, Redis, Clerk, internal service authentication, and AI credentials
as appropriate. Never commit real `.env` files or expose secrets through
`NEXT_PUBLIC_*` variables. Document storage and vector search require their own
AWS/S3 and Qdrant configuration.

### Start services locally

Install and launch the API:

```sh
cd api
npm ci
npm run build
npm run migrate:deploy
npm start
```

In another terminal, install and launch the AI API:

```sh
cd ai-engine
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

In a third terminal, start the background worker:

```sh
cd ai-engine
source .venv/bin/activate
python worker.py
```

In a fourth terminal, start the web app:

```sh
cd web
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set
`API_SERVER_URL=http://localhost:4000/api` in `web/.env.local` for local API
requests. The API needs the PostgreSQL and Redis services running first; set the
same internal API key on the API, AI service, and worker.

### Tests and builds

```sh
cd api && npm test
cd web && npm run lint && npm run build
cd ai-engine && python -m unittest discover -s . -p 'test_*.py'
```

## Deploying

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full Render, Vercel, PostgreSQL,
Clerk, Redis, S3, Qdrant, and optional Stripe setup.

The checked-in Render blueprint provisions the API, AI service, worker, and
Redis. It does not create external PostgreSQL, Clerk, Anthropic, AWS, or Qdrant
accounts for you. Deploy the backend first, then configure Vercel's
`API_SERVER_URL` to the actual public API URL ending in `/api`. Verify the API
service's `/health` endpoint before using dashboard features.

## Trust, safety, and current limits

- **A research aid, not ground truth:** AI-generated observations are
  suggestions to verify, not evidence that real customers behave the same way.
- **Read-only evaluation:** ShadowTest inspects page text and same-host links;
  it does not operate controls, submit forms, or modify target sites.
- **Public pages only:** Evaluated pages must be publicly reachable over HTTPS.
  Login-only and private application flows are not evaluated.
- **Document formats and size:** PDF, Markdown, and plain-text uploads are
  supported, up to 10 MB per file. PDF text extraction does not include OCR.
- **Team access:** Organization access depends on Clerk Organizations being
  enabled and configured for the deployed Clerk instance.
- **External services required:** Live use depends on correctly configured
  database, identity, AI, queue, and deployment credentials. S3/Qdrant are
  additionally required for document upload and semantic search.
- **Not a hiring tool:** Do not use persona output to score, rank, or make
  employment decisions about people.

## Repository layout

```text
web/         Next.js dashboard and same-origin API proxy
api/         Express API, Prisma schema, and database migrations
ai-engine/   FastAPI service, simulation logic, document processing, and worker
render.yaml  Render services and environment-variable blueprint
DEPLOYMENT.md
             External-service configuration and deployment walkthrough
```

## Contributing

Issues and pull requests are welcome. For substantial changes, please describe
the user problem, expected behavior, and how you tested the change. Never
include customer data, credentials, or private documents in issues or test
fixtures.

---

*Built to help teams ask better product questions earlier—and validate the
important answers with people.*