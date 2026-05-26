'use client';

import { useRef, useEffect, useState } from 'react';
import { Send, Lightbulb, FileText, Loader2, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClarificationCard } from './tool-renderers/clarification-card';
import { RequirementsSummary } from './tool-renderers/requirements-summary';
import { WebSearchCard } from './tool-renderers/web-search-card';
import type { UIMessage } from 'ai';

type Props = {
  messages: UIMessage[];
  isLoading: boolean;
  isRequirementsComplete: boolean;
  onSendMessage: (message: string) => void;
  onSendAnswer: (questionId: string, answer: string) => void;
  onGeneratePrd: () => void;
  onFileImport: (file: File) => void;
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
  generatingPrd,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  }

  function renderMessageParts(message: UIMessage) {
    return message.parts?.map((part, idx) => {
      const key = `${message.id}-part-${idx}`;

      if (part.type === 'text') {
        if (!part.text?.trim()) return null;
        return (
          <div key={key} className="prose prose-invert prose-sm max-w-none">
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
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages area */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-y-auto touch-pan-y"
        >
          <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-5 px-4 py-6">
            {messages.length === 0 && !isLoading && (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center py-20">
                  <div className="flex justify-center mb-4">
                    <Lightbulb className="w-12 h-12 text-primary opacity-60" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Describe your project</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Tell the AI what you want to build. Be as detailed or vague as you like — it will
                    ask follow-up questions to clarify requirements.
                  </p>
                  <div
                    id="file-import-zone"
                    className="max-w-sm mx-auto border-2 border-dashed border-border/50 rounded-xl p-6 hover:border-primary/40 transition-colors cursor-pointer bg-muted/10"
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

            {messages.map((msg) => (
              <div
                key={msg.id}
                className="group/message w-full"
                data-role={msg.role}
              >
                <div className={msg.role === 'user' ? 'flex flex-col items-end gap-2' : 'flex items-start gap-3'}>
                  {msg.role === 'assistant' && (
                    <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
                        <SparklesIcon className="size-3.5" />
                      </div>
                    </div>
                  )}

                  {msg.role === 'user' ? (
                    <div className="w-fit max-w-[min(80%,56ch)] overflow-hidden break-words rounded-2xl rounded-br-lg border border-border/30 bg-gradient-to-br from-secondary to-muted px-3.5 py-2 shadow-sm">
                      <p className="text-[13px] leading-[1.65] whitespace-pre-wrap">
                        {msg.parts
                          ?.filter((p) => p.type === 'text')
                          .map((p) => (p as { type: 'text'; text: string }).text)
                          .join('') || ''}
                      </p>
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-col gap-2 text-[13px] leading-[1.65]">
                      {renderMessageParts(msg)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages.at(-1)?.role !== 'assistant' && (
              <div className="group/message w-full" data-role="assistant">
                <div className="flex items-start gap-3">
                  <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
                      <SparklesIcon className="size-3.5" />
                    </div>
                  </div>
                  <div className="flex h-[calc(13px*1.65)] items-center text-[13px] leading-[1.65]">
                    <span className="animate-pulse font-medium text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} className="min-h-[24px] shrink-0" />
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border/40 bg-background/80 backdrop-blur-xl p-4 shrink-0">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="relative rounded-2xl border border-border/30 bg-card/70 shadow-sm transition-shadow focus-within:shadow-md">
            <Textarea
              id="chat-input"
              name="message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRequirementsComplete ? 'Add more details or generate PRD...' : 'Describe your project idea...'}
              className="resize-none border-0 bg-transparent min-h-[80px] max-h-[200px] px-4 pt-3.5 pb-12 text-[13px] leading-relaxed placeholder:text-muted-foreground/35 focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <Button
                id="btn-send-message"
                type="submit"
                disabled={!input.trim() || isLoading}
                size="sm"
                className="h-7 w-7 rounded-xl p-0 transition-all duration-200"
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
