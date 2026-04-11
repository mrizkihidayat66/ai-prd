# init-ai.local — Implementation Todo

Track all work here. Mark items `[x]` when done. Never lose progress.

---

## Phase 0 — Workspace Instructions
> Independent. Do first. Already included in initial commit.

- [x] Create `.github/copilot-instructions.md` with rules:
  - [x] Git guard (never run git commands without explicit user order)
  - [x] Commit format enforcement
  - [x] TypeScript-only in `src/`, `@/` absolute imports
  - [x] Tailwind-only styling, no inline `style` props
  - [x] React Server Components default, `"use client"` only when needed
  - [x] Prisma for all DB access, no raw SQL
  - [x] API route rules: HTTP codes + Zod validation
  - [x] Architecture constraints (thin routes, framework-agnostic lib/)
  - [x] Never edit `src/generated/`

> ✅ Phase 0 complete.

---

## Phase 1 — Git History Reset
> ⚠️ DESTRUCTIVE — irreversible. Requires explicit user "go ahead".
> Run only AFTER confirming all current work is saved.

- [ ] User confirms "go ahead"
- [ ] Delete `.git/` directory
- [ ] Run `git init`
- [ ] Verify `.gitignore` is correctly configured (already done)
- [ ] Run `git add .`
- [ ] Create single initial commit:
  ```
  chore: initial project setup

  - Next.js 16 + React 19 + TypeScript full-stack app
  - Prisma + SQLite for local data persistence
  - Multi-provider AI (OpenAI, Anthropic, Google, Ollama, LM Studio)
  - shadcn/ui + Tailwind CSS 4 component system
  - ZIP export system with AGENTS.md, skills, plan sections
  ```

---

## Phase 2 — Project Restructure
> Depends on Phase 1. No UI changes yet — file moves only.

### 2.1 Root dir cleanup
- [ ] Move `demos/` → `docs/test-reports/` (Playwright HTML reports)
- [ ] Verify `docs/setup_guide.md` and `docs/usage_guide.md` still resolve

### 2.2 Create new directory structure
- [ ] Create `src/components/common/` directory
- [ ] Create `src/components/layout/` directory
- [ ] Create `src/features/dashboard/components/` directory
- [ ] Create `src/features/dashboard/hooks/` directory
- [ ] Create `src/features/chat/components/` directory
- [ ] Create `src/features/chat/hooks/` directory
- [ ] Create `src/features/plan/components/` directory
- [ ] Create `src/features/plan/hooks/` directory
- [ ] Create `src/features/settings/components/` directory
- [ ] Create `src/constants/` directory
- [ ] Create `src/lib/ai/agents/` directory
- [ ] Create `src/lib/codebase-analyzer/` directory

### 2.3 Move components
- [ ] Move `src/components/mermaid-renderer.tsx` → `src/components/common/mermaid-renderer.tsx`
- [ ] Move `src/components/chat/chat-message-bubble.tsx` → `src/features/chat/components/chat-message-bubble.tsx`
- [ ] Move `src/components/chat/chat-sidebar-panels.tsx` → `src/features/chat/components/chat-sidebar-panels.tsx`
- [ ] Move `src/components/project/project-card.tsx` → `src/features/dashboard/components/project-card.tsx`
- [ ] Move `src/components/settings-dialog.tsx` → `src/features/settings/components/settings-dialog.tsx`

### 2.4 Move hooks
- [ ] Move `src/hooks/use-projects.ts` → `src/features/dashboard/hooks/use-projects.ts`
- [ ] Move `src/hooks/use-clarification.ts` → `src/features/chat/hooks/use-clarification.ts`
- [ ] Move `src/hooks/use-project.ts` → `src/features/plan/hooks/use-project.ts`

### 2.5 Extract plan page components
> `src/app/project/[id]/page.tsx` is currently a monolith. Extract:
- [ ] `src/features/plan/components/plan-viewer.tsx` — read-only section display
- [ ] `src/features/plan/components/section-editor.tsx` — markdown editor for a section
- [ ] `src/features/plan/components/commit-history.tsx` — list of commits/snapshots
- [ ] `src/features/plan/components/context-logs.tsx` — list of context log entries
- [ ] `src/features/plan/components/snapshot-list.tsx` — snapshot restore UI
- [ ] `src/features/plan/components/regenerate-dialog.tsx` — confirm/trigger section regeneration
- [ ] Refactor `src/app/project/[id]/page.tsx` to import from above

### 2.6 Extract chat page components
> `src/app/new/page.tsx` is also a monolith. Extract:
- [ ] `src/features/chat/components/clarification-chat.tsx` — the chat panel
- [ ] Refactor `src/app/new/page.tsx` to import from features/chat

### 2.7 Create new shared files
- [ ] Create `src/components/layout/app-shell.tsx` — sidebar nav + layout wrapper
- [ ] Create `src/constants/index.ts` — provider IDs, plan section names, status labels, specialist agent names

### 2.8 Update all import paths
- [ ] Update all `@/components/chat/...` → `@/features/chat/components/...`
- [ ] Update all `@/components/project/...` → `@/features/dashboard/components/...`
- [ ] Update all `@/components/settings-dialog` → `@/features/settings/components/settings-dialog`
- [ ] Update all `@/components/mermaid-renderer` → `@/components/common/mermaid-renderer`
- [ ] Update all `@/hooks/use-projects` → `@/features/dashboard/hooks/use-projects`
- [ ] Update all `@/hooks/use-clarification` → `@/features/chat/hooks/use-clarification`
- [ ] Update all `@/hooks/use-project` → `@/features/plan/hooks/use-project`
- [ ] Run `npm run build` — must pass with zero errors

### 2.9 Remove old empty directories
- [ ] Remove `src/components/chat/` (after moving)
- [ ] Remove `src/components/project/` (after moving)
- [ ] Remove `src/hooks/` (after moving all 3 hooks)

---

## Phase 3 — UI/UX Redesign
> Depends on Phase 2 (file locations must be stable).
> Rebuild visual layer only — no logic changes.

### 3.1 Design system foundation
- [ ] Rewrite `src/app/globals.css`:
  - [ ] Add CSS vars: `--background`, `--surface`, `--surface-raised`
  - [ ] Add CSS vars: `--color-success`, `--color-warning`, `--color-danger`, `--color-info`
  - [ ] Remove hardcoded `#000a0e` / `#0f172a` — replace with zinc Tailwind tokens
  - [ ] Remove dual violet+cyan gradient utilities
  - [ ] Add single brand accent: indigo-500/600 (`--color-accent`)
  - [ ] Set font: Geist Sans (replace Outfit), keep JetBrains Mono for code
  - [ ] Define consistent spacing scale (padding vars)

### 3.2 App Shell
- [ ] Implement `src/components/layout/app-shell.tsx`:
  - [ ] Left sidebar with branding + nav links (Dashboard, Settings)
  - [ ] Collapsible on mobile
  - [ ] Page content slot
- [ ] Update `src/app/layout.tsx` to use AppShell
- [ ] Add lucide-react icons to nav items (replace emoji/ad-hoc icons)

### 3.3 Dashboard (`/`)
- [ ] Rewrite `src/app/page.tsx`:
  - [ ] TopBar: search input + "New Project" button (lucide Plus icon)
  - [ ] Real empty state component (illustration + CTA)
  - [ ] Remove emoji from headings
  - [ ] Use indigo accent for primary actions
- [ ] Rewrite `src/features/dashboard/components/project-card.tsx`:
  - [ ] lucide icons (no emoji)
  - [ ] Card with shadow + hover ring effect
  - [ ] Consistent badge variants for status
- [ ] Create `src/features/dashboard/components/empty-state.tsx`
- [ ] Create `src/features/dashboard/components/project-grid.tsx`

### 3.4 Chat page (`/new`)
- [ ] Rewrite `src/app/new/page.tsx`:
  - [ ] 60/40 split layout (chat left, sidebar right)
  - [ ] Import from features/chat components
- [ ] Rewrite `src/features/chat/components/chat-message-bubble.tsx`:
  - [ ] User right / assistant left
  - [ ] Semantic CSS classes (not inline role colors)
  - [ ] Clean markdown rendering, no emoji decoration
- [ ] Rewrite `src/features/chat/components/chat-sidebar-panels.tsx` (RequirementsRadar + PlanProgressPanel):
  - [ ] RequirementsRadar: replace emoji grid → lucide icon grid with progress indicators
  - [ ] PlanProgressPanel: section checklist with status icons + agent attribution
- [ ] Add "Import Context" section at top of chat page (Phase 4A UI placeholder — can be wired later)

### 3.5 Plan Editor (`/project/[id]`)
- [ ] Rewrite `src/app/project/[id]/page.tsx` (imports from features/plan):
  - [ ] Left sidebar: collapsible section navigation (replace tab bar)
  - [ ] Main area: view (rendered markdown) / edit (textarea) toggle
  - [ ] Right panel: Mermaid diagram preview for diagram sections
- [ ] Rewrite `src/features/plan/components/plan-viewer.tsx`:
  - [ ] Section content with proper typography
  - [ ] Edit toggle button
- [ ] Rewrite `src/features/plan/components/section-editor.tsx`:
  - [ ] Textarea with save/cancel
  - [ ] Agent attribution badge: "Generated by [Agent Name]"
- [ ] Move commit/snapshot history into `src/features/plan/components/commit-history.tsx`:
  - [ ] Implemented as slide-over drawer (not tabs)
- [ ] Fix `src/features/settings/components/settings-dialog.tsx`:
  - [ ] Group settings into labelled sections
  - [ ] Add descriptions under each label

### 3.6 Shared component cleanup
- [ ] Standardize button variants across all pages: primary / secondary / ghost / destructive only
- [ ] Add loading skeleton to `src/components/common/mermaid-renderer.tsx`
- [ ] Add error fallback block to mermaid renderer
- [ ] Remove all `style={{...}}` inline props from components
- [ ] Remove hardcoded hex color strings from component files
- [ ] Run `npm run build` and `npm run lint` — must pass clean

---

## Phase 4A — Local Codebase Analyzer
> Can start after Phase 2. Parallel with 4B and 4C.

- [ ] Add `codebaseContext` JSON field to `Project` model in `prisma/schema.prisma`
- [ ] Create and run Prisma migration: `prisma migrate dev --name add-codebase-context`
- [ ] Create `src/types/index.ts` — add `CodebaseContext` type:
  ```ts
  {
    detectedStack: string[];
    description: string;
    folderTree: string;
    keyEntities: string[];
    envVars: string[];
    rawFiles: Record<string, string>;
  }
  ```
- [ ] Create `src/lib/codebase-analyzer/index.ts`:
  - [ ] `analyzeLocalPath(absPath: string): Promise<CodebaseContext>`
  - [ ] Validate path: no `..`, must be absolute, `path.resolve()` normalization
  - [ ] Allow-list extensions only: `.json`, `.ts`, `.tsx`, `.md`, `.prisma`, `.yaml`, `.toml`, `.env.example`
  - [ ] Never read `.env`, binaries, or system dirs
  - [ ] Max depth: 4 | Max files: 100 | Max file size: 50KB
- [ ] Create `src/lib/codebase-analyzer/extractors.ts`:
  - [ ] `extractFromPackageJson(content: string)` → stack, deps, scripts
  - [ ] `extractFromReadme(content: string)` → description
  - [ ] `extractFromPrismaSchema(content: string)` → model names, key entities
  - [ ] `extractFolderTree(rootPath: string, maxDepth: number)` → tree string
  - [ ] `extractEnvExample(content: string)` → env var names (keys only, no values)
- [ ] Create `src/app/api/projects/[id]/analyze-path/route.ts`:
  - [ ] `POST` handler — input: `{ path: string }`
  - [ ] Validate path (return 400 on traversal attempt)
  - [ ] Call `analyzeLocalPath()`, store result in DB
  - [ ] Return structured `CodebaseContext`
- [ ] Create `src/services/codebase-service.ts`:
  - [ ] `analyzePath(projectId: string, path: string): Promise<CodebaseContext>`
- [ ] Create `src/features/chat/hooks/use-codebase-analyzer.ts`:
  - [ ] State: `path`, `analyzing`, `context`, `error`
  - [ ] Action: `analyze(path: string)`
- [ ] Create `src/features/chat/components/codebase-context-panel.tsx`:
  - [ ] Path input + "Analyze" button
  - [ ] Shows: detected stack chips, folder tree preview, description
  - [ ] Loading state, error state
- [ ] Wire `CodebaseContext` into clarification AI system prompt (`src/app/api/chat/route.ts`)
- [ ] Write integration test: valid path → returns context; `../../etc` path → 400

---

## Phase 4B — Multi-Specialist Plan Generation
> Can start after Phase 2. Parallel with 4A and 4C.

- [ ] Create `src/lib/ai/agents/pm.ts` — system prompt: PRD, user stories, requirements, effort estimation
- [ ] Create `src/lib/ai/agents/architect.ts` — system prompt: clean architecture, patterns, Mermaid diagrams
- [ ] Create `src/lib/ai/agents/backend.ts` — system prompt: API design, DB schema, server patterns
- [ ] Create `src/lib/ai/agents/security.ts` — system prompt: threat modeling, OWASP, auth, security rules
- [ ] Create `src/lib/ai/agents/frontend.ts` — system prompt: UI/UX flows, component design, state management
- [ ] Create `src/lib/ai/agents/devops.ts` — system prompt: deployment, CI/CD, infra, environment
- [ ] Create `src/lib/ai/agents/index.ts`:
  - [ ] Export all agents
  - [ ] Map section name → agent: `prd/workflow/effortEstimate → pm`, `architecture/diagrams → architect`, `apiSpec/dbSchema → backend`, `rules → security`, `taskList → orchestrated`, `promptContext → pm+architect`
- [ ] Create `src/lib/ai/agents/orchestrator.ts`:
  - [ ] `runParallel(sections: string[], projectContext)` — groups independent sections, uses `Promise.all()`
  - [ ] `runSequential(sections: string[], deps)` — runs taskList after apiSpec/dbSchema
- [ ] Refactor `src/app/api/projects/[id]/plan/route.ts`:
  - [ ] Route each section through its agent (not single default model)
  - [ ] Use orchestrator for parallel/sequential execution
  - [ ] Store `generatedBy` metadata with each section (in Plan JSON or separate field)
- [ ] Update `src/features/plan/components/section-editor.tsx`:
  - [ ] Show "Generated by [Agent Name]" attribution badge
- [ ] Update streaming progress in `src/features/chat/components/chat-sidebar-panels.tsx`:
  - [ ] Show "Architect Agent generating architecture..." per section
- [ ] Run build and test plan generation end-to-end

---

## Phase 4C — Tech-Stack-Aware Skills Export
> Can start after Phase 2. Parallel with 4A and 4B.

- [ ] Update `src/lib/export/skills-builder.ts`:
  - [ ] Add function `detectTechStack(plan: Plan, codebaseContext?: CodebaseContext): string[]`
  - [ ] Conditional skill generation:
    - [ ] If Next.js detected → add `nextjs-patterns` SKILL.md
    - [ ] If Prisma detected → add `prisma-patterns` SKILL.md
    - [ ] If auth mentioned → add `auth-implementation` SKILL.md
    - [ ] If testing in plan → add `testing-strategy` SKILL.md
    - [ ] If Docker/deployment detected → add `deployment-workflow` SKILL.md
  - [ ] Always include 4 base skills: `implement-feature`, `write-tests`, `review-pr`, `update-progress`
- [ ] Update `src/lib/export/agents-md-builder.ts`:
  - [ ] Expand from 4 → 7 specialist agents in exported AGENTS.md:
    - [ ] `senior-architect`
    - [ ] `backend-engineer`
    - [ ] `frontend-engineer`
    - [ ] `security-analyst`
    - [ ] `qa-engineer`
    - [ ] `devops-engineer`
    - [ ] `product-manager`
- [ ] Update `src/lib/export/zip-builder.ts` to pass `codebaseContext` to skills builder if available
- [ ] Verify exported ZIP structure with new skills and agents

---

## Ongoing / Verification

- [ ] After Phase 2: `npm run build` — zero TypeScript errors
- [ ] After Phase 2: `npm run lint` — ESLint clean
- [ ] After Phase 3: Visual review at 1280px, 768px, 375px
- [ ] After Phase 3: All 3 routes render correctly
- [ ] After Phase 4A: Path traversal attack test → 400
- [ ] After Phase 4A: Valid path → extracts context, shows in UI
- [ ] After Phase 4B: Plan sections show agent attribution in UI
- [ ] After Phase 4B: Streaming shows agent name per section
- [ ] After Phase 4C: Export ZIP contains 7 specialist agents + dynamic skills
- [ ] Final: Full end-to-end test: create project → analyze path → chat → generate plan → export ZIP

---

## Notes

- **Never run git commands** without explicit user instruction
- Phase 1 (git reset) is the only phase that requires a "go ahead" before starting
- Phases 4A/B/C are independent of each other and can be done in any order after Phase 2
- Generated files in `src/generated/prisma/` must never be edited manually
- The `demos/` folder rename is part of Phase 2.1 (first step after git reset)
