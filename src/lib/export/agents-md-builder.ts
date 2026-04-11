import type { Plan, Project } from '@/generated/prisma/client';
import { extractTechStack, extractTopRules, extractSummary } from './plan-extractor';

export type AgentFiles = {
  rootAgentsMd: string;
  backendMd: string;
  frontendMd: string;
  testingMd: string;
  architectMd: string;
};

// ─── Root AGENTS.md ──────────────────────────────────────────────────────────

function buildRootAgentsMd(project: Project, plan: Plan): string {
  const topRules = extractTopRules(plan.rules, 5);
  const techSummary = extractTechStack(plan.architecture);
  const description = project.description || extractSummary(plan.prd, 200);

  return [
    '---',
    `description: ${project.name} — Agent Bootstrap`,
    '---',
    '',
    `# ${project.name}`,
    '',
    description,
    '',
    '## Tech Stack',
    '',
    techSummary,
    '',
    '## Key Rules',
    '',
    topRules,
    '',
    '## Task List',
    '',
    'See `.init-ai/initial-plan/task.md` — check off tasks as you complete them.',
    '',
    '## Available Skills',
    '',
    '- `/implement-feature` — Build a new feature end-to-end',
    '- `/write-tests` — Add test coverage for any module',
    '- `/review-pr` — Code review against project rules',
    '- `/update-progress` — Log progress and check off tasks',
    '',
    '## Full Documentation',
    '',
    'See `init-ai.md` for the complete reference index.',
  ].join('\n');
}

// ─── Backend Agent ────────────────────────────────────────────────────────────

function buildBackendMd(project: Project, plan: Plan): string {
  const techSummary = extractTechStack(plan.architecture);
  const rules = extractTopRules(plan.rules, 6);
  const apiSummary = extractSummary(plan.apiSpec, 300);

  return [
    '---',
    `description: Backend specialist agent for ${project.name}`,
    'allowed-tools: Read, Edit, Bash, Grep, Glob',
    'when_to_use: Use when working on API routes, database models, services, or server-side business logic',
    '---',
    '',
    `# Backend Agent — ${project.name}`,
    '',
    '## Role',
    '',
    `You are a backend specialist for **${project.name}**. Implement server-side code`,
    'correctly, following the project\'s architecture and coding standards.',
    '',
    '## Tech Stack',
    '',
    techSummary,
    '',
    '## Responsibilities',
    '',
    '- API route implementation',
    '- Database model and migration management',
    '- Business logic and service layer',
    '- Authentication and authorization',
    '- Server-side validation and error handling',
    '',
    '## Coding Rules',
    '',
    rules,
    '',
    '## API Overview',
    '',
    apiSummary || '_See `.init-ai/initial-plan/api-spec.md` for the full specification._',
    '',
    '## Key References',
    '',
    '- API Spec: `.init-ai/initial-plan/api-spec.md`',
    '- DB Schema: `.init-ai/initial-plan/db-schema.md`',
    '- Architecture: `.init-ai/initial-plan/architecture.md`',
    '- Full Rules: `.init-ai/workspace-config/rules.md`',
    '- Task List: `.init-ai/initial-plan/task.md`',
  ].join('\n');
}

// ─── Frontend Agent ───────────────────────────────────────────────────────────

function buildFrontendMd(project: Project, plan: Plan): string {
  const techSummary = extractTechStack(plan.architecture);
  const rules = extractTopRules(plan.rules, 6);
  const prdSummary = extractSummary(plan.prd, 250);

  return [
    '---',
    `description: Frontend specialist agent for ${project.name}`,
    'allowed-tools: Read, Edit, Bash, Grep, Glob',
    'when_to_use: Use when working on UI components, styling, client-side state, or user experience',
    '---',
    '',
    `# Frontend Agent — ${project.name}`,
    '',
    '## Role',
    '',
    `You are a frontend specialist for **${project.name}**. Implement user interfaces`,
    'that are polished, accessible, and well-integrated with backend APIs.',
    '',
    '## Tech Stack',
    '',
    techSummary,
    '',
    '## Responsibilities',
    '',
    '- UI component development',
    '- Client-side state management',
    '- API integration (data fetching, mutations)',
    '- Styling and responsive design',
    '- Accessibility and UX polish',
    '',
    '## Product Context',
    '',
    prdSummary || '_See `.init-ai/initial-plan/prd.md` for user stories._',
    '',
    '## Coding Rules',
    '',
    rules,
    '',
    '## Key References',
    '',
    '- PRD (user stories): `.init-ai/initial-plan/prd.md`',
    '- API Spec (endpoints): `.init-ai/initial-plan/api-spec.md`',
    '- Diagrams (user flows): `.init-ai/initial-plan/diagrams.md`',
    '- Full Rules: `.init-ai/workspace-config/rules.md`',
    '- Task List: `.init-ai/initial-plan/task.md`',
  ].join('\n');
}

// ─── Testing Agent ────────────────────────────────────────────────────────────

function buildTestingMd(project: Project, plan: Plan): string {
  const techSummary = extractTechStack(plan.architecture);
  const rules = extractTopRules(plan.rules, 5);

  return [
    '---',
    `description: QA and testing specialist agent for ${project.name}`,
    'allowed-tools: Read, Edit, Bash, Grep, Glob',
    'when_to_use: Use when writing tests, improving coverage, or verifying implementations against acceptance criteria',
    '---',
    '',
    `# Testing Agent — ${project.name}`,
    '',
    '## Role',
    '',
    `You are a QA and testing specialist for **${project.name}**. Write comprehensive,`,
    'maintainable tests that verify correctness and prevent regressions.',
    '',
    '## Tech Stack',
    '',
    techSummary,
    '',
    '## Testing Responsibilities',
    '',
    '- Unit tests for business logic and utilities',
    '- Integration tests for API endpoints',
    '- Component tests for UI',
    '- End-to-end test scenarios',
    '- Test coverage analysis and improvement',
    '',
    '## Testing Approach',
    '',
    '1. Always read the code under test before writing tests',
    '2. Test behavior, not implementation details',
    '3. Write tests that serve as documentation',
    '4. Cover happy paths, edge cases, and error scenarios',
    '5. Keep tests fast, isolated, and deterministic',
    '',
    '## Rules',
    '',
    rules,
    '',
    '## Key References',
    '',
    '- PRD (acceptance criteria): `.init-ai/initial-plan/prd.md`',
    '- API Spec (contracts): `.init-ai/initial-plan/api-spec.md`',
    '- Architecture (patterns): `.init-ai/initial-plan/architecture.md`',
    '- Full Rules: `.init-ai/workspace-config/rules.md`',
    '- Task List: `.init-ai/initial-plan/task.md`',
  ].join('\n');
}

// ─── Architect Agent ──────────────────────────────────────────────────────────

function buildArchitectMd(project: Project, plan: Plan): string {
  const techSummary = extractTechStack(plan.architecture);
  const topRules = extractTopRules(plan.rules, 5);
  const archSummary = extractSummary(plan.architecture, 350);

  return [
    '---',
    `description: Architecture review agent for ${project.name}`,
    'allowed-tools: Read, Edit, Grep, Glob',
    'when_to_use: Use for design decisions, refactoring plans, architecture reviews, and evaluating technical approaches',
    '---',
    '',
    `# Architect Agent — ${project.name}`,
    '',
    '## Role',
    '',
    `You are an architecture reviewer for **${project.name}**. Evaluate technical approaches,`,
    'guide refactoring, and ensure all implementations align with the architectural vision.',
    '',
    '## System Architecture',
    '',
    archSummary || '_See `.init-ai/initial-plan/architecture.md`._',
    '',
    '## Tech Stack',
    '',
    techSummary,
    '',
    '## Architectural Constraints',
    '',
    topRules,
    '',
    '## Review Framework',
    '',
    'When reviewing code or proposals, evaluate:',
    '',
    '1. **Correctness** — Does it implement the spec correctly?',
    '2. **Architecture fit** — Does it follow established patterns?',
    '3. **Maintainability** — Is it easy to understand and change?',
    '4. **Performance** — Are there obvious bottlenecks?',
    '5. **Security** — Are there vulnerabilities?',
    '',
    '## Key References',
    '',
    '- Architecture: `.init-ai/initial-plan/architecture.md`',
    '- Diagrams: `.init-ai/initial-plan/diagrams.md`',
    '- API Spec: `.init-ai/initial-plan/api-spec.md`',
    '- DB Schema: `.init-ai/initial-plan/db-schema.md`',
    '- Full Rules: `.init-ai/workspace-config/rules.md`',
  ].join('\n');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildAgentFiles(project: Project, plan: Plan): AgentFiles {
  return {
    rootAgentsMd: buildRootAgentsMd(project, plan),
    backendMd: buildBackendMd(project, plan),
    frontendMd: buildFrontendMd(project, plan),
    testingMd: buildTestingMd(project, plan),
    architectMd: buildArchitectMd(project, plan),
  };
}
