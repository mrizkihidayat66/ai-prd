/**
 * Canonical PRD structure — single source of truth.
 *
 * The PRD document has EXACTLY these 17 top-level (`##`) sections and ends with
 * the completion marker. Generation, refinement, and validation all reference
 * this list so the three flows can never drift apart and accidentally grow the
 * document past its intended shape (e.g. appending a redundant "18. Glossary").
 */

/** Ordered list of the 17 canonical top-level section titles (without numbering). */
export const PRD_SECTION_TITLES = [
  'Executive Summary',
  'Problem Statement & Goals',
  'Target Users & Personas',
  'User Stories & Acceptance Criteria',
  'Feature Specification',
  'System Architecture',
  'Technology Stack',
  'API Design',
  'Data Model',
  'UI/UX Flow',
  'Implementation Roadmap',
  'Effort Estimate',
  'Non-Functional Requirements',
  'Success Metrics & KPIs',
  'Risks & Mitigations',
  'Appendix: Sequence Diagrams',
  'References & Resources',
] as const;

/** Total number of canonical top-level sections. */
export const PRD_SECTION_COUNT = PRD_SECTION_TITLES.length; // 17

/** The numbered title of the final canonical section. */
export const PRD_FINAL_SECTION = `${PRD_SECTION_COUNT}. ${PRD_SECTION_TITLES[PRD_SECTION_COUNT - 1]}`;

/** Marker the model must emit once the full PRD is complete. */
export const PRD_COMPLETE_MARKER = '<!-- PRD_COMPLETE -->';

/** Human-readable numbered list, e.g. "1. Executive Summary\n2. ...". */
export const PRD_NUMBERED_SECTIONS = PRD_SECTION_TITLES.map(
  (title, i) => `${i + 1}. ${title}`
).join('\n');

/**
 * Reusable structure-lock rules shared by the generation and refinement prompts.
 * Keeping this in one place guarantees both flows enforce the same contract.
 */
export const PRD_STRUCTURE_RULES = `## Document Structure (STRICT — do not deviate)

The PRD has EXACTLY ${PRD_SECTION_COUNT} top-level (\`##\`) sections, in this order:

${PRD_NUMBERED_SECTIONS}

Structural rules (CRITICAL):
- Output EXACTLY these ${PRD_SECTION_COUNT} sections — no more, no fewer.
- Do NOT add any \`##\` section beyond "${PRD_FINAL_SECTION}". Specifically, do NOT add
  a Glossary, Open Questions, Decisions Needed, Launch Readiness, Success Criteria,
  Appendix (beyond section 16), or any other extra top-level section.
- Do NOT rename, renumber, reorder, merge, or remove any of the ${PRD_SECTION_COUNT} sections.
- The document MUST end at "${PRD_FINAL_SECTION}".
- Sub-sections (\`###\`) and additional detail WITHIN a canonical section are allowed and encouraged.`;

/**
 * Defensive safety net: remove any top-level (`## N.`) section numbered beyond the
 * canonical {@link PRD_SECTION_COUNT} (17). Prompts are the primary guard; this provides
 * a deterministic ceiling even if the model ignores its instructions and appends
 * sections such as "18. Glossary".
 *
 * - Ignores `##` lines inside fenced code blocks (so mermaid/code content is untouched).
 * - Trims any dangling horizontal-rule separator (`---`) left before the removed section.
 * - Re-appends {@link PRD_COMPLETE_MARKER} if the original content contained it, so the
 *   document still signals completion after truncation.
 */
export function stripExtraPrdSections(content: string): string {
  if (!content) return content;

  const lines = content.split('\n');
  let inFence = false;
  let cutIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle fenced code block state on lines that open/close a ``` fence.
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^##\s+(\d+)\./.exec(line);
    if (match && Number.parseInt(match[1], 10) > PRD_SECTION_COUNT) {
      cutIndex = i;
      break;
    }
  }

  // No out-of-range sections — return as-is.
  if (cutIndex === -1) return content;

  // Keep everything before the first out-of-range section, then trim a dangling
  // separator/whitespace that preceded it.
  let kept = lines
    .slice(0, cutIndex)
    .join('\n')
    .trimEnd()
    .replace(/(?:\n+-{3,})+$/g, '')
    .trimEnd();

  if (content.includes(PRD_COMPLETE_MARKER)) {
    kept = `${kept}\n\n${PRD_COMPLETE_MARKER}`;
  }

  return kept;
}
