import type { ProjectSummary, ProjectDetail } from '@/types';

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

export async function fetchProject(id: string): Promise<ProjectDetail> {
  const data = await readJson<{ project: ProjectDetail }>(
    await fetch(`/api/projects/${id}`, { cache: 'no-store' })
  );
  return data.project;
}
