'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  ProjectDetail,
  CommitEntry,
  ContextLogEntry,
  PlanSnapshotEntry,
} from '@/types';
import {
  fetchProject,
  fetchCommits,
  fetchContextLogs,
  fetchSnapshots,
} from '@/services/project-service';

export function useProject(id: string) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [contextLogs, setContextLogs] = useState<ContextLogEntry[]>([]);
  const [snapshots, setSnapshots] = useState<PlanSnapshotEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchProject(id);
      setProject(data);
    } catch (err) {
      console.error('Failed to load project', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refreshCommits = useCallback(async () => {
    try {
      setCommits(await fetchCommits(id));
    } catch (err) {
      console.error('Failed to load commits', err);
    }
  }, [id]);

  const refreshContextLogs = useCallback(async () => {
    try {
      setContextLogs(await fetchContextLogs(id));
    } catch (err) {
      console.error('Failed to load context logs', err);
    }
  }, [id]);

  const refreshSnapshots = useCallback(async () => {
    try {
      setSnapshots(await fetchSnapshots(id));
    } catch (err) {
      console.error('Failed to load snapshots', err);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
    void refreshCommits();
    void refreshContextLogs();
    void refreshSnapshots();
  }, [refresh, refreshCommits, refreshContextLogs, refreshSnapshots]);

  return {
    project,
    commits,
    contextLogs,
    snapshots,
    loading,
    refresh,
    refreshCommits,
    refreshContextLogs,
    refreshSnapshots,
    setProject,
  };
}
