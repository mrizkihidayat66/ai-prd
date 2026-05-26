'use client';

import { ProjectCard } from '@/features/dashboard/components/project-card';
import type { ProjectSummary } from '@/types';

type Props = {
  projects: ProjectSummary[];
  deletingId: string | null;
  onDelete: (id: string) => void;
};

export function ProjectGrid({ projects, deletingId, onDelete }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onDelete={onDelete}
          deleting={deletingId === project.id}
        />
      ))}
    </div>
  );
}
