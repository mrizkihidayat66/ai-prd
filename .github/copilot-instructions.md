# Copilot Instructions

## Git

**Never** run any git command (`git init`, `git commit`, `git push`, `git reset`, `git branch`, `git merge`, `git rebase`, `git stash`, etc.) without explicit user instruction.

### Commit message format

```
<prefix>: simple summary

- detail 1
- detail 2
- ...
```

**Prefixes:** `feat` / `fix` / `refactor` / `style` / `chore` / `docs` / `test` / `perf`

Each commit must leave the project in a working, buildable state.

---

## TypeScript

- No `.js` files inside `src/` — TypeScript only
- Always use absolute imports with the `@/` alias (configured in `tsconfig.json`)
- No `any` types — use explicit types or `unknown` with narrowing
- Prefer `type` over `interface` for object shapes; use `interface` only for extensible contracts

---

## Styling

- **Tailwind CSS only** — no inline `style={{...}}` props
- Use shadcn/ui components first; create custom components only when shadcn doesn't cover the need
- Use CSS variables from `globals.css` for color tokens (`--color-accent`, `--background`, etc.), never hardcode hex values in component files
- Icons: use `lucide-react` consistently — no emoji as icons

---

## React / Next.js

- **Server Components by default** — only add `"use client"` when interactivity or browser APIs are required
- Route groups (`(root)`, `(workspace)`) for logical page organization — no effect on URL
- API routes stay thin: validate input → call `lib/` → return response. No business logic inside route handlers
- Use Next.js `loading.tsx` and `error.tsx` files for async boundaries

---

## Database

- **Prisma for all DB access** — never write raw SQL
- Never edit files in `src/generated/prisma/` — they are auto-generated
- After schema changes: run `npx prisma migrate dev --name <descriptive-name>`
- After pulling schema changes: run `npx prisma generate`

---

## API Design

- Return proper HTTP status codes: `200`, `201`, `400`, `404`, `409`, `500`
- **Validate all inputs at API boundaries using Zod** — reject invalid input with `400` before any DB call
- Sanitize and validate file paths to prevent path traversal (reject `..`, normalize with `path.resolve()`)
- Never expose raw Prisma errors to the client — map to safe error messages

---

## Architecture

```
src/
  app/          ← Route entry points only. Thin pages.
  features/     ← Feature-scoped UI components, hooks, and local state
  components/   ← Truly shared UI: common/ and layout/ only
  lib/          ← Framework-agnostic logic: AI, export, codebase-analyzer
  services/     ← Client-only data-fetching wrappers (no server logic)
  types/        ← Shared TypeScript types only
  constants/    ← App-wide enums and config values
```

- `lib/` must never import from `app/`, `features/`, or `services/`
- `services/` is client-side only — never used in API routes or server components
- Collocate feature-specific hooks and components inside `features/<name>/`

---

## Project-specific

- See [todo.md](.github/todo.md) for the full implementation plan and task tracking
- See [docs/setup_guide.md](docs/setup_guide.md) for provider setup
- See [docs/usage_guide.md](docs/usage_guide.md) for usage workflows
