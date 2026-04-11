'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, ClarifyQuestion } from '@/types';
import { tryParseAI, getCleanText, normalizeQuestions } from '@/hooks/use-clarification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type Props = {
  message: ChatMessage;
  index: number;
  isLoading: boolean;
  isLatest: boolean;
  pendingAnswers: Record<string, string>;
  customInputs: Record<string, string>;
  onAnswerChange: (qId: string, answer: string) => void;
  onCustomInputChange: (qId: string, value: string) => void;
  onSubmit: () => void;
  onGeneratePlan: () => void;
};

export function ChatMessageBubble({
  message,
  index,
  isLoading,
  isLatest,
  pendingAnswers,
  customInputs,
  onAnswerChange,
  onCustomInputChange,
  onSubmit,
  onGeneratePlan,
}: Props) {
  const parsedRaw = message.role === 'ASSISTANT' ? tryParseAI(message.content) : null;
  const parsed = parsedRaw
    ? { ...parsedRaw, questions: normalizeQuestions(parsedRaw.questions) }
    : null;
  const cleanText =
    getCleanText(message.content) ||
    (message.role === 'ASSISTANT' && isLoading && isLatest ? '...' : message.content);

  return (
    <div
      key={index}
      className={`flex flex-col mb-6 ${message.role === 'USER' ? 'items-end' : 'items-start'}`}
    >
      {/* Text bubble */}
      {cleanText && (
        <div
          className={`rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm ${
            message.role === 'USER'
              ? 'bg-gradient-to-br from-violet-600 to-cyan-600 text-white rounded-tr-sm'
              : 'bg-card/80 border border-border/40 text-foreground rounded-tl-sm'
          }`}
        >
          {message.role === 'USER' ? (
            <span className="whitespace-pre-wrap">{cleanText}</span>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanText}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Clarification questions */}
      {parsed?.status === 'needs_clarification' &&
        parsed.questions &&
        parsed.questions.length > 0 &&
        isLatest && (
          <div className="mt-3 w-full max-w-2xl space-y-3">
            {parsed.questions.map((q: ClarifyQuestion) => (
              <Card key={q.id} className="bg-card/60 border-border/40 p-4">
                <p className="text-sm font-medium text-foreground mb-2">{q.question}</p>
                {q.recommendation && (
                  <p className="text-xs text-muted-foreground mb-3 italic">
                    💡 {q.recommendation}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onAnswerChange(q.id, opt)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        pendingAnswers[q.id] === opt
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'bg-muted/50 border-border/40 text-muted-foreground hover:border-violet-500/50 hover:text-foreground'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {pendingAnswers[q.id] === 'Other' && (
                  <input
                    type="text"
                    placeholder="Type your answer…"
                    value={customInputs[q.id] || ''}
                    onChange={(e) => onCustomInputChange(q.id, e.target.value)}
                    className="mt-2 w-full bg-muted/50 border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
                  />
                )}
              </Card>
            ))}
            {Object.keys(pendingAnswers).length > 0 && (
              <Button
                onClick={onSubmit}
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white"
              >
                Submit Answers →
              </Button>
            )}
          </div>
        )}

      {/* Requirements complete banner */}
      {parsed?.status === 'requirements_complete' && isLatest && (
        <div className="mt-3 w-full max-w-2xl">
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-400 text-lg">✅</span>
              <span className="text-green-400 font-semibold">Requirements Complete!</span>
              <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                Ready to Generate
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              All requirements have been captured. Click below to generate the full project plan.
            </p>
            <Button
              onClick={onGeneratePlan}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
            >
              🚀 Generate Plan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
