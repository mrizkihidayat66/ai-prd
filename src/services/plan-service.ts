export async function patchPlanContent(
  projectId: string,
  content: string
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/plan`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Plan save failed: HTTP ${res.status}`);
}

export async function downloadPrd(
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
  a.download = `${safeName}-PRD.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
