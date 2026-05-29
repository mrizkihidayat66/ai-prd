'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Copy, Check, List, ChevronRight, Clock, Presentation, BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from '@/components/common/mermaid-diagram';
import { RefineDialog } from './refine-dialog';
import { PrdEditor } from './prd-editor';
import { CompareDialog } from './compare-dialog';
import { ExportDialog } from './export-dialog';
import { SaveTemplateDialog } from './save-template-dialog';
import { ValidationScorecard } from '@/features/validation/components/validation-scorecard';
import { TaskBreakdownView } from '@/features/tasks/components/task-breakdown-view';
import { CommentsPanel } from '@/features/collaboration/components/comments-panel';
import { ReviewStatus } from '@/features/collaboration/components/review-status';

type Props = {
  content: string;
  projectName: string;
  projectId?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  onRefineStart?: () => void;
  /** Callback when validation or tasks complete (parent should refresh project data) */
  onDataChange?: () => void;
};

export function PrdViewer({ content, projectName, projectId, version = 1, createdAt, updatedAt, onRefineStart, onDataChange }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subtab = searchParams.get('subtab') || 'view';

  function handleSubTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('subtab', value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const [copied, setCopied] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const [readProgress, setReadProgress] = useState(0);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const headings = useMemo(() => {
    const matches = content.match(/^##\s+.+$/gm) ?? [];
    return matches.map((h) => ({
      text: h.replace(/^##\s+/, ''),
      id: h.replace(/^##\s+/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    }));
  }, [content]);

  // Reading time estimate (avg 200 words/min for technical docs)
  const readingTime = useMemo(() => {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    return { minutes, wordCount };
  }, [content]);

  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationSection, setPresentationSection] = useState(0);

  // Split content into sections for presentation mode
  const sections = useMemo(() => {
    const parts = content.split(/^(?=## )/gm);
    return parts.map((part) => {
      const titleMatch = part.match(/^## (.+)$/m);
      return {
        title: titleMatch ? titleMatch[1] : projectName,
        content: part.trim(),
      };
    });
  }, [content, projectName]);

  // Keyboard navigation for presentation mode
  useEffect(() => {
    if (!presentationMode) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setPresentationSection((s) => Math.min(s + 1, sections.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPresentationSection((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPresentationMode(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [presentationMode, sections.length]);

  // IntersectionObserver for active section tracking
  useEffect(() => {
    if (headings.length === 0) return;

    // Small delay to let headings render
    const timeout = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Find the actual scrollable viewport inside ScrollArea
      const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      const root = viewport || container;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          // Find the topmost visible heading
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible.length > 0) {
            setActiveHeading(visible[0].target.id);
          }
        },
        { root, rootMargin: '-10% 0px -80% 0px', threshold: 0 }
      );

      headings.forEach((h) => {
        const el = root.querySelector(`#${CSS.escape(h.id)}`);
        if (el) observerRef.current!.observe(el);
      });
    }, 300);

    return () => {
      clearTimeout(timeout);
      observerRef.current?.disconnect();
    };
  }, [headings, subtab]);

  // Scroll progress tracking
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const scrollEl = viewport || container;

    function handleScroll() {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const progress = scrollHeight <= clientHeight ? 100 : Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      setReadProgress(progress);
    }

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [subtab]);

  const scrollToHeading = useCallback((id: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const root = viewport || container;
    const el = root.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeading(id);
      setMobileDropdownOpen(false);
    }
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Tabs value={subtab} onValueChange={handleSubTabChange} className="prd-viewer flex flex-col h-full">
      <TabsList className="prd-viewer-tabs mb-4">
        <TabsTrigger value="view" name="tab-view">View</TabsTrigger>
        <TabsTrigger value="edit" name="tab-edit">Edit</TabsTrigger>
        <TabsTrigger value="validate" name="tab-validate">Validate</TabsTrigger>
        <TabsTrigger value="tasks" name="tab-tasks">Tasks</TabsTrigger>
        <TabsTrigger value="review" name="tab-review">Review</TabsTrigger>
      </TabsList>

      <TabsContent value="view" className="prd-view-tab flex-1 min-h-0">
        <div className="prd-view-layout flex gap-4 h-full">
          {/* Table of Contents — Desktop (lg+) */}
          {headings.length > 0 && (
            <nav id="prd-toc" className={`prd-toc hidden lg:block shrink-0 transition-all duration-200 ${tocOpen ? 'w-56' : 'w-8'}`}>
              <div className="sticky top-4">
                {/* Toggle button */}
                <button
                  name="toggle-toc"
                  onClick={() => setTocOpen(!tocOpen)}
                  className="prd-toc-toggle flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
                  title={tocOpen ? 'Collapse TOC' : 'Expand TOC'}
                >
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${tocOpen ? 'rotate-90' : ''}`} />
                  {tocOpen && <span className="font-semibold uppercase tracking-wider">Contents</span>}
                </button>

                {tocOpen && (
                  <>
                    {/* Progress bar */}
                    <div className="w-full h-1 bg-muted/30 rounded-full mb-3 overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full transition-all duration-300"
                        style={{ width: `${readProgress}%` }}
                      />
                    </div>

                    {/* Section links */}
                    <ul className="space-y-1">
                      {headings.map((h) => (
                        <li key={h.id}>
                          <button
                            onClick={() => scrollToHeading(h.id)}
                            className={`text-xs text-left w-full px-2 py-1 rounded transition-colors line-clamp-1 ${
                              activeHeading === h.id
                                ? 'text-primary bg-primary/10 font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                            }`}
                          >
                            {h.text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </nav>
          )}

          {/* Document */}
          <div className="flex-1 min-w-0">
            {/* Metadata row */}
            <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-md">
                <Clock className="w-3 h-3" />
                {readingTime.minutes} min read · {readingTime.wordCount.toLocaleString()} words
              </span>
              {updatedAt && (
                <span className="hidden sm:inline-flex items-center gap-1">
                  Updated {new Date(updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              {version > 1 && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                  v{version}
                </span>
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {/* Mobile: Jump to section dropdown */}
              {headings.length > 0 && (
                <div className="relative lg:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
                  >
                    <List className="w-3.5 h-3.5 mr-1.5" />
                    Jump to section
                  </Button>
                  {mobileDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 z-50 w-64 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-2 shadow-lg">
                      {headings.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => scrollToHeading(h.id)}
                          className={`block w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                            activeHeading === h.id
                              ? 'text-primary bg-primary/10 font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                          }`}
                        >
                          {h.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button id="btn-copy-prd" variant="outline" size="sm" onClick={handleCopy} className="h-8 text-xs">
                {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <ExportDialog
                content={content}
                projectName={projectName}
                version={version}
                createdAt={createdAt}
                updatedAt={updatedAt}
              />
              {projectId && onRefineStart && (
                <RefineDialog projectId={projectId} onRefineStart={onRefineStart} />
              )}
              {projectId && (
                <CompareDialog
                  projectId={projectId}
                  currentContent={content}
                  currentVersion={version}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setPresentationSection(0); setPresentationMode(true); }}
              >
                <Presentation className="w-3.5 h-3.5 mr-1.5" />
                Present
              </Button>
              {projectId && (
                <SaveTemplateDialog
                  projectId={projectId}
                  projectName={projectName}
                  content={content}
                />
              )}
            </div>

            {/* Rendered markdown with mermaid diagrams */}
            <div ref={scrollContainerRef}>
              <ScrollArea className="h-[calc(100vh-220px)]">
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
                        // Beautify JSON code blocks
                        const jsonMatch = /language-json/.exec(className || '');
                        if (jsonMatch) {
                          let formatted = String(children).trim();
                          try {
                            formatted = JSON.stringify(JSON.parse(formatted), null, 2);
                          } catch { /* keep original */ }
                          return (
                            <code className={`${className} block bg-muted/50 rounded-md p-3 text-xs overflow-x-auto border border-border/50`} {...props}>
                              {formatted}
                            </code>
                          );
                        }
                        return <code className={className} {...props}>{children}</code>;
                      },
                      pre: ({ children }) => {
                        return <>{children}</>;
                      },
                      blockquote: ({ children, ...props }) => {
                        return (
                          <blockquote
                            className="border-l-4 border-primary/40 bg-primary/5 pl-4 py-2 my-3 rounded-r-md italic text-muted-foreground"
                            {...props}
                          >
                            {children}
                          </blockquote>
                        );
                      },
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </article>
              </ScrollArea>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="edit" className="flex-1 min-h-0">
        {projectId ? (
          <PrdEditor
            initialContent={content}
            projectId={projectId}
            onSave={onRefineStart}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Editor not available for unsaved projects
          </div>
        )}
      </TabsContent>

      <TabsContent value="validate" className="flex-1 min-h-0 overflow-y-auto p-4">
        {projectId ? (
          <ValidationScorecard projectId={projectId} onRefineComplete={onRefineStart} onValidationComplete={onDataChange} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Validation not available for unsaved projects
          </div>
        )}
      </TabsContent>

      <TabsContent value="tasks" className="flex-1 min-h-0 overflow-y-auto p-4">
        {projectId ? (
          <TaskBreakdownView projectId={projectId} projectName={projectName} onTasksComplete={onDataChange} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Task breakdown not available for unsaved projects
          </div>
        )}
      </TabsContent>

      <TabsContent value="review" className="flex-1 min-h-0 overflow-y-auto">
        {projectId ? (
          <div className="flex gap-4 h-full">
            {/* Review status + comments */}
            <div className="flex-1 p-4 space-y-4">
              <ReviewStatus projectId={projectId} />
              <div className="rounded-lg border h-[calc(100vh-380px)]">
                <CommentsPanel
                  projectId={projectId}
                  sections={headings.map((h) => h.text)}
                  activeSection={activeHeading ? headings.find((h) => h.id === activeHeading)?.text : undefined}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Review not available for unsaved projects
          </div>
        )}
      </TabsContent>

      {/* Presentation Mode Overlay */}
      {presentationMode && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {presentationSection + 1} / {sections.length}
              </span>
              <div className="w-32 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${((presentationSection + 1) / sections.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                ← → navigate · Esc exit
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPresentationMode(false)}
              >
                Exit
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-8 md:p-12">
            <article className="prose dark:prose-invert prose-lg max-w-4xl w-full">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children, ...props }) => {
                    const text = String(children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h2 id={`pres-${id}`} {...props}>{children}</h2>;
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
                {sections[presentationSection]?.content ?? ''}
              </ReactMarkdown>
            </article>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresentationSection((s) => Math.max(s - 1, 0))}
              disabled={presentationSection === 0}
            >
              ← Previous
            </Button>
            <span className="text-sm font-medium truncate max-w-[50%] text-center">
              {sections[presentationSection]?.title}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresentationSection((s) => Math.min(s + 1, sections.length - 1))}
              disabled={presentationSection === sections.length - 1}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </Tabs>
  );
}
