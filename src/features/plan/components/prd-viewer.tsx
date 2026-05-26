'use client';

import { useState, useMemo } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from '@/components/common/mermaid-diagram';

type Props = {
  content: string;
  projectName: string;
};

export function PrdViewer({ content, projectName }: Props) {
  const [copied, setCopied] = useState(false);

  const headings = useMemo(() => {
    const matches = content.match(/^##\s+.+$/gm) ?? [];
    return matches.map((h) => ({
      text: h.replace(/^##\s+/, ''),
      id: h.replace(/^##\s+/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    }));
  }, [content]);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const safeName = (projectName || 'project')
      .replace(/[^a-zA-Z0-9-_\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}-PRD.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-6">
      {/* Table of Contents */}
      {headings.length > 0 && (
        <nav className="hidden xl:block w-56 shrink-0">
          <div className="sticky top-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Contents
            </h4>
            <ul className="space-y-1.5">
              {headings.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors line-clamp-1"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}

      {/* Document */}
      <div className="flex-1 min-w-0">
        {/* Action bar */}
        <div className="flex items-center gap-2 mb-4">
          <Button id="btn-copy-prd" variant="outline" size="sm" onClick={handleCopy} className="h-8 text-xs">
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button id="btn-download-prd" variant="outline" size="sm" onClick={handleDownload} className="h-8 text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download PRD.md
          </Button>
        </div>

        {/* Rendered markdown with mermaid diagrams */}
        <ScrollArea className="h-[calc(100vh-220px)]">
          <article className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children, ...props }) => {
                  const text = String(children);
                  const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return <h2 id={id} {...props}>{children}</h2>;
                },
                code: ({ className, children, ...props }) => {
                  const match = /language-mermaid/.exec(className || '');
                  if (match) {
                    return <MermaidDiagram chart={String(children).trim()} />;
                  }
                  return <code className={className} {...props}>{children}</code>;
                },
                pre: ({ children }) => {
                  return <>{children}</>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        </ScrollArea>
      </div>
    </div>
  );
}
