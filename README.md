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
npm run dev
```

## Project layout

- `src/app` — Next.js App Router (UI + API routes)
- `Dockerfile` / `docker-compose.yml` — one-command local run for reviewers
- `data/` — SQLite persistence (created at runtime; gitignored)

## Architecture overview

_To be filled in as the app takes shape._

## What I'd do differently

_To be filled in before submission._

## AI usage log

_To be filled in before submission._
