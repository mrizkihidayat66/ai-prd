'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Trash2, MessageSquare, FileText, Calendar } from 'lucide-react';
import type { ProjectSummary } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/constants';

type Props = {
  project: ProjectSummary;
  onDelete: (id: string) => void;
  deleting: boolean;
};

export function ProjectCard({ project, onDelete, deleting }: Props) {
  const router = useRouter();
  const status = project.status as keyof typeof PROJECT_STATUS_LABELS;
  const hasPlan = Boolean(project.plan);
  const isClarifying = project.status === 'CLARIFYING';
  const conversationCount = project._count?.conversations ?? 0;

  function navigate() {
    router.push(isClarifying ? `/new?projectId=${project.id}` : `/project/${project.id}`);
  }

  return (
    <Card
      className="group relative bg-card border border-border/40 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={navigate}
    >
      <div className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1">
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
            <MessageSquare className="w-3 h-3" />
            {conversationCount} message{conversationCount !== 1 ? 's' : ''}
          </span>
          {hasPlan && (
            <span className="flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              Plan v{project.plan!.version}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 border-border/50 hover:border-primary/50 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              navigate();
            }}
          >
            {hasPlan ? <FileText className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
            {hasPlan ? 'View Plan' : 'Continue'}
            <ArrowRight className="w-3 h-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            disabled={deleting}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                onDelete(project.id);
              }
            }}
          >
            <Trash2 className="w-3 h-3" />
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
