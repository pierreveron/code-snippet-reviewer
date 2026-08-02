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

Reviews run through a shared library (`src/lib/review`) — not wired to the UI yet.

```bash
# Review a snippet already in the local database
npm run review -- <snippetId>

# Live LLM fixture evals (costs tokens)
npm run eval:review
```

Default model: `REVIEW_MODEL=openai:gpt-5.6-luna` (override in `.env`).

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
- `src/lib/db.ts` — shared Prisma Client for server-side database access
- `prisma/` — data model and committed SQLite migrations
- `Dockerfile` / `docker-compose.yml` — one-command local run for reviewers
- `data/` — SQLite persistence (created at runtime; gitignored)

## Architecture overview

The app uses SQLite through Prisma. Docker Compose runs committed migrations in a
one-shot service before starting the Next.js app, and stores the database in a
named volume so data survives container restarts.

## What I'd do differently

_To be filled in before submission._

## AI usage log

_To be filled in before submission._
