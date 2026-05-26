'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  chart: string;
};

export function MermaidDiagram({ chart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
        });
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: rendered } = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setSvg('');
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="rounded-lg border border-border/40 bg-muted/20 p-4 my-4">
        <p className="text-xs text-muted-foreground mb-2">Diagram render failed:</p>
        <pre className="text-xs overflow-x-auto whitespace-pre-wrap text-muted-foreground/70">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-lg border border-border/40 bg-muted/10 p-4 my-4 animate-pulse">
        <div className="h-32 bg-muted/20 rounded" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 overflow-x-auto rounded-lg border border-border/40 bg-muted/10 p-4 [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
