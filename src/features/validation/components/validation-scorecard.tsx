'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  Wand2,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ValidationResult, ValidationIssue } from '@/lib/ai/agents/types';

type Props = {
  projectId: string;
  /** Pre-loaded validation result (if already validated) */
  initialResult?: ValidationResult | null;
  /** Callback when auto-refine completes (parent should refresh PRD) */
  onRefineComplete?: () => void;
  /** Callback when validation completes (parent should refresh metadata) */
  onValidationComplete?: () => void;
};

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-400',
  B: 'text-blue-400',
  C: 'text-yellow-400',
  D: 'text-orange-400',
  F: 'text-red-400',
};

const GRADE_BG: Record<string, string> = {
  A: 'bg-green-500/10 border-green-500/30',
  B: 'bg-blue-500/10 border-blue-500/30',
  C: 'bg-yellow-500/10 border-yellow-500/30',
  D: 'bg-orange-500/10 border-orange-500/30',
  F: 'bg-red-500/10 border-red-500/30',
};

const SEVERITY_ICON: Record<string, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_COLOR: Record<string, string> = {
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
};

const DIMENSION_LABELS: Record<string, string> = {
  completeness: 'Completeness',
  consistency: 'Consistency',
  clarity: 'Clarity',
  feasibility: 'Feasibility',
  diagrams: 'Diagrams & Visuals',
};

export function ValidationScorecard({ projectId, initialResult, onRefineComplete, onValidationComplete }: Props) {
  const [result, setResult] = useState<ValidationResult | null>(initialResult ?? null);
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load persisted validation result from project metadata on mount
  useEffect(() => {
    if (result) return; // already have a result (from initialResult or previous run)
    async function loadPersistedValidation() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) return;
        const data = await res.json();
        const metadata = data.project?.metadata ? JSON.parse(data.project.metadata) : null;
        if (metadata?.validation) {
          setResult(metadata.validation as ValidationResult);
        }
      } catch {
        // ignore — will show validate button
      }
    }
    loadPersistedValidation();
  }, [projectId, result]);

  async function runValidation() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/validate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Validation failed');
      }
      const data = await res.json();
      setResult(data.validation);
      onValidationComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function autoRefine() {
    if (!result) return;
    setRefining(true);
    setError(null);
    try {
      // Build refinement instructions from validation issues
      const issuesSummary = (result.issues ?? [])
        .filter(i => i.severity === 'error' || i.severity === 'warning')
        .map(i => `[${i.severity.toUpperCase()}] ${i.section}: ${i.message}${i.suggestion ? ` (Suggestion: ${i.suggestion})` : ''}`)
        .join('\n');

      const refinementPrompt = `Based on quality validation (score: ${result.score}/100, grade: ${result.grade}), please fix the following issues to improve the PRD:\n\n${issuesSummary}\n\nPlease address all errors and warnings to bring the score above 70.\n\nIMPORTANT: Fix these issues by enriching the EXISTING sections only (add detail, tables, diagrams, or sub-sections where relevant). Do NOT add any new top-level (## ) sections — no Glossary, Open Questions, Decisions Needed, or Launch Readiness. Keep the document's 17-section structure exactly as-is.`;

      // Timeout protection: abort if streaming takes longer than 120s
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);

      const res = await fetch(`/api/projects/${projectId}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: refinementPrompt }),
        signal: controller.signal,
      });
      if (!res.ok) {
        clearTimeout(timeout);
        const text = await res.text();
        throw new Error(text || 'Auto-refine failed');
      }
      // Consume the streaming response fully so server onFinish fires
      const reader = res.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
      clearTimeout(timeout);
      // After refine, notify parent and re-validate
      onRefineComplete?.();
      await runValidation();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Auto-refine timed out (>120s). The AI model may be overloaded — please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setRefining(false);
    }
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Shield className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Run quality validation to check your PRD for completeness, consistency, and best practices.
        </p>
        {error && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-red-400 text-center max-w-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={runValidation} disabled={loading}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        )}
        <Button onClick={runValidation} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Validate PRD
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grade Header */}
      <div className={`flex items-center gap-4 p-4 rounded-lg border ${GRADE_BG[result.grade]}`}>
        <div className={`text-4xl font-bold ${GRADE_COLORS[result.grade]}`}>
          {result.grade}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{result.score}/100</span>
            <CheckCircle2 className={`h-4 w-4 ${result.score >= 70 ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
        </div>
        <div className="flex items-center gap-2">
          {result.score < 70 && (
            <Button
              variant="default"
              size="sm"
              onClick={autoRefine}
              disabled={refining || loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {refining ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-1" />
              )}
              {refining ? 'Refining...' : 'Auto-Refine'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={runValidation} disabled={loading || refining}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Re-validate'}
          </Button>
        </div>
      </div>

      {/* Quality Gate Status */}
      {result.score >= 70 ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <span className="text-sm text-green-400 font-medium">Quality gate passed — Task Breakdown unlocked</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-400 font-medium">Quality gate not met (min. 70) — Use Auto-Refine or improve manually</span>
        </div>
      )}

      {/* Dimension Scores */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(result.sectionScores).map(([key, score]) => (
          <Card key={key} className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {DIMENSION_LABELS[key] || key}
            </div>
            <div className={`text-lg font-bold ${
              score >= 80 ? 'text-green-400' :
              score >= 60 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {score}
            </div>
            {/* Score bar */}
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  score >= 80 ? 'bg-green-400' :
                  score >= 60 ? 'bg-yellow-400' :
                  'bg-red-400'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Issues List */}
      {result.issues && result.issues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            Issues
            <span className="text-xs text-muted-foreground">
              ({result.issues.filter(i => i.severity === 'error').length} errors,{' '}
              {result.issues.filter(i => i.severity === 'warning').length} warnings)
            </span>
          </h4>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {result.issues
              .sort((a, b) => {
                const order = { error: 0, warning: 1, info: 2 };
                return order[a.severity] - order[b.severity];
              })
              .map((issue: ValidationIssue) => {
                const Icon = SEVERITY_ICON[issue.severity];
                return (
                  <div
                    key={issue.id}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm"
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${SEVERITY_COLOR[issue.severity]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{issue.section}</span>
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                          {issue.category}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5">{issue.message}</p>
                      {issue.suggestion && (
                        <p className="text-xs text-blue-400 mt-1">💡 {issue.suggestion}</p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
