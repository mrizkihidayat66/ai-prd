'use client';

import { REQUIREMENT_DIMENSIONS } from '@/types';
import { PLAN_SECTION_LABELS } from '@/types';

const ALL_PLAN_KEYS = Object.keys(PLAN_SECTION_LABELS);

// ─── Requirements Radar ───────────────────────────────────────────────────────

type RadarProps = {
  coveredDimensions: string[];
};

export function RequirementsRadar({ coveredDimensions }: RadarProps) {
  const covered = new Set(coveredDimensions);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Requirements Radar
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        {REQUIREMENT_DIMENSIONS.map((dim) => {
          const isCovered = covered.has(dim.key);
          return (
            <div
              key={dim.key}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs border transition-all ${
                isCovered
                  ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                  : 'bg-muted/30 border-border/30 text-muted-foreground'
              }`}
            >
              <span className="text-base leading-none">{dim.icon}</span>
              <span className="font-medium truncate">{dim.label}</span>
              {isCovered && (
                <span className="ml-auto text-violet-400 shrink-0">✓</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground px-1 text-center">
        {coveredDimensions.length}/{REQUIREMENT_DIMENSIONS.length} dimensions covered
      </p>
    </div>
  );
}

// ─── Plan Progress Panel ─────────────────────────────────────────────────────

type ProgressProps = {
  planProgress: string[];
};

export function PlanProgressPanel({ planProgress }: ProgressProps) {
  const done = new Set(planProgress);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Generating Plan
      </h3>
      <div className="space-y-1">
        {ALL_PLAN_KEYS.map((key) => {
          const label = PLAN_SECTION_LABELS[key as keyof typeof PLAN_SECTION_LABELS] ?? key;
          const isDone = done.has(key);
          return (
            <div
              key={key}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                isDone
                  ? 'text-green-400 bg-green-500/10'
                  : 'text-muted-foreground'
              }`}
            >
              <span className="shrink-0">{isDone ? '✅' : '⏳'}</span>
              <span className="truncate">{label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground px-1 text-center">
        {planProgress.length}/{ALL_PLAN_KEYS.length} sections complete
      </p>
    </div>
  );
}
