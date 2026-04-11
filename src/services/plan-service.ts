// ─── Plan service ─────────────────────────────────────────────────────────────

export async function generatePlan(
  projectId: string,
  sections?: string[]
): Promise<{ sectionsGenerated: string[]; sectionsFailed: string[] }> {
  const body = sections ? JSON.stringify({ sections }) : '{}';
  const res = await fetch(`/api/projects/${projectId}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) throw new Error(`Plan generation failed: HTTP ${res.status}`);
  const data = (await res.json()) as {
    sectionsGenerated: string[];
    sectionsFailed: string[];
  };
  return data;
}

export async function patchPlanSection(
  projectId: string,
  section: string,
  content: string
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/plan`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, content }),
  });
  if (!res.ok) throw new Error(`Section save failed: HTTP ${res.status}`);
}

export async function downloadExport(
  projectId: string,
  projectName: string
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/export`);
  if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (projectName || 'project')
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  a.href = url;
  a.download = `${safeName}-plan.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
