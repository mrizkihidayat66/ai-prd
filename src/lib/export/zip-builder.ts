import JSZip from 'jszip';
import type { Plan, Project } from '@/generated/prisma/client';
import { buildInitAiMd } from './init-ai-md-builder';
import { buildAgentFiles } from './agents-md-builder';
import { buildSkillFiles } from './skills-builder';

// ─── ZIP structure ────────────────────────────────────────────────────────────
//
//  init-ai.md                                ← PRIMARY entry point (summaries + references)
//  AGENTS.md                                 ← Universal agent bootstrap (auto-read by Claude Code, OpenCode)
//  .gitignore
//  .init-ai/
//    project.json                            ← Machine-readable metadata
//    initial-plan/                           ← Full plan documents
//      prd.md, architecture.md, task.md,
//      api-spec.md, db-schema.md, workflow.md,
//      diagrams.md, effort-estimate.md
//    workspace-config/                       ← Agent and tool configuration
//      rules.md                              ← Source of truth for coding conventions
//      .cursorrules                          ← Cursor IDE format
//      copilot-instructions.md              ← GitHub Copilot format
//      agents/                              ← Specialized agent role files
//        backend.md, frontend.md, testing.md, architect.md
//      skills/                              ← Reusable workflow skills (SKILL.md format)
//        implement-feature/SKILL.md
//        write-tests/SKILL.md
//        review-pr/SKILL.md
//        update-progress/SKILL.md
//    context/
//      .gitkeep                             ← Agents append progress.md here
//  .agent/                                  ← Antigravity-compatible copy
//    rules.md
//    skills/
//      implement-feature/SKILL.md
//      write-tests/SKILL.md
//      review-pr/SKILL.md
//      update-progress/SKILL.md

export function buildProjectZip(project: Project, plan: Plan): JSZip {
  const zip = new JSZip();

  // ─── Root files ─────────────────────────────────────────────────────────────

  zip.file('init-ai.md', buildInitAiMd(project, plan));

  const agents = buildAgentFiles(project, plan);
  zip.file('AGENTS.md', agents.rootAgentsMd);

  zip.file(
    '.gitignore',
    [
      '# init-ai — project config (keep local, out of VCS)',
      '.init-ai/',
      '',
      '# Agent tool configs',
      '.cursorrules',
      '.agent/',
      '.claude/',
      '.github/copilot-instructions.md',
      '',
      '# Common ignores',
      'node_modules/',
      '.env',
      '.env.local',
      'dist/',
      'build/',
      '.next/',
    ].join('\n')
  );

  // ─── .init-ai/project.json ──────────────────────────────────────────────────

  zip.file(
    '.init-ai/project.json',
    JSON.stringify(
      {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        planVersion: plan.version,
        exportedAt: new Date().toISOString(),
        generator: 'init-ai',
        generatorVersion: '2.0',
        structure: {
          entryPoint: 'init-ai.md',
          agentBootstrap: 'AGENTS.md',
          plans: '.init-ai/initial-plan/',
          workspaceConfig: '.init-ai/workspace-config/',
          context: '.init-ai/context/',
        },
      },
      null,
      2
    )
  );

  // ─── .init-ai/initial-plan/ ─────────────────────────────────────────────────

  const planDir = '.init-ai/initial-plan/';

  if (plan.prd) zip.file(`${planDir}prd.md`, plan.prd);
  if (plan.architecture) zip.file(`${planDir}architecture.md`, plan.architecture);
  if (plan.taskList) zip.file(`${planDir}task.md`, plan.taskList);
  if (plan.apiSpec) zip.file(`${planDir}api-spec.md`, plan.apiSpec);
  if (plan.dbSchema) zip.file(`${planDir}db-schema.md`, plan.dbSchema);
  if (plan.workflow) zip.file(`${planDir}workflow.md`, plan.workflow);
  if (plan.diagrams) zip.file(`${planDir}diagrams.md`, plan.diagrams);
  if (plan.effortEstimate) zip.file(`${planDir}effort-estimate.md`, plan.effortEstimate);

  // ─── .init-ai/workspace-config/ ─────────────────────────────────────────────

  const wcDir = '.init-ai/workspace-config/';

  if (plan.rules) {
    zip.file(`${wcDir}rules.md`, plan.rules);
    // IDE-native formats
    zip.file(`${wcDir}.cursorrules`, plan.rules);
    zip.file(
      `${wcDir}copilot-instructions.md`,
      `# Copilot Instructions for ${project.name}\n\n${plan.rules}`
    );
  }

  // Agent role files
  zip.file(`${wcDir}agents/backend.md`, agents.backendMd);
  zip.file(`${wcDir}agents/frontend.md`, agents.frontendMd);
  zip.file(`${wcDir}agents/testing.md`, agents.testingMd);
  zip.file(`${wcDir}agents/architect.md`, agents.architectMd);

  // Skill files — primary location
  const skills = buildSkillFiles(project, plan);
  zip.file(`${wcDir}skills/implement-feature/SKILL.md`, skills.implementFeature);
  zip.file(`${wcDir}skills/write-tests/SKILL.md`, skills.writeTests);
  zip.file(`${wcDir}skills/review-pr/SKILL.md`, skills.reviewPr);
  zip.file(`${wcDir}skills/update-progress/SKILL.md`, skills.updateProgress);

  // ─── .init-ai/context/ ──────────────────────────────────────────────────────

  zip.file('.init-ai/context/.gitkeep', '# AI agents: append progress.md here as you implement.\n');

  // ─── .agent/ — Antigravity-compatible copy ──────────────────────────────────

  if (plan.rules) {
    zip.file('.agent/rules.md', plan.rules);
  }
  zip.file('.agent/skills/implement-feature/SKILL.md', skills.implementFeature);
  zip.file('.agent/skills/write-tests/SKILL.md', skills.writeTests);
  zip.file('.agent/skills/review-pr/SKILL.md', skills.reviewPr);
  zip.file('.agent/skills/update-progress/SKILL.md', skills.updateProgress);

  // ─── .github/ — GitHub Copilot ──────────────────────────────────────────────

  if (plan.rules) {
    zip.file(
      '.github/copilot-instructions.md',
      `# Copilot Instructions for ${project.name}\n\n${plan.rules}`
    );
  }

  return zip;
}
