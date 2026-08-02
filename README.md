# Code Snippet Reviewer

Lightweight, self-service code review for ad-hoc snippets (Gitar take-home).

## Setup Instructions

### Quick start (Docker)

```bash
cp .env.example .env
# Required: set OPENAI_API_KEY in .env (default REVIEW_MODEL is OpenAI)
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Without an API key the app
still starts, but **Run review** fails. On first start (empty database), Compose
seeds sample snippets so you can browse the UI immediately.

### Local development

Use **Node 24** (same major as the Docker image; see `.nvmrc`). One
`package-lock.json` is shared by local and Docker — do not maintain separate
lockfiles. Keep `node_modules` on the host only; Compose never mounts it
(native addons differ between macOS and Linux).

```bash
cp .env.example .env
# Required: set OPENAI_API_KEY in .env
nvm use   # or: fnm use / asdf install — must be Node 24
npm ci
npm run db:generate
npm run db:deploy
# Optional: npm run db:seed  # load sample snippets
npm run dev
```

Create a migration after changing `prisma/schema.prisma`:

```bash
npm run db:migrate -- --name describe_your_change
```



## Architecture Overview

Next.js App Router hosts both the UI and the server. Mutations go through
server actions. Reviews call an LLM via the Vercel AI SDK, then persist
structured findings in SQLite through Prisma.

```mermaid
flowchart LR
  Browser["Browser UI"]
  Actions["Server actions"]
  ReviewCore["Review core"]
  Prisma["Prisma"]
  SQLite["SQLite"]
  LLM["LLM provider"]

  Browser -->|"create, edit, filter"| Actions
  Browser -->|"run / apply / dismiss"| Actions
  Actions --> ReviewCore
  Actions --> Prisma
  ReviewCore -->|"structured output"| LLM
  ReviewCore --> Prisma
  Prisma --> SQLite
```



**Why these choices**

- **Next.js + server actions** — shared TypeScript types from form validation
  through persistence; UI and server stay colocated so review state transitions
  stay easy to follow end-to-end.
- **SQLite + Prisma** — persistent store with migrations and a clear schema
  (`Snippet` → `Review` → `Finding`), without a separate database service.
- **Vercel AI SDK + Zod** — provider-agnostic model calls with validated
  structured findings; swapping models later is a `REVIEW_MODEL` change
  (OpenAI or Anthropic) without rewriting the review pipeline.
- **Review held in the request** — the run waits on the LLM inside one server
  action (not a job queue). Keeps the control flow linear; tradeoffs are covered
  below in the review lifecycle.

### User flows

**Dashboard**

- Lists snippets with title, language, created date, and review status.
- Filter by language and review status; sort columns.
- Click a row to open the snippet page.
- Create a snippet (title, language, code body). The modal defaults to
  **Create and Review** (saves then starts an AI review); **Create** saves only.

**Snippet page**

- Edit title, language, and code. Changing language or code discards the current
  review and its findings; a title-only edit keeps them.
- Run a review to get findings: each finding is a line-scoped issue with
  severity, category, description, and optional suggested change.
- Select a finding to highlight and scroll to its lines in the editor.
- Apply a suggestion to patch the code, or dismiss a finding. Non-overlapping
  suggestions can be applied one after another; overlapping ones become stale
  and need a re-review.
- If a review fails, the error is shown and the user can retry.

### Project layout

- `src/app` — routes and server actions
- `src/components` — dashboard, snippet detail, findings UI
- `src/lib/review/` — analyze, run, apply, patch validation
- `src/lib/db.ts` / `create-prisma-client.ts` — Prisma access
- `prisma/` — schema and migrations
- `evals/` / `scripts/` — optional fixtures, CLI, and live evals



## Review lifecycle



### 1. Structured model output

`src/lib/review/analyze.ts` calls the configured model through the Vercel AI SDK
with a Zod structured-output schema. The model receives the language and code,
but not the title, to avoid bias from user-provided labels.

Each model finding contains:

- a 1-based `startLine` and optional inclusive `endLine`;
- `severity`: `CRITICAL`, `WARNING`, or `INFO`;
- `category`: `BUG`, `SECURITY`, `PERFORMANCE`, `STYLE`, or `OTHER`;
- a plain-language description;
- `replacementLines`, or `null` when no safe automatic change is available.

The analyzer drops findings whose start line is outside the snippet, clamps
invalid end lines, trims descriptions, and aligns replacement indentation.

### 2. Lossless suggestion patches

The model only proposes replacement lines. The application captures the exact
source range itself and stores a versioned JSON patch:

```json
{
  "version": 1,
  "before": ["  return a - b;"],
  "after": ["  return a + b;"]
}
```

Arrays make deletion (`after: []`) different from one blank replacement line
(`after: [""]`) and preserve source lines beginning with `+` or `-`. The patch
therefore has no ambiguous textual diff syntax.

### 3. Starting and completing a review

`src/lib/review/run-review.ts` owns the database lifecycle:

```text
Snippet detail UI
    │ runSnippetReview(snippetId)
    ▼
Review = IN_PROGRESS + sourceVersion + unique runToken
    │
    ▼
analyzeSnippet(language, code) ──► AI SDK ──► REVIEW_MODEL
    │
    ├── matching token and content version ──► COMPLETED + findings
    ├── model/provider error ────────────────► FAILED + error message
    └── newer run or edited source ─────────► SUPERSEDED, result discarded
```

The review captures the snippet's `contentVersion` as `sourceVersion`. Before
writing either success or failure, it verifies:

- its unique `runToken` still owns the review;
- the review still targets the captured source version;
- the snippet still has that content version.

Consequently, an older concurrent run cannot replace a newer run, and an LLM
response for code edited while the model was working cannot create stale
findings.

### 4. Applying a suggestion safely

`src/lib/review/apply-suggestion.ts` performs an optimistic, transactional write:

- `Snippet.contentVersion` is the compare-and-swap value for source changes.
- `Review.sourceVersion` identifies the code represented by its findings.
- The selected finding must still be `OPEN`.
- The patch's frozen `before` block must still match exactly.
- Code replacement, version increments, finding resolution, stale marking, and
line shifts either all commit or all roll back.

After a successful apply, both versions advance together. This preserves the
remaining compatible findings without pretending that overlapping findings are
still safe.

### Status semantics

Review statuses:

- `IN_PROGRESS` — the current run has started and prior findings were cleared.
- `COMPLETED` — the findings, including an empty list, were persisted.
- `FAILED` — the current run failed and its error is available to the UI.
- `SUPERSEDED` — an in-memory result used when this run lost a token or version
race; it is not persisted over the winning review.

Finding resolutions:

- `OPEN` — available to inspect, dismiss, and optionally apply.
- `ACCEPTED` — its suggestion was applied successfully.
- `DISMISSED` — the user chose not to act on it.
- `STALE` — another applied change overlapped its source range; a new review is
required.



### Main implementation boundaries

1. `src/components/SnippetDetailContent.tsx` coordinates editor, status, local
  canonical state, and page refreshes.
2. `src/components/FindingsPanel.tsx` owns finding action transitions, errors,
  selection, and keyboard navigation.
3. `src/app/actions/reviews.ts` exposes review, apply, and dismiss server actions.
4. `src/lib/review/analyze.ts` handles model output and sanitization without
  database access.
5. `src/lib/review/run-review.ts` orchestrates review persistence and concurrent
  runs.
6. `src/lib/review/apply-suggestion.ts` validates and transactionally applies
  patches.
7. `src/lib/review/suggestion-patch.ts` validates the stored patch format.
8. `src/app/actions/snippets.ts` invalidates reviews when code or language
  changes.



## What I'd do differently

*To be filled in before submission.*

## AI usage log

*To be filled in before submission.*

## Appendix: CLI, seeding, and debugging

Optional tools for local development. Not required to exercise the app through
the UI.

Local `npm run dev` and Docker Compose use separate SQLite files (project
`data/dev.db` vs the Compose `snippet-data` volume). They are not synced. Compose
also runs a one-shot `db-init` to `chown` the volume for the non-root app user
so SQLite is writable inside the container.

### Review CLI

```bash
# Review a snippet already in the local database
npm run review -- <snippetId>

# Live LLM fixture evals (costs tokens)
npm run eval:review

# Replace local snippets with deterministic UI fixtures
npm run db:seed
```

Default model: `REVIEW_MODEL=openai:gpt-5.6-luna` (override in `.env`).
Switch providers with the same format, e.g. `anthropic:claude-sonnet-4-5`.

`db:seed` deletes the snippets in the local database before recreating the
fixtures. Pass `--if-empty` to seed only when the database has no snippets
(Compose uses this so Docker restarts keep user data). `mixed-security-bug` and
`triple-issues` include completed reviews so their findings and apply actions
can be exercised without calling an LLM.

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