/**
 * Shared markdown parsing utilities for plan export builders.
 * These extract concise, human-readable summaries from AI-generated markdown sections.
 */

/**
 * Extract a plain-text summary from a markdown string.
 * Strips code blocks, headings, tables, bold/italic markers, and link syntax.
 */
export function extractSummary(content: string | null | undefined, maxChars = 350): string {
  if (!content) return '_Not generated._';

  const text = content
    .replace(/```[\s\S]*?```/g, '') // remove fenced code blocks
    .replace(/`[^`]+`/g, '') // remove inline code
    .replace(/^#{1,6}\s+.+$/gm, '') // remove headings
    .replace(/^\|.+\|$/gm, '') // remove table rows
    .replace(/\*\*?([^*|]+)\*\*?/g, '$1') // unwrap bold/italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // unwrap links
    .replace(/^\s*[-*+>]\s*/gm, '') // strip list/quote markers
    .replace(/^\s*\d+\.\s*/gm, '') // strip numbered list markers
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 15)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (text.length <= maxChars) return text;
  const truncated = text.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxChars * 0.75 ? truncated.substring(0, lastSpace) : truncated) + '…';
}

/**
 * Extract bullet/list items from markdown and return them as an array of plain strings.
 */
export function extractBulletPoints(content: string | null | undefined, n = 6): string[] {
  if (!content) return [];
  return content
    .split('\n')
    .filter((l) => /^\s*[-*+]\s+.{10,}/.test(l) || /^\s*\d+\.\s+.{10,}/.test(l))
    .slice(0, n)
    .map((l) => l.replace(/^\s*[-*+\d.]+\s*/, '').replace(/\*\*?([^*]+)\*\*?/g, '$1').trim());
}

/**
 * Extract the content of a named section from markdown (up to the next heading).
 */
export function extractSection(
  content: string | null | undefined,
  headingPattern: RegExp,
  maxChars = 500
): string | null {
  if (!content) return null;
  const match = content.match(headingPattern);
  if (!match || match.index === undefined) return null;
  const rest = content.substring(match.index + match[0].length);
  const nextHeadingIdx = rest.search(/^#{1,4}\s/m);
  const section = nextHeadingIdx > 0 ? rest.substring(0, nextHeadingIdx) : rest.substring(0, 1500);
  return extractSummary(section, maxChars) || null;
}

/**
 * Extract the tech stack from an architecture document.
 * Handles table format (| Frontend | React |) and bullet format (- **Frontend**: React).
 */
export function extractTechStack(architecture: string | null | undefined): string {
  if (!architecture) return '_See `.init-ai/initial-plan/architecture.md`._';

  // Try to find a "Tech Stack" section
  const stackSection = extractSection(
    architecture,
    /^#{1,4}\s+(?:tech(?:nology)?\s+stack|technologies?|stack)\s*$/im,
    600
  );

  if (stackSection) {
    // Check for table rows in the raw section
    const rawSection = (() => {
      const match = architecture.match(/^#{1,4}\s+(?:tech(?:nology)?\s+stack|technologies?|stack)\s*$/im);
      if (!match || match.index === undefined) return '';
      const rest = architecture.substring(match.index + match[0].length);
      const end = rest.search(/^#{1,4}\s/m);
      return (end > 0 ? rest.substring(0, end) : rest).trim();
    })();

    const tableRows = rawSection.match(/^\|.+\|.+\|$/gm);
    if (tableRows && tableRows.length > 1) {
      return tableRows
        .filter((r) => !/^[-|:\s]+$/.test(r))
        .filter((r) => !/category|technology|tool|stack|layer/i.test(r))
        .slice(0, 6)
        .map((r) => {
          const cols = r
            .split('|')
            .map((c) => c.replace(/\*\*?([^*]+)\*\*?/g, '$1').trim())
            .filter((c) => c.length > 0);
          return cols.length >= 2 ? `- **${cols[0]}**: ${cols[1]}` : `- ${cols.join(': ')}`;
        })
        .join('\n');
    }

    const bullets = extractBulletPoints(rawSection, 6);
    if (bullets.length > 0) return bullets.map((b) => `- ${b}`).join('\n');
    return stackSection;
  }

  // Fallback: scan for known tech keywords
  const knownTech = architecture.match(
    /\b(React|Next\.js|Vue|Nuxt|Angular|Svelte|TypeScript|JavaScript|Python|FastAPI|Django|Flask|Rails|Laravel|Go|Rust|Node(?:\.js)?|Express|NestJS|Fastify|Hono|PostgreSQL|MySQL|MongoDB|Redis|SQLite|Prisma|Drizzle|Supabase|Firebase|Vercel|Netlify|AWS|GCP|Azure|Docker|Kubernetes|GraphQL|REST|tRPC|Tailwind)\b/gi
  );
  if (knownTech) {
    const unique = Array.from(new Set(knownTech.map((t) => t.trim())));
    return `Detected stack: ${unique.slice(0, 8).join(', ')}`;
  }

  return extractSummary(architecture, 250);
}

/**
 * Extract the top N coding rules as a formatted bullet list.
 */
export function extractTopRules(rules: string | null | undefined, n = 6): string {
  if (!rules) return '- Follow existing code patterns\n- Write clean, documented code\n- Test all changes';
  const bullets = extractBulletPoints(rules, n);
  if (bullets.length > 0) return bullets.map((b) => `- ${b}`).join('\n');
  return extractSummary(rules, 400);
}

/**
 * Extract the problem statement from a PRD.
 */
export function extractProblemStatement(prd: string | null | undefined): string {
  if (!prd) return '_See `.init-ai/initial-plan/prd.md`._';
  const section =
    extractSection(prd, /^#{1,4}\s+(?:problem|overview|summary|objective|goal)\s*$/im, 350) ||
    extractSummary(prd, 350);
  return section || '_See `.init-ai/initial-plan/prd.md`._';
}

/**
 * Extract key entity names from a database schema document (ERD or Prisma-style).
 */
export function extractKeyEntities(dbSchema: string | null | undefined): string {
  if (!dbSchema) return '_See `.init-ai/initial-plan/db-schema.md`._';

  // Match entity / model names: PascalCase words followed by { or model keyword
  const matches = dbSchema.match(/\b([A-Z][a-zA-Z]{2,})\s*(?:\{|model\b)/g);
  if (matches && matches.length > 0) {
    const names = Array.from(new Set(matches.map((m) => m.replace(/[\s{]/g, '')))).slice(0, 8);
    return names.map((n) => `- \`${n}\``).join('\n');
  }

  return extractSummary(dbSchema, 200);
}
