'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  RotateCcw, MessageCircle, FileBarChart2,
  Loader2, Trash2, PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrdViewerSkeleton } from '@/features/plan/components/prd-skeleton';
import { ChatHistorySkeleton } from '@/features/chat/components/chat-skeleton';
import { WorkflowProgress } from '@/features/plan/components/workflow-progress';

import { TagInput } from '@/components/common/tag-input';
import { useConfirm } from '@/components/common/confirm-dialog';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types';
import type { ProjectStatus, PlanSnapshotEntry, ProjectTag } from '@/types';
import { getTagNames } from '@/lib/tags';

// Lazy load heavy components
const PrdViewer = dynamic(
  () => import('@/features/plan/components/prd-viewer').then(m => ({ default: m.PrdViewer })),
  { loading: () => <PrdViewerSkeleton /> }
);
const VersionSelector = dynamic(
  () => import('@/features/plan/components/version-selector').then(m => ({ default: m.VersionSelector })),
);
const PrdStreamingViewer = dynamic(
  () => import('@/features/plan/components/prd-streaming-viewer').then(m => ({ default: m.PrdStreamingViewer })),
);

type ProjectData = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tags?: ProjectTag[];
  metadata?: string | null;
  plan: {
    id: string;
    version: number;
    content: string | null;
    createdAt: string;
    updatedAt: string;
    snapshots: PlanSnapshotEntry[];
  } | null;
  conversations: Array<{ id: string; role: string; content: string; createdAt: string }>;
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [updatingTags, setUpdatingTags] = useState(false);
  const [showRegenerateStream, setShowRegenerateStream] = useState(false);
  const [showContinueStream, setShowContinueStream] = useState(false);

  const fetchProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data.project);
      setTags(getTagNames(data.project.tags));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRegenerate() {
    setShowRegenerateStream(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'prd');
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleRegenerateComplete() {
    setShowRegenerateStream(false);
    void fetchProject();
    toast.success('PRD regenerated successfully', {
      description: 'Switch to the Validate tab to check quality.',
      action: { label: 'Validate', onClick: () => {} },
    });
  }

  function handleRegenerateCancel() {
    setShowRegenerateStream(false);
    toast.info('Regeneration cancelled');
  }

  function handleContinueGeneration() {
    setShowContinueStream(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'prd');
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleContinueComplete() {
    setShowContinueStream(false);
    void fetchProject();
    toast.success('PRD continuation completed', {
      description: 'Switch to the Validate tab to check quality.',
    });
  }

  function handleContinueCancel() {
    setShowContinueStream(false);
    toast.info('Continuation cancelled');
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
        toast.success('Version restored successfully');
      }
    } catch (e) {
      console.error('Restore failed:', e);
      toast.error('Failed to restore version');
    }
    setRestoring(false);
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Delete Project',
      description: `Delete "${project?.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Project deleted');
        router.push('/');
      } else {
        toast.error('Failed to delete project');
        setDeleting(false);
      }
    } catch (e) {
      console.error('Delete error:', e);
      toast.error('Failed to delete project');
      setDeleting(false);
    }
  }

  async function handleTagsChange(newTags: string[]) {
    setTags(newTags);
    setUpdatingTags(true);
    try {
      const res = await fetch(`/api/projects/${id}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });
      if (res.ok) {
        toast.success('Tags updated');
      } else {
        toast.error('Failed to update tags');
      }
    } catch (error) {
      console.error('Failed to update tags:', error);
      toast.error('Failed to update tags');
    } finally {
      setUpdatingTags(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-10 mx-4 mt-3 bg-card border border-border rounded-lg shadow-sm px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <div className="h-5 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </header>
        <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
          <PrdViewerSkeleton />
        </div>
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

  // Parse metadata for workflow progress
  const parsedMetadata = project.metadata ? (() => { try { return JSON.parse(project.metadata as string); } catch { return null; } })() : null;
  const hasValidation = Boolean(parsedMetadata?.validation);
  const hasTasks = Boolean(parsedMetadata?.taskBreakdown);

  // Main tab state synced with URL
  const defaultTab = hasPlan ? 'prd' : 'chat';
  const mainTab = searchParams.get('tab') || defaultTab;

  function handleMainTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    params.delete('subtab');
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div id="project-detail-page" className="project-detail-page min-h-screen bg-background text-foreground">
      <header id="project-detail-header" className="project-detail-header sticky top-0 z-10 mx-4 mt-3 bg-card border border-border rounded-lg shadow-sm px-4 py-3 space-y-3">
        {/* Row 1: Title + Status (left) | Tags (right) */}
        <div className="project-detail-title-row max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
          <div className="project-detail-title flex items-center gap-2 min-w-0">
            <h1 className="font-semibold truncate">{project.name}</h1>
            <Badge
              className={`shrink-0 text-[10px] border-0 ${PROJECT_STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'}`}
            >
              {PROJECT_STATUS_LABELS[status] ?? project.status}
            </Badge>
          </div>

          <div className="project-detail-tags flex items-center gap-2 shrink-0">
            <TagInput
              tags={tags}
              onTagsChange={handleTagsChange}
              placeholder="Add tag..."
              maxTags={5}
            />
          </div>
        </div>

        {/* Row 2: Workflow Progress (left) | Actions (right) */}
        {hasPlan && (
          <div className="project-detail-actions max-w-6xl mx-auto flex items-center gap-3">
            <WorkflowProgress projectStatus={project.status} hasValidation={hasValidation} hasTasks={hasTasks} />
            <div className="project-detail-action-buttons flex items-center gap-1.5 ml-auto">
              <VersionSelector
                currentVersion={project.plan!.version}
                snapshots={project.plan!.snapshots}
                onRestore={handleRestore}
                onSelectPreview={setPreviewContent}
                restoring={restoring}
              />
              {status === 'GENERATING' && (
                <Button
                  size="sm"
                  name="continue-prd"
                  onClick={handleContinueGeneration}
                  className="project-continue-btn h-8 text-xs bg-yellow-600 hover:bg-yellow-700"
                >
                  <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Continue PRD
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                name="regenerate-prd"
                onClick={handleRegenerate}
                className="project-regenerate-btn h-8 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                name="delete-project"
                onClick={handleDelete}
                disabled={deleting}
                className="project-delete-btn h-8 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        )}
        {!hasPlan && (
          <div className="project-detail-actions-no-plan max-w-6xl mx-auto flex items-center gap-1.5">
            <Button
              size="sm"
              name="continue-chat"
              onClick={() => router.push(`/new?projectId=${id}`)}
              className="project-continue-chat-btn h-8 text-xs ml-auto"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Continue Chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              name="delete-project"
              onClick={handleDelete}
              disabled={deleting}
              className="project-delete-btn h-8 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <Tabs value={mainTab} onValueChange={handleMainTabChange}>
          <TabsList className="mb-6 bg-muted">
            {(hasPlan || showRegenerateStream || showContinueStream) && (
              <TabsTrigger value="prd">
                <FileBarChart2 className="w-3.5 h-3.5 mr-1.5" />PRD
              </TabsTrigger>
            )}
            <TabsTrigger value="chat">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />Chat History
            </TabsTrigger>
          </TabsList>

          {(hasPlan || showRegenerateStream || showContinueStream) && (
            <TabsContent value="prd">
              {(showRegenerateStream || showContinueStream) ? (
                <PrdStreamingViewer
                  projectId={id}
                  onComplete={showRegenerateStream ? handleRegenerateComplete : handleContinueComplete}
                  onCancel={showRegenerateStream ? handleRegenerateCancel : handleContinueCancel}
                  continueFrom={showContinueStream ? (project.plan?.content || undefined) : undefined}
                />
              ) : (
                <PrdViewer
                  content={prdContent}
                  projectName={project.name}
                  projectId={id}
                  version={project.plan?.version || 1}
                  createdAt={project.plan?.createdAt}
                  updatedAt={project.plan?.updatedAt}
                  onRefineStart={fetchProject}
                  onDataChange={fetchProject}
                />
              )}
            </TabsContent>
          )}

          <TabsContent value="chat">
            <Card className="bg-card border-border">
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
                                : 'bg-muted text-foreground rounded-tl-sm border border-border'
                            }`}
                          >
                            {c.role === 'USER' ? (
                              <p className="whitespace-pre-wrap text-xs">{c.content}</p>
                            ) : (
                              <div className="prose dark:prose-invert prose-xs max-w-none text-xs">
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
