import type {
  ProjectSummary,
  ProjectDetail,
  CommitEntry,
  ContextLogEntry,
  PlanSnapshotEntry,
} from '@/types';

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) throw new Error(`Empty response from ${res.url}`);
  const data = JSON.parse(text) as T;
  if (!res.ok) {
    const err = (data as Record<string, unknown>).error;
    throw new Error(typeof err === 'string' ? err : `HTTP ${res.status}`);
  }
  return data;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const data = await readJson<{ projects: ProjectSummary[] }>(
    await fetch('/api/projects', { cache: 'no-store' })
  );
  return data.projects;
}

export async function createProject(
  name: string,
  description?: string
): Promise<string> {
  const data = await readJson<{ project: { id: string } }>(
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
  );
  return data.project.id;
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
}

export async function patchProject(
  id: string,
  data: { name?: string; description?: string; status?: string }
): Promise<void> {
  await readJson(
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  );
}

export async function fetchProject(id: string): Promise<ProjectDetail> {
  const data = await readJson<{ project: ProjectDetail }>(
    await fetch(`/api/projects/${id}`, { cache: 'no-store' })
  );
  return data.project;
}

// ─── Commits ──────────────────────────────────────────────────────────────────

export async function fetchCommits(projectId: string): Promise<CommitEntry[]> {
  const data = await readJson<{ commits: CommitEntry[] }>(
    await fetch(`/api/projects/${projectId}/commit`, { cache: 'no-store' })
  );
  return data.commits ?? [];
}

// ─── Context logs ─────────────────────────────────────────────────────────────

export async function fetchContextLogs(projectId: string): Promise<ContextLogEntry[]> {
  const data = await readJson<{ logs: ContextLogEntry[] }>(
    await fetch(`/api/projects/${projectId}/context`, { cache: 'no-store' })
  );
  return data.logs ?? [];
}

// ─── Plan snapshots ───────────────────────────────────────────────────────────

export async function fetchSnapshots(projectId: string): Promise<PlanSnapshotEntry[]> {
  const data = await readJson<{ snapshots: PlanSnapshotEntry[] }>(
    await fetch(`/api/projects/${projectId}/plan/snapshots`, { cache: 'no-store' })
  );
  return data.snapshots ?? [];
}

export async function restoreSnapshot(
  projectId: string,
  snapshotId: string
): Promise<void> {
  await readJson(
    await fetch(`/api/projects/${projectId}/plan/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshotId }),
    })
  );
}

export async function deleteSnapshot(
  projectId: string,
  snapshotId: string
): Promise<void> {
  const res = await fetch(
    `/api/projects/${projectId}/plan/snapshots?snapshotId=${snapshotId}`,
    { method: 'DELETE' }
  );
  if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
}
