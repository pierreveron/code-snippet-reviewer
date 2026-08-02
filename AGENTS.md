<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent guidelines

## Git commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>
```

Types:
- `feat` — new user-facing capability
- `fix` — bug fix
- `docs` — README or comments only
- `chore` — tooling, deps, config, scaffolding
- `refactor` — internal change, no behavior change
- `style` — formatting only
- `test` — tests only

Rules:
- Imperative mood, lowercase description, no trailing period
- One logical change per commit; commit as you go (not one batch at the end)
- Examples: `feat: add snippet create form`, `chore: add docker compose`
