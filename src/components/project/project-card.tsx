'use client';

import { useRouter } from 'next/navigation';
import type { ProjectSummary } from '@/types';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  project: ProjectSummary;
  onDelete: (id: string) => void;
  deleting: boolean;
};

export function ProjectCard({ project, onDelete, deleting }: Props) {
  const router = useRouter();
  const status = project.status as keyof typeof PROJECT_STATUS_LABELS;
  const hasPlan = Boolean(project.plan);
  const conversationCount = project._count?.conversations ?? 0;

  return (
    <Card
      className="group relative bg-card/60 border border-border/40 hover:border-violet-500/50 hover:bg-card/80 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={() => router.push(`/project/${project.id}`)}
    >
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground group-hover:text-violet-300 transition-colors line-clamp-1 flex-1">
            {project.name}
          </h3>
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border-0 ${PROJECT_STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'}`}
          >
            {PROJECT_STATUS_LABELS[status] ?? project.status}
          </Badge>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500/70" />
            {conversationCount} message{conversationCount !== 1 ? 's' : ''}
          </span>
          {hasPlan && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/70" />
              Plan v{project.plan!.version}
            </span>
          )}
          <span className="ml-auto text-[10px]">
            {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-border/50 hover:border-violet-500/50 hover:text-violet-300"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/project/${project.id}`);
            }}
          >
            {hasPlan ? '📋 View Plan' : '💬 Continue'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            disabled={deleting}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                onDelete(project.id);
              }
            }}
          >
            {deleting ? '…' : '🗑️ Delete'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
