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
npm install
npm run db:generate
npm run db:deploy
npm run dev
```

Create a migration after changing `prisma/schema.prisma`:

```bash
npm run db:migrate -- --name describe_your_change
```

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
