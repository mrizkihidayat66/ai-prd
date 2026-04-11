'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChatMessageBubble } from '@/components/chat/chat-message-bubble';
import { RequirementsRadar, PlanProgressPanel } from '@/components/chat/chat-sidebar-panels';
import { useClarificationSession } from '@/hooks/use-clarification';

function NewProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const autopilotEnabled = searchParams.get('testMode') === 'true';
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    setInput,
    loading,
    projectName,
    coveredDimensions,
    requirementsComplete,
    generatingPlan,
    planProgress,
    pendingAnswers,
    customInputs,
    setPendingAnswers,
    setCustomInputs,
    sendMessage,
    generatePlan,
    submitBatchAnswers,
  } = useClarificationSession(projectId, autopilotEnabled);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generatingPlan, planProgress]);

  function handleFileImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setInput(
        `Here is my project README / idea document:\n\n${reader.result as string}\n\nPlease analyze this and create a comprehensive project plan.`
      );
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* ── Left: Chat Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border/40 backdrop-blur-xl bg-background/80 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              ← Back
            </Button>
            <h1 className="font-semibold truncate max-w-xs">{projectName}</h1>
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 shrink-0">
              Clarifying
            </Badge>
          </div>
          {requirementsComplete && (
            <Button
              onClick={generatePlan}
              disabled={generatingPlan}
              className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all shrink-0"
            >
              {generatingPlan ? '⏳ Generating…' : '🚀 Generate Plan'}
            </Button>
          )}
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6 overflow-hidden">
          <div className="max-w-3xl mx-auto">
            {/* Empty state with file import */}
            {messages.length === 0 && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">💡</div>
                <h3 className="text-xl font-semibold mb-2">Describe your project</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Tell the AI what you want to build. Be as detailed or vague as you like — it will
                  ask follow-up questions.
                </p>
                <div
                  className="max-w-sm mx-auto border-2 border-dashed border-border/50 rounded-xl p-6 hover:border-violet-500/50 transition-colors cursor-pointer bg-muted/10"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileImport(file);
                  }}
                  onClick={() => {
                    const el = document.createElement('input');
                    el.type = 'file';
                    el.accept = '.md,.txt,.markdown';
                    el.onchange = () => {
                      if (el.files?.[0]) handleFileImport(el.files[0]);
                    };
                    el.click();
                  }}
                >
                  <div className="text-2xl mb-2">📄</div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Import from README or idea doc
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Drop a .md or .txt file here, or click to browse
                  </p>
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, i) => (
              <ChatMessageBubble
                key={i}
                message={msg}
                index={i}
                isLoading={loading}
                isLatest={i === messages.length - 1}
                pendingAnswers={pendingAnswers}
                customInputs={customInputs}
                onAnswerChange={(qId, answer) =>
                  setPendingAnswers((prev) => ({ ...prev, [qId]: answer }))
                }
                onCustomInputChange={(qId, value) =>
                  setCustomInputs((prev) => ({ ...prev, [qId]: value }))
                }
                onSubmit={submitBatchAnswers}
                onGeneratePlan={generatePlan}
              />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted/60 rounded-2xl px-4 py-3 border border-border/30">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}

            {/* Plan generation progress (inline) */}
            {generatingPlan && (
              <div className="mb-6 p-6 bg-muted/30 border border-violet-500/20 rounded-2xl">
                <h4 className="text-sm font-semibold mb-4 text-violet-300 flex items-center gap-2">
                  <span className="animate-spin">⚙️</span> Generating Plan — Section by Section
                </h4>
                <PlanProgressPanel planProgress={planProgress} />
                <p className="text-xs text-muted-foreground mt-3">
                  Each section is generated independently for maximum reliability.
                </p>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input bar */}
        <div className="border-t border-border/40 bg-background/80 backdrop-blur-xl p-4 shrink-0">
          <div className="max-w-3xl mx-auto flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your project idea…"
              className="resize-none bg-muted/50 border-border/50 min-h-[60px] max-h-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
            />
            <Button
              onClick={() => void sendMessage(input)}
              disabled={!input.trim() || loading}
              className="self-end bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-6"
            >
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* ── Right: Sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-64 border-l border-border/40 bg-card/30 backdrop-blur-sm p-4 hidden lg:flex flex-col gap-6 shrink-0 overflow-y-auto">
        <RequirementsRadar coveredDimensions={coveredDimensions} />
        {generatingPlan && <PlanProgressPanel planProgress={planProgress} />}
      </aside>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-muted-foreground">
          Loading…
        </div>
      }
    >
      <NewProjectContent />
    </Suspense>
  );
}
