'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Trash2, MessageSquare, FileText, Calendar, Copy, Shield, Tag } from 'lucide-react';
import type { ProjectSummary } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/components/common/confirm-dialog';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/constants';
import { getTagNames } from '@/lib/tags';

type Props = {
  project: ProjectSummary;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  deleting: boolean;
};

export function ProjectCard({ project, onDelete, onDuplicate, deleting }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const tags = useMemo(() => getTagNames(project.tags), [project.tags]);
  
  const status = project.status as keyof typeof PROJECT_STATUS_LABELS;
  const hasPlan = Boolean(project.plan);
  const isClarifying = project.status === 'CLARIFYING';
  const conversationCount = project._count?.conversations ?? 0;

  // Parse validation grade from metadata
  const validationGrade = useMemo(() => {
    if (!project.metadata) return null;
    try {
      const meta = JSON.parse(project.metadata);
      return meta?.validation?.grade ?? null;
    } catch {
      return null;
    }
  }, [project.metadata]);

  function navigate() {
    router.push(isClarifying ? `/new?projectId=${project.id}` : `/project/${project.id}`);
  }

  return (
    <Card
      id={`project-card-${project.id}`}
      className="project-card group relative flex flex-col bg-card border border-border/40 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 cursor-pointer overflow-hidden h-[220px]"
      onClick={navigate}
    >
      <div className="project-card-content flex flex-col flex-1 p-4 min-w-0">
        {/* Header: title + badges */}
        <div className="project-card-header flex items-start justify-between gap-2 mb-2">
          <h3 className="project-card-title font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1 min-w-0">
            {project.name}
          </h3>
          <div className="project-card-badges flex items-center gap-1.5 shrink-0">
            {validationGrade && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-5 rounded-full ${
                  validationGrade === 'A' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                  validationGrade === 'B' ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' :
                  validationGrade === 'C' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                  'border-red-500/50 text-red-400 bg-red-500/10'
                }`}
              >
                <Shield className="w-2.5 h-2.5 mr-0.5" />
                {validationGrade}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0 h-5 rounded-full border-0 ${PROJECT_STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'}`}
            >
              {PROJECT_STATUS_LABELS[status] ?? project.status}
            </Badge>
          </div>
        </div>

        {/* Description — always takes 2 lines of space */}
        <p className="project-card-description text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2.5rem] mb-2">
          {project.description || 'No description yet'}
        </p>

        {/* Tags — read-only, max 3 shown */}
        {tags.length > 0 && (
          <div className="project-card-tags flex items-center gap-1 mb-2 overflow-hidden">
            <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 truncate max-w-[80px]"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Spacer to push footer down */}
        <div className="flex-1" />

        {/* Stats row */}
        <div className="project-card-stats flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
          <span className="project-card-stat-messages flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {conversationCount}
          </span>
          {hasPlan && (
            <span className="project-card-stat-version flex items-center gap-1">
              <FileText className="w-3 h-3" />
              v{project.plan!.version}
            </span>
          )}
          <span className="project-card-stat-date ml-auto flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Footer actions */}
        <div className="project-card-footer flex items-center justify-between border-t border-border/30 pt-2">
          <Button
            variant="outline"
            size="sm"
            name="view-project"
            className="project-card-view-btn h-6 text-[11px] gap-1 px-2 border-border/50 hover:border-primary/50 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              navigate();
            }}
          >
            {hasPlan ? <FileText className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
            {hasPlan ? 'View Plan' : 'Continue'}
            <ArrowRight className="w-3 h-3" />
          </Button>

          <div className="project-card-actions flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              name="duplicate-project"
              className="project-card-duplicate-btn h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(project.id);
              }}
              title="Duplicate project"
            >
              <Copy className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              name="delete-project"
              className="project-card-delete-btn h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              disabled={deleting}
              onClick={async (e) => {
                e.stopPropagation();
                const confirmed = await confirm({
                  title: 'Delete Project',
                  description: `Delete "${project.name}"? This action cannot be undone.`,
                  confirmLabel: 'Delete',
                  variant: 'destructive',
                });
                if (confirmed) {
                  onDelete(project.id);
                }
              }}
              title="Delete project"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
