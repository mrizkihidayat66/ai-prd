'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type Props = {
  chart: string;
};

/**
 * Sanitize mermaid syntax to fix common LLM generation mistakes.
 * This runs before parse/render to maximize success rate.
 */
function sanitizeMermaidSyntax(raw: string): string {
  let code = raw.trim();

  // Remove markdown fencing if LLM wraps it in ```mermaid ... ```
  code = code.replace(/^```(?:mermaid)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Fix HTML entities that LLMs sometimes produce
  code = code
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Fix common LLM mistakes in node labels:
  // 1. Unescaped special chars in labels — wrap in quotes if not already
  //    e.g., A[User Sign-up & Login] → A["User Sign-up & Login"]
  code = code.replace(
    /(\w+)\[([^\]"]*[&<>{}][^\]"]*)\]/g,
    (_, id, label) => `${id}["${label}"]`
  );

  // 2. Fix parentheses labels with special chars
  code = code.replace(
    /(\w+)\(([^)"]*[&<>{}][^)"]*)\)/g,
    (_, id, label) => `${id}("${label}")`
  );

  // 3. Remove trailing semicolons on lines (not valid in modern mermaid)
  code = code.replace(/;\s*$/gm, '');

  // 4. Fix double-quoted strings with internal unescaped quotes
  //    e.g., ["He said "hello""] → ["He said 'hello'"]
  code = code.replace(
    /\["([^"]*)"([^"]*)"([^"]*)"\]/g,
    (_, a, b, c) => `["${a}'${b}'${c}"]`
  );

  // 5. Normalize diagram type declarations (case-insensitive first line)
  const lines = code.split('\n');
  if (lines.length > 0) {
    const firstLine = lines[0].trim().toLowerCase();
    // Fix common misspellings
    const fixes: Record<string, string> = {
      'sequencediagram': 'sequenceDiagram',
      'classdiagram': 'classDiagram',
      'statediagram': 'stateDiagram',
      'statediagram-v2': 'stateDiagram-v2',
      'erdiagram': 'erDiagram',
      'ganttchart': 'gantt',
      'flowchart': 'flowchart',
      'pie chart': 'pie',
    };
    for (const [wrong, correct] of Object.entries(fixes)) {
      if (firstLine === wrong || firstLine.startsWith(wrong + ' ')) {
        lines[0] = lines[0].replace(new RegExp(wrong, 'i'), correct);
        break;
      }
    }
    code = lines.join('\n');
  }

  // 6. Remove empty lines between diagram type and first content (can cause parse errors)
  code = code.replace(/^((?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline|quadrantChart|xychart-beta|block-beta)(?:\s+\w+)?)\n{3,}/m, '$1\n\n');

  return code;
}

/**
 * Attempt progressively aggressive fixes if initial parse fails.
 */
async function tryParseWithFixes(
  mermaid: typeof import('mermaid').default,
  raw: string
): Promise<{ code: string; valid: boolean }> {
  // Attempt 1: sanitized code
  const sanitized = sanitizeMermaidSyntax(raw);
  try {
    await mermaid.parse(sanitized);
    return { code: sanitized, valid: true };
  } catch {
    // continue to next attempt
  }

  // Attempt 2: strip all node styling/classes (common source of errors)
  const noStyles = sanitized
    .replace(/^\s*style\s+.*$/gm, '')
    .replace(/^\s*class\s+.*$/gm, '')
    .replace(/^\s*classDef\s+.*$/gm, '')
    .replace(/:::[\w-]+/g, '');
  try {
    await mermaid.parse(noStyles);
    return { code: noStyles, valid: true };
  } catch {
    // continue to next attempt
  }

  // Attempt 3: strip click/link handlers
  const noInteraction = noStyles
    .replace(/^\s*click\s+.*$/gm, '')
    .replace(/^\s*link\s+.*$/gm, '');
  try {
    await mermaid.parse(noInteraction);
    return { code: noInteraction, valid: true };
  } catch {
    // all attempts failed
  }

  return { code: sanitized, valid: false };
}

export function MermaidDiagram({ chart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'strict',
          // Suppress console errors from mermaid internals
          suppressErrorRendering: true,
        });

        // Try to parse with progressive fixes
        const { code, valid } = await tryParseWithFixes(mermaid, chart);

        if (!valid) {
          if (!cancelled) {
            setError('Diagram contains invalid syntax that could not be auto-corrected.');
            setSvg('');
          }
          return;
        }

        // Render validated code
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          // Clean up mermaid's verbose error messages
          const cleanMsg = msg
            .replace(/Syntax error in text[\s\S]*?mermaid version [\d.]+/, 'Diagram syntax error')
            .replace(/\n[\s\S]*Parse error on line[\s\S]*/, '')
            .trim();
          setError(cleanMsg || 'Diagram render failed');
          setSvg('');
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(chart).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [chart]);

  // Error state — improved fallback UI
  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-950/10 p-4 my-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-xs font-medium text-amber-500">Diagram could not be rendered</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
            >
              {showRaw ? 'Hide' : 'Show'} source
            </button>
            <button
              onClick={handleCopy}
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
        {showRaw && (
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap text-muted-foreground/70 mt-2 p-2 rounded bg-muted border border-border max-h-64 overflow-y-auto">
            {chart}
          </pre>
        )}
      </div>
    );
  }

  // Loading state
  if (!svg) {
    return (
      <div className="rounded-lg border border-border bg-muted/10 p-4 my-4 animate-pulse">
        <div className="h-32 bg-muted/20 rounded flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Rendering diagram...</p>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div
      ref={containerRef}
      className="my-4 overflow-x-auto rounded-lg border border-border bg-muted/10 p-4 [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
