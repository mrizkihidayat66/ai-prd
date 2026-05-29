'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from '@/components/common/mermaid-diagram';
import { Save, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/lib/toast';

type Props = {
  initialContent: string;
  projectId: string;
  onSave?: () => void;
};

export function PrdEditor({ initialContent, projectId, onSave }: Props) {
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setHasChanges(false);
  }, [initialContent]);

  useEffect(() => {
    setHasChanges(content !== initialContent);
  }, [content, initialContent]);

  async function handleSave() {
    if (!hasChanges) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save');
      }

      toast.success('Saved', 'PRD updated successfully');

      setHasChanges(false);
      onSave?.();
    } catch (error) {
      toast.error(
        'Error',
        error instanceof Error ? error.message : 'Failed to save PRD'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-8 text-xs"
          >
            {showPreview ? (
              <>
                <EyeOff className="w-3.5 h-3.5 mr-1.5" /> Hide Preview
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 mr-1.5" /> Show Preview
              </>
            )}
          </Button>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="h-8 text-xs"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
        </Button>
      </div>

      {/* Editor layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Markdown editor */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Markdown Editor
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 font-mono text-sm resize-none"
            placeholder="Write your PRD in markdown..."
          />
        </div>

        {/* Preview pane */}
        {showPreview && (
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Preview
            </label>
            <ScrollArea className="flex-1 border rounded-md p-4">
              <article className="prose dark:prose-invert prose-sm max-w-4xl mx-auto">
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
        )}
      </div>
    </div>
  );
}
