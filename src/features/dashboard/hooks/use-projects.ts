'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ProjectSummary } from '@/types';
import { fetchProjects, createProject, deleteProject } from '@/services/project-service';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteProject(id);
        await refresh();
      } catch (err) {
        console.error('Failed to delete project', err);
      } finally {
        setDeletingId(null);
      }
    },
    [refresh]
  );

  const create = useCallback(
    async (name: string, description?: string): Promise<string | null> => {
      try {
        return await createProject(name, description);
      } catch (err) {
        console.error('Failed to create project', err);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = search.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : projects;

  return { projects, filtered, loading, search, setSearch, deletingId, refresh, remove, create };
}
