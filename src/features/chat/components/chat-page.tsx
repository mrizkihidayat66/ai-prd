'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Send, Lightbulb, FileText, Loader2, SparklesIcon, StopCircle, Paperclip, AlertTriangle, Link2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClarificationCard } from './tool-renderers/clarification-card';
import { RequirementsSummary } from './tool-renderers/requirements-summary';
import { WebSearchCard } from './tool-renderers/web-search-card';
import { ChatTypingIndicator } from './chat-skeleton';
import { shouldWarnLargeInput, getInputSizeDescription, LARGE_INPUT_THRESHOLD } from '@/lib/file-processor';
import type { UIMessage } from 'ai';

type Props = {
  messages: UIMessage[];
  isLoading: boolean;
  isRequirementsComplete: boolean;
  onSendMessage: (message: string) => void;
  onSendAnswer: (questionId: string, answer: string) => void;
  onGeneratePrd: () => void;
  onFileImport: (file: File) => void;
  onStop?: () => void;
  onRetry?: () => void;
  generatingPrd?: boolean;
};

export function ChatPage({
  messages,
  isLoading,
  isRequirementsComplete,
  onSendMessage,
  onSendAnswer,
  onGeneratePrd,
  onFileImport,
  onStop,
  onRetry,
  generatingPrd,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [largeInputWarning, setLargeInputWarning] = useState(false);
  const [inputSizeDesc, setInputSizeDesc] = useState('');
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);

  // Determine typing phase based on conversation state
  const typingPhase = useMemo(() => {
    if (generatingPrd) return 'generating' as const;
    if (isRequirementsComplete) return 'analyzing' as const;
    const clarificationCount = messages.filter(
      (m) => m.role === 'assistant' && m.parts?.some((p) => p.type === 'tool-ask_clarification')
    ).length;
    if (clarificationCount > 0) return 'clarifying' as const;
    return 'thinking' as const;
  }, [messages, isRequirementsComplete, generatingPrd]);

  // Calculate requirements progress (adaptive — based on round count / max 7)
  const requirementsProgress = useMemo(() => {
    if (isRequirementsComplete) return 100;
    const clarificationRounds = messages.filter(
      (m) => m.role === 'assistant' && m.parts?.some((p) => p.type === 'tool-ask_clarification')
    ).length;
    const userMessages = messages.filter((m) => m.role === 'user').length;
    // Adaptive: max 7 rounds, progress scales accordingly
    const maxRounds = 7;
    const roundProgress = Math.min(90, Math.round((clarificationRounds / maxRounds) * 100));
    // Blend in user participation for smoother progress
    const participationBonus = Math.min(10, userMessages * 2);
    return Math.max(roundProgress + participationBonus, userMessages > 0 ? 10 : 0);
  }, [messages, isRequirementsComplete]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Esc key to abort
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLoading && onStop) {
        e.preventDefault();
        onStop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, onStop]);

  // Track large input and URL detection
  function handleInputChange(value: string) {
    setInput(value);
    const isLarge = shouldWarnLargeInput(value);
    setLargeInputWarning(isLarge);
    if (isLarge) {
      setInputSizeDesc(getInputSizeDescription(value));
    }
    // Detect URLs
    const urlMatch = value.match(/https?:\/\/[^\s]+/);
    setDetectedUrl(urlMatch ? urlMatch[0] : null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  }

  function renderMessageParts(message: UIMessage) {
    if (!message.parts || !Array.isArray(message.parts)) {
      return null;
    }
    return message.parts.map((part, idx) => {
      const key = `${message.id}-part-${idx}`;

      if (part.type === 'text') {
        if (!part.text?.trim()) return null;
        return (
          <div key={key} className="prose dark:prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {part.text}
            </ReactMarkdown>
          </div>
        );
      }

      if (part.type === 'tool-ask_clarification') {
        const input = 'input' in part ? (part as { input?: { questions?: Array<{ id: string; dimension: string; question: string; options: string[]; recommendation: string }> } }).input : null;
        if (!input?.questions) return null;
        return (
          <ClarificationCard
            key={key}
            questions={input.questions}
            onAnswer={onSendAnswer}
            disabled={isLoading}
          />
        );
      }

      if (part.type === 'tool-mark_requirements_complete') {
        const input = 'input' in part ? (part as { input?: { summary?: Record<string, unknown> } }).input : null;
        if (!input?.summary) return null;
        return (
          <RequirementsSummary
            key={key}
            summary={input.summary as Parameters<typeof RequirementsSummary>[0]['summary']}
            onGenerate={onGeneratePrd}
            generating={generatingPrd}
          />
        );
      }

      if (part.type === 'tool-web_search') {
        const toolInput = 'input' in part ? (part as { input?: { query?: string } }).input : null;
        const toolOutput = 'output' in part ? (part as { output?: { results?: Array<{ title: string; snippet: string; url: string }> } }).output : null;
        if (!toolInput?.query) return null;
        return (
          <WebSearchCard
            key={key}
            query={toolInput.query}
            results={toolOutput?.results ?? []}
          />
        );
      }

      return null;
    });
  }

  return (
    <div id="chat-page" className="chat-page flex-1 flex flex-col min-h-0">
      {/* Messages area */}
      <div id="chat-messages-area" className="chat-messages-area relative flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="chat-messages-scroll absolute inset-0 overflow-y-auto touch-pan-y"
        >
          <div className="chat-messages-list mx-auto flex min-h-full max-w-3xl flex-col gap-5 px-4 py-6">
            {messages.length === 0 && !isLoading && (
              <div id="chat-empty-state" className="chat-empty-state flex items-center justify-center flex-1">
                <div className="chat-empty-content text-center py-20">
                  <div className="chat-empty-icon flex justify-center mb-4">
                    <Lightbulb className="w-12 h-12 text-primary opacity-60" />
                  </div>
                  <h3 className="chat-empty-title text-xl font-semibold mb-2">Describe your project</h3>
                  <p className="chat-empty-description text-muted-foreground mb-8 max-w-md mx-auto">
                    Tell the AI what you want to build. Be as detailed or vague as you like — it will
                    ask follow-up questions to clarify requirements.
                  </p>
                  <div
                    id="file-import-zone"
                    className="max-w-sm mx-auto border-2 border-dashed border-border rounded-xl p-6 hover:border-primary/40 transition-colors cursor-pointer bg-muted/10"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) onFileImport(file);
                    }}
                    onClick={() => {
                      const el = document.createElement('input');
                      el.type = 'file';
                      el.accept = '.md,.txt,.markdown';
                      el.onchange = () => {
                        if (el.files?.[0]) onFileImport(el.files[0]);
                      };
                      el.click();
                    }}
                  >
                    <div className="flex justify-center mb-2">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Import from README or idea doc
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Drop a .md or .txt file here, or click to browse
                    </p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, msgIdx) => {
              // Detect if this is the last user message with no following assistant response
              const isLastUserWithoutResponse =
                msg.role === 'user' &&
                msgIdx === messages.length - 1 &&
                !isLoading;

              return (
              <div
                key={msg.id}
                id={`chat-message-${msg.id}`}
                className="chat-message group/message w-full"
                data-role={msg.role}
              >
                <div className={msg.role === 'user' ? 'chat-message-user flex flex-col items-end gap-2' : 'chat-message-assistant flex items-start gap-3'}>
                  {msg.role === 'assistant' && (
                    <div className="chat-avatar flex h-[calc(13px*1.65)] shrink-0 items-center">
                      <div className="chat-avatar-icon flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
                        <SparklesIcon className="size-3.5" />
                      </div>
                    </div>
                  )}

                  {msg.role === 'user' ? (
                    <div className="chat-bubble-user w-fit max-w-[min(80%,56ch)] overflow-hidden break-words rounded-2xl rounded-br-lg border border-border bg-gradient-to-br from-secondary to-muted px-3.5 py-2 shadow-sm">
                      <p className="chat-bubble-text text-[13px] leading-[1.65] whitespace-pre-wrap">
                        {msg.parts
                          ?.filter((p) => p.type === 'text')
                          .map((p) => (p as { type: 'text'; text: string }).text)
                          .join('') || ''}
                      </p>
                    </div>
                  ) : (
                    <div className="chat-bubble-assistant flex min-w-0 flex-1 flex-col gap-2 text-[13px] leading-[1.65]">
                      {renderMessageParts(msg)}
                    </div>
                  )}
                </div>

                {/* Retry button for last user message with no response */}
                {isLastUserWithoutResponse && onRetry && (
                  <div className="chat-retry-container flex justify-end mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      name="retry-message"
                      onClick={onRetry}
                      className="chat-retry-btn h-7 px-3 rounded-xl gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3" />
                      Retry
                    </Button>
                  </div>
                )}
              </div>
              );
            })}

            {isLoading && messages.at(-1)?.role !== 'assistant' && (
              <ChatTypingIndicator phase={typingPhase} />
            )}

            <div ref={scrollRef} className="min-h-[24px] shrink-0" />
          </div>
        </div>
      </div>

      {/* Requirements progress bar */}
      {messages.length > 0 && !isRequirementsComplete && (
        <div id="chat-progress-bar" className="chat-progress-bar px-4 sm:px-6 py-2 border-t border-border bg-background">
          <div className="chat-progress-inner mx-auto max-w-3xl">
            <div className="chat-progress-labels flex items-center justify-between mb-1">
              <span className="chat-progress-label text-[11px] text-muted-foreground">Requirements gathering</span>
              <span className="chat-progress-value text-[11px] font-medium text-muted-foreground">{requirementsProgress}%</span>
            </div>
            <div className="chat-progress-track h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="chat-progress-fill h-full rounded-full bg-primary/60 transition-all duration-500 ease-out"
                style={{ width: `${requirementsProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div id="chat-input-area" className="chat-input-area border-t border-border bg-background p-4 shrink-0">
        <form id="chat-form" name="chat-form" onSubmit={handleSubmit} className="chat-form mx-auto max-w-3xl">
          {/* Large input warning */}
          {largeInputWarning && (
            <div id="chat-large-input-warning" className="chat-large-input-warning flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="size-3.5 shrink-0" />
              <p className="chat-warning-text text-xs">
                Large input detected ({inputSizeDesc}). Consider importing as a file for better results.
              </p>
              <button
                type="button"
                name="import-as-document"
                onClick={() => {
                  onFileImport(new File([input], 'pasted-content.md', { type: 'text/markdown' }));
                  setInput('');
                  setLargeInputWarning(false);
                }}
                className="chat-import-btn text-xs font-medium text-amber-300 hover:text-amber-200 underline underline-offset-2 whitespace-nowrap"
              >
                Import as document
              </button>
            </div>
          )}
          {/* URL detection hint */}
          {detectedUrl && !largeInputWarning && (
            <div id="chat-url-hint" className="chat-url-hint flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-blue-950/20 border border-blue-500/30 text-blue-400">
              <Link2 className="size-3.5 shrink-0" />
              <p className="chat-url-text text-xs truncate flex-1">
                URL detected: <span className="chat-url-value font-medium">{detectedUrl}</span>
              </p>
              <span className="chat-url-note text-[10px] text-blue-400/60 whitespace-nowrap">
                AI will analyze this reference
              </span>
            </div>
          )}
          <div className="chat-input-wrapper relative rounded-2xl border border-border bg-card shadow-sm transition-shadow focus-within:shadow-md">
            <Textarea
              id="chat-input"
              name="message"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={isRequirementsComplete ? 'Add more details or generate PRD...' : 'Describe your project idea...'}
              className="resize-none border-0 bg-transparent min-h-[80px] max-h-[200px] px-4 pt-3.5 pb-12 text-[13px] leading-relaxed placeholder:text-muted-foreground/35 focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="chat-input-actions absolute bottom-3 right-3 flex items-center gap-2">
              {/* File upload button */}
              <input
                ref={fileInputRef}
                id="file-upload-input"
                name="file-upload"
                type="file"
                accept=".md,.txt,.markdown,.rst,.json,.yaml,.yml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileImport(file);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                name="attach-file"
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                variant="ghost"
                className="chat-attach-btn h-7 w-7 rounded-xl p-0 text-muted-foreground hover:text-foreground"
                title="Attach file (.md, .txt)"
              >
                <Paperclip className="size-4" />
              </Button>
              {isLoading && onStop && (
                <Button
                  type="button"
                  name="stop-generation"
                  onClick={onStop}
                  size="sm"
                  variant="outline"
                  className="chat-stop-btn h-7 px-3 rounded-xl gap-1.5"
                >
                  <StopCircle className="size-3.5" />
                  <span className="text-xs">Stop (Esc)</span>
                </Button>
              )}
              <Button
                id="btn-send-message"
                name="send-message"
                type="submit"
                disabled={!input.trim() || isLoading}
                size="sm"
                className="chat-send-btn h-7 w-7 rounded-xl p-0 transition-all duration-200"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
