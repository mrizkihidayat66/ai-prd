'use client';

import { useState } from 'react';
import { CheckCircle2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export function ClarificationCard({ questions, onAnswer, disabled }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSelect(qId: string, option: string) {
    if (submitted || disabled) return;
    setSelected((prev) => ({ ...prev, [qId]: option }));
  }

  function handleSubmit() {
    if (submitted || disabled) return;
    setSubmitted(true);
    const answers = questions
      .map((q) => {
        const answer = selected[q.id];
        if (!answer) return null;
        return `**${q.dimension}**: ${answer}`;
      })
      .filter(Boolean)
      .join('\n');
    if (answers) {
      onAnswer(questions[0].id, answers);
    }
  }

  const allAnswered = questions.every((q) => selected[q.id]);

  return (
    <div className="space-y-4 my-3">
      {questions.map((q) => (
        <div key={q.id} className="rounded-xl border border-border/50 bg-muted/20 p-4">
          <p className="text-sm font-medium mb-1">{q.question}</p>
          <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/70" />
            {q.recommendation}
          </p>
          <div className="flex flex-wrap gap-2">
            {q.options.map((opt) => {
              const isSelected = selected[q.id] === opt;
              return (
                <Button
                  key={opt}
                  id={`opt-${q.id}-${q.options.indexOf(opt)}`}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className={`text-xs h-8 ${isSelected ? '' : 'border-border/50 hover:border-primary/50'}`}
                  onClick={() => handleSelect(q.id, opt)}
                  disabled={submitted || disabled}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                  {opt}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
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
