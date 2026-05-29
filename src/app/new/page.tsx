'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatPage } from '@/features/chat/components/chat-page';
import { useChatSession } from '@/features/chat/hooks/use-chat-session';
import { ReferencesPanel } from '@/components/common/references-panel';
import { PrdStreamingViewer } from '@/features/plan/components/prd-streaming-viewer';
import { ChatHistorySkeleton } from '@/features/chat/components/chat-skeleton';
import type { UIMessage } from 'ai';
import type { ConversationEntry, ProjectReference } from '@/types';

function NewProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [generatingPrd, setGeneratingPrd] = useState(false);
  const [showPrdStream, setShowPrdStream] = useState(false);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | undefined>(undefined);
  const [references, setReferences] = useState<ProjectReference[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch existing conversations on mount
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data: { project?: { conversations?: ConversationEntry[]; references?: string; status?: string; plan?: { content?: string } } }) => {
        const project = data.project;

        // Redirect to project page if generation was interrupted —
        // project detail page already has "Continue PRD" button
        if (project?.status === 'GENERATING' && project?.plan?.content) {
          router.replace(`/project/${projectId}`);
          return;
        }
        if (project?.conversations && project.conversations.length > 0) {
          const messages: UIMessage[] = project.conversations.map((conv) => {
            let parts;
            try {
              parts = conv.parts ? JSON.parse(conv.parts) : [{ type: 'text', text: conv.content }];
            } catch {
              parts = [{ type: 'text', text: conv.content }];
            }

            // Defensive: validate parts format
            // If parts contain internal AI SDK format (type: 'tool-call' without matching result),
            // convert to safe text-only fallback to prevent AI_MissingToolResultsError
            if (Array.isArray(parts)) {
              const hasOrphanedToolCall = parts.some(
                (p: { type: string }) => p.type === 'tool-call'
              );
              if (hasOrphanedToolCall) {
                // Legacy internal format detected — fallback to text content
                parts = conv.content && conv.content !== '[tool call]'
                  ? [{ type: 'text', text: conv.content }]
                  : []; // Skip empty tool-only messages
              }
            }

            return {
              id: conv.id,
              role: conv.role.toLowerCase() as 'user' | 'assistant',
              parts,
              createdAt: new Date(conv.createdAt),
            };
          }).filter((msg) => msg.parts.length > 0); // Remove messages with no displayable parts
          setInitialMessages(messages);
        }
        
        // Parse references
        if (project?.references) {
          try {
            setReferences(JSON.parse(project.references));
          } catch {
            setReferences([]);
          }
        }
        
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch conversations:', err);
        toast.error('Failed to load chat history');
        setLoading(false);
      });
  }, [projectId]);

  const {
    messages,
    isLoading,
    isRequirementsComplete,
    sendMessage,
    sendAnswer,
    stop,
    retryLastMessage,
  } = useChatSession({ projectId: projectId ?? '', initialMessages });

  // Auto-send template context as first message for new projects
  useEffect(() => {
    if (!projectId || loading || initialMessages) return;
    const templateKey = `template_${projectId}`;
    const stored = sessionStorage.getItem(templateKey);
    if (stored) {
      sessionStorage.removeItem(templateKey);
      try {
        const template = JSON.parse(stored) as { id: string; name: string; prompt: string };
        sendMessage(
          `I want to build a project. Context: ${template.prompt}\n\nPlease help me define the requirements for this project.`
        );
      } catch {
        // Ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, loading, initialMessages]);

  function handleFileImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      sendMessage(
        `Here is my project document:\n\n${content}\n\nPlease analyze this and identify what requirements are covered and what needs clarification.`
      );
      toast.success('File imported successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  }

  async function handleGeneratePrd() {
    if (!projectId) return;
    setGeneratingPrd(true);
    setShowPrdStream(true);
  }

  function handlePrdComplete() {
    setGeneratingPrd(false);
    setShowPrdStream(false);
    router.push(`/project/${projectId}`);
  }

  function handlePrdCancel() {
    setGeneratingPrd(false);
    setShowPrdStream(false);
  }

  if (!projectId) {
    return (
      <div id="new-project-no-id" className="new-project-no-id flex items-center justify-center h-screen text-muted-foreground">
        No project ID provided.
      </div>
    );
  }

  if (loading) {
    return (
      <div id="new-project-page" className="new-project-page flex flex-col h-screen bg-background text-foreground">
        <header id="new-project-header" className="new-project-header border-b border-border bg-background px-4 sm:px-6 py-4 flex items-center gap-2 sm:gap-3 shrink-0">
          <Button variant="ghost" size="sm" name="back-btn" className="back-btn" disabled>
            <ArrowLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <h1 className="new-project-title font-semibold text-sm sm:text-base">New Project</h1>
          <div className="new-project-skeleton h-5 w-20 sm:w-24 bg-muted animate-pulse rounded-full" />
        </header>
        <div className="new-project-loading flex-1 overflow-auto p-4 sm:p-6">
          <ChatHistorySkeleton count={3} />
        </div>
      </div>
    );
  }

  return (
    <div id="new-project-page" className="new-project-page flex flex-col h-screen bg-background text-foreground">
      <header id="new-project-header" className="new-project-header border-b border-border bg-background px-4 sm:px-6 py-4 flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
        <Button variant="ghost" size="sm" name="back-btn" onClick={() => router.push('/')} className="back-btn shrink-0">
          <ArrowLeft className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <h1 className="new-project-title font-semibold text-sm sm:text-base">New Project</h1>
        <Badge variant="secondary" className="new-project-status-badge bg-yellow-500/20 text-yellow-400 text-xs">
          {isRequirementsComplete ? 'Ready' : 'Clarifying'}
        </Badge>
        <div className="new-project-actions ml-auto shrink-0">
          <ReferencesPanel references={references} />
        </div>
      </header>

      {showPrdStream ? (
        <div id="prd-stream-container" className="prd-stream-container flex-1 overflow-hidden p-4 sm:p-6">
          <PrdStreamingViewer
            projectId={projectId}
            onComplete={handlePrdComplete}
            onCancel={handlePrdCancel}
          />
        </div>
      ) : (
        <ChatPage
          messages={messages}
          isLoading={isLoading}
          isRequirementsComplete={isRequirementsComplete}
          onSendMessage={sendMessage}
          onSendAnswer={sendAnswer}
          onGeneratePrd={handleGeneratePrd}
          onFileImport={handleFileImport}
          onStop={stop}
          onRetry={retryLastMessage}
          generatingPrd={generatingPrd}
        />
      )}
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense
      fallback={
        <div id="new-project-page" className="new-project-page flex flex-col h-screen bg-background text-foreground">
          <header id="new-project-header" className="new-project-header border-b border-border bg-background px-6 py-4 flex items-center gap-3 shrink-0">
            <Button variant="ghost" size="sm" name="back-btn" className="back-btn" disabled>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="new-project-title font-semibold">New Project</h1>
          </header>
          <div className="new-project-loading flex-1 overflow-auto p-6">
            <ChatHistorySkeleton count={3} />
          </div>
        </div>
      }
    >
      <NewProjectContent />
    </Suspense>
  );
}
