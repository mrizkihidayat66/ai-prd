'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import type { ProjectSummary, ProjectStatus } from '@/types';
import { fetchProjects, createProject, deleteProject, duplicateProject } from '@/services/project-service';
import { getTagNames } from '@/lib/tags';

export type SortOption = 'updated' | 'created' | 'name' | 'status';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects', err);
      toast.error('Failed to load projects', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteProject(id);
        toast.success('Project deleted successfully');
        await refresh();
      } catch (err) {
        console.error('Failed to delete project', err);
        toast.error('Failed to delete project', {
          description: err instanceof Error ? err.message : 'An unexpected error occurred',
        });
      } finally {
        setDeletingId(null);
      }
    },
    [refresh]
  );

  const create = useCallback(
    async (name: string, description?: string): Promise<string | null> => {
      try {
        const id = await createProject(name, description);
        toast.success('Project created successfully');
        return id;
      } catch (err) {
        console.error('Failed to create project', err);
        toast.error('Failed to create project', {
          description: err instanceof Error ? err.message : 'An unexpected error occurred',
        });
        return null;
      }
    },
    []
  );

  const duplicate = useCallback(
    async (id: string) => {
      try {
        await duplicateProject(id);
        toast.success('Project duplicated successfully');
        await refresh();
      } catch (err) {
        console.error('Failed to duplicate project', err);
        toast.error('Failed to duplicate project', {
          description: err instanceof Error ? err.message : 'An unexpected error occurred',
        });
      }
    },
    [refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Get all unique tags from projects
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    projects.forEach((p) => {
      const tags = getTagNames(p.tags);
      tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [projects]);

  // Toggle tag filter
  const toggleTagFilter = useCallback((tag: string) => {
    setTagFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setStatusFilter('ALL');
    setTagFilters([]);
    setSearch('');
  }, []);

  // Apply all filters and sorting
  const filtered = useMemo(() => {
    let result = projects;

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description ?? '').toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Tag filters (AND logic: project must have all selected tags)
    if (tagFilters.length > 0) {
      result = result.filter((p) => {
        const projectTags = getTagNames(p.tags);
        return tagFilters.every((tag) => projectTags.includes(tag));
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status': {
          const statusOrder = ['CLARIFYING', 'REQUIREMENTS_LOCKED', 'GENERATING', 'PLAN_GENERATED', 'COMPLETED'];
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [projects, search, statusFilter, tagFilters, sortBy]);

  return {
    projects,
    filtered,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    tagFilters,
    toggleTagFilter,
    availableTags,
    sortBy,
    setSortBy,
    clearFilters,
    deletingId,
    refresh,
    remove,
    duplicate,
    create,
  };
}
