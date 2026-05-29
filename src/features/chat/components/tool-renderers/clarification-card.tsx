'use client';

import { useState } from 'react';
import { CheckCircle2, Lightbulb, MessageSquare, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Question = {
  id: string;
  dimension: string;
  question: string;
  options: string[];
  recommendation: string;
};

type Props = {
  questions: Question[];
  onAnswer: (questionId: string, answer: string) => void;
  disabled?: boolean;
};

const OTHER_OPTION = '__other__';
const SKIP_OPTION = '__skip__';

export function ClarificationCard({ questions, onAnswer, disabled }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [customText, setCustomText] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Guard against undefined/invalid questions
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return null;
  }

  function handleSelect(qId: string, option: string) {
    if (submitted || disabled) return;
    setSelected((prev) => ({ ...prev, [qId]: option }));
  }

  function handleCustomTextChange(qId: string, text: string) {
    setCustomText((prev) => ({ ...prev, [qId]: text }));
  }

  function handleSubmit() {
    if (submitted || disabled) return;
    setSubmitted(true);
    const answers = questions
      .map((q) => {
        const answer = selected[q.id];
        if (!answer || answer === SKIP_OPTION) return null;
        if (answer === OTHER_OPTION) {
          const custom = customText[q.id]?.trim();
          if (!custom) return null;
          return `**${q.dimension}**: ${custom}`;
        }
        return `**${q.dimension}**: ${answer}`;
      })
      .filter(Boolean)
      .join('\n');
    if (answers) {
      onAnswer(questions[0].id, answers);
    }
  }

  // All questions must be either answered (option selected), have custom text (if "other"), or skipped
  const allAnswered = questions.every((q) => {
    const sel = selected[q.id];
    if (!sel) return false;
    if (sel === OTHER_OPTION) return !!customText[q.id]?.trim();
    return true; // includes SKIP_OPTION
  });

  return (
    <div id="clarification-card" className="clarification-card space-y-4 my-3">
      {questions.map((q) => {
        const safeOptions = Array.isArray(q.options) ? q.options : [];
        const isOtherSelected = selected[q.id] === OTHER_OPTION;
        const isSkipped = selected[q.id] === SKIP_OPTION;
        return (
        <div key={q.id} className={`clarification-question rounded-xl border border-border bg-muted/20 p-4 ${isSkipped ? 'opacity-50' : ''}`}>
          <p className="clarification-question-text text-sm font-medium mb-1">{q.question}</p>
          <p className="clarification-recommendation text-xs text-muted-foreground mb-3 flex items-start gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/70" />
            {q.recommendation}
          </p>
          <div className="clarification-options flex flex-wrap gap-2">
            {safeOptions.map((opt) => {
              const isSelected = selected[q.id] === opt;
              return (
                <Button
                  key={opt}
                  id={`opt-${q.id}-${safeOptions.indexOf(opt)}`}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className={`text-xs h-auto py-1.5 px-3 max-w-[280px] whitespace-normal text-left leading-snug ${isSelected ? '' : 'border-border hover:border-primary/50'}`}
                  onClick={() => handleSelect(q.id, opt)}
                  disabled={submitted || disabled}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
                  <span className="line-clamp-3">{opt}</span>
                </Button>
              );
            })}
            {/* "Other" option */}
            <Button
              variant={isOtherSelected ? 'default' : 'outline'}
              size="sm"
              className={`text-xs h-8 ${isOtherSelected ? '' : 'border-border hover:border-primary/50'}`}
              onClick={() => handleSelect(q.id, OTHER_OPTION)}
              disabled={submitted || disabled}
            >
              {isOtherSelected && <MessageSquare className="w-3.5 h-3.5 mr-1.5" />}
              Other
            </Button>
            {/* "Skip" option */}
            <Button
              variant={isSkipped ? 'secondary' : 'ghost'}
              size="sm"
              className={`text-xs h-8 ${isSkipped ? 'text-muted-foreground' : 'text-muted-foreground/60 hover:text-muted-foreground'}`}
              onClick={() => handleSelect(q.id, SKIP_OPTION)}
              disabled={submitted || disabled}
            >
              <SkipForward className="w-3.5 h-3.5 mr-1" />
              Skip
            </Button>
          </div>
          {/* Custom text area for "Other" */}
          {isOtherSelected && !submitted && (
            <div className="mt-3">
              <Textarea
                placeholder="Provide your own answer..."
                value={customText[q.id] || ''}
                onChange={(e) => handleCustomTextChange(q.id, e.target.value)}
                className="min-h-[60px] max-h-[120px] text-xs resize-none bg-background border-border"
                disabled={disabled}
              />
            </div>
          )}
        </div>
      );})}
      {!submitted && (
        <Button
          id="btn-submit-answers"
          onClick={handleSubmit}
          disabled={!allAnswered || disabled}
          size="sm"
          className="w-full"
        >
          Submit Answers
        </Button>
      )}
      {submitted && (
        <p className="text-xs text-muted-foreground text-center">Answers submitted</p>
      )}
    </div>
  );
}
