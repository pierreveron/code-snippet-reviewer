# Code Snippet Reviewer

Lightweight, self-service code review for ad-hoc snippets (Gitar take-home).

## Quick start (Docker)

```bash
cp .env.example .env
# Optional for now: add an LLM API key to .env when AI review is implemented
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

## Local development (without Docker)

```bash
cp .env.example .env
# Set OPENAI_API_KEY (or ANTHROPIC_API_KEY) for AI reviews
npm install
npm run db:generate
npm run db:deploy
npm run dev
```

Create a migration after changing `prisma/schema.prisma`:

```bash
npm run db:migrate -- --name describe_your_change
```

## Review CLI

```bash
# Review a snippet already in the local database
npm run review -- <snippetId>

# Live LLM fixture evals (costs tokens)
npm run eval:review
```

Default model: `REVIEW_MODEL=openai:gpt-5.6-luna` (override in `.env`).
Switch providers with the same format, e.g. `anthropic:claude-sonnet-4-5`.

### Debugging reviews

Optional `.env` flags (independent):

- `INCLUDE_DEBUG_BODY=1` — log raw provider request/response bodies to the console
- `AI_SDK_DEVTOOLS=1` — capture runs for [DevTools](https://ai-sdk.dev/docs/ai-sdk-core/devtools) (local only)

With DevTools enabled, run a review or eval in one terminal and the viewer in another:

```bash
npm run devtools
```

Open [http://localhost:4983](http://localhost:4983) to inspect prompts, outputs, and token usage.
Captures are stored in `.devtools/` (gitignored).

## Database storage

The local and Docker workflows use separate SQLite databases:

- Local development uses `data/dev.db` in the project directory.
- Docker Compose uses `/app/data/dev.db`, stored in the Docker-managed
  `snippet-data` volume.

These databases are not synchronized. Data created locally will not appear when
running through Docker, and Docker data will not appear in the local database.
Normally, only one workflow is used at a time.

The Docker build also sets `DATABASE_URL=file:/tmp/build.db`. This only gives
Prisma the configuration it requires while generating the client and building
the application; it does not create a persistent third database.

Both the migration service and application access the Docker database as
UID/GID `1001`, which belongs to the non-root `nextjs` user in the application
image. Using the same owner keeps the SQLite file writable by the application
without running it as root.

## Project layout

- `src/app` — Next.js App Router (UI + API routes)
- `src/lib/db.ts` — Prisma Client for the Next.js server (`server-only`)
- `src/lib/create-prisma-client.ts` — shared Prisma factory for the app and CLI
- `src/lib/review/` — AI review core (schema, prompts, LLM call, DB orchestrator)
- `scripts/` — `review` and `eval:review` CLI entrypoints
- `evals/review/` — fixture snippets and expectation matching for live evals
- `prisma/` — data model and committed SQLite migrations
- `Dockerfile` / `docker-compose.yml` — one-command local run for reviewers
- `data/` — SQLite persistence (created at runtime; gitignored)

## Architecture overview

The app uses SQLite through Prisma. Docker Compose runs committed migrations in a
one-shot service before starting the Next.js app, and stores the database in a
named volume so data survives container restarts.

### AI review

Reviews are implemented as a small library under `src/lib/review`, separate from
the UI. Today the CLI and eval runner call into it; the web app will reuse the
same functions later.

Layers:

1. **Schema** (`schema.ts`) — Zod shape for structured findings (severity,
   category, line range, description, optional suggested fix). OpenAI structured
   outputs require nullable fields instead of omitted ones.
2. **Model** (`model.ts`) — reads `REVIEW_MODEL` as `provider:modelId` and
   resolves a Vercel AI SDK model (`openai` or `anthropic`).
3. **Analyze** (`analyze.ts`) — pure LLM call via `generateText` +
   `Output.object`. Takes language and code only (not the snippet title, which
   could bias findings); returns sanitized findings (no database). Line numbers
   outside the snippet are dropped or clamped.
4. **Orchestrator** (`run-review.ts`) — full lifecycle against Prisma:
   create/reset a `Review` as `IN_PROGRESS`, call `analyzeSnippet`, then write
   `Finding` rows and mark `COMPLETED`, or `FAILED` with an error message.
   Re-running replaces prior findings for that snippet.

```text
CLI / evals ──► runReview / analyzeSnippet ──► AI SDK ──► REVIEW_MODEL
                     │
                     ▼
              SQLite (Review + Finding)
```

The UI is not wired yet. The intended path is: a server action marks the review
`IN_PROGRESS` and schedules `runReview` in the background (e.g. Next.js
`after()`); the detail page polls `review.status` until `COMPLETED` or `FAILED`.

## What I'd do differently

_To be filled in before submission._

## AI usage log

_To be filled in before submission._
