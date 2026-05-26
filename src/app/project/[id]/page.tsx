'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, RotateCcw, MessageCircle, FileBarChart2,
  Loader2, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrdViewer } from '@/features/plan/components/prd-viewer';
import { VersionSelector } from '@/features/plan/components/version-selector';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types';
import type { ProjectStatus, PlanSnapshotEntry } from '@/types';

type ProjectData = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  plan: {
    id: string;
    version: number;
    content: string | null;
    snapshots: PlanSnapshotEntry[];
  } | null;
  conversations: Array<{ id: string; role: string; content: string; createdAt: string }>;
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const fetchProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data.project);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/projects/${id}/generate`, { method: 'POST' });
      if (res.ok) {
        await fetchProject();
      }
    } catch (e) {
      console.error('Regenerate failed:', e);
    }
    setRegenerating(false);
  }

  async function handleRestore(snapshotId: string) {
    setRestoring(true);
    try {
      const snapshot = project?.plan?.snapshots.find((s) => s.id === snapshotId);
      if (snapshot && project?.plan) {
        await fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PLAN_GENERATED' }),
        });
        await fetch(`/api/projects/${id}/plan`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: snapshot.content }),
        });
        await fetchProject();
        setPreviewContent(null);
      }
    } catch (e) {
      console.error('Restore failed:', e);
    }
    setRestoring(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${project?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      router.push('/');
    } catch (e) {
      console.error('Delete error:', e);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        <span className="animate-pulse">Loading project...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Project not found.
      </div>
    );
  }

  const status = project.status as ProjectStatus;
  const hasPlan = Boolean(project.plan?.content);
  const prdContent = previewContent ?? project.plan?.content ?? '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/40 backdrop-blur-xl bg-background/80 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="font-semibold truncate">{project.name}</h1>
            <Badge
              className={`shrink-0 text-[10px] border-0 ${PROJECT_STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'}`}
            >
              {PROJECT_STATUS_LABELS[status] ?? project.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasPlan && (
              <>
                <VersionSelector
                  currentVersion={project.plan!.version}
                  snapshots={project.plan!.snapshots}
                  onRestore={handleRestore}
                  onSelectPreview={setPreviewContent}
                  restoring={restoring}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="h-8 text-xs"
                >
                  {regenerating ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Regenerating...</>
                  ) : (
                    <><RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Regenerate</>
                  )}
                </Button>
              </>
            )}
            {!hasPlan && (
              <Button
                size="sm"
                onClick={() => router.push(`/new?projectId=${id}`)}
                className="h-8 text-xs"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Continue Chat
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="h-8 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <Tabs defaultValue={hasPlan ? 'prd' : 'chat'}>
          <TabsList className="mb-6 bg-muted/50">
            {hasPlan && (
              <TabsTrigger value="prd">
                <FileBarChart2 className="w-3.5 h-3.5 mr-1.5" />PRD
              </TabsTrigger>
            )}
            <TabsTrigger value="chat">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />Chat History
            </TabsTrigger>
          </TabsList>

          {hasPlan && (
            <TabsContent value="prd">
              <PrdViewer
                content={prdContent}
                projectName={project.name}
              />
            </TabsContent>
          )}

          <TabsContent value="chat">
            <Card className="bg-card/60 border-border/40">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Conversation History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh] pr-4">
                  {project.conversations.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      No conversation history.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {project.conversations.map((c) => (
                        <div
                          key={c.id}
                          className={`flex ${c.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                              c.role === 'USER'
                                ? 'bg-primary/15 text-foreground rounded-tr-sm'
                                : 'bg-muted text-foreground rounded-tl-sm border border-border/40'
                            }`}
                          >
                            {c.role === 'USER' ? (
                              <p className="whitespace-pre-wrap text-xs">{c.content}</p>
                            ) : (
                              <div className="prose prose-invert prose-xs max-w-none text-xs">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {c.content}
                                </ReactMarkdown>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                              {new Date(c.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
