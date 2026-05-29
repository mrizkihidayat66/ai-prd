import type { ProjectReference, ProjectReferenceKind } from '@/types';

/**
 * Extract references from text content.
 * Supports: @url, @path, @git, @npm patterns
 */
export function extractReferences(text: string): ProjectReference[] {
  const references: ProjectReference[] = [];
  const seen = new Set<string>();

  // Match @url:https://example.com or @url(https://example.com)
  const urlPattern = /@url[:\(]\s*(https?:\/\/[^\s\)]+)\)?/gi;
  let match;
  while ((match = urlPattern.exec(text)) !== null) {
    const value = match[1];
    const key = `url:${value}`;
    if (!seen.has(key)) {
      seen.add(key);
      references.push({
        kind: 'url',
        value,
        addedAt: new Date().toISOString(),
      });
    }
  }

  // Match @path:/some/file/path or @path(./relative/path)
  const pathPattern = /@path[:\(]\s*([^\s\)]+)\)?/gi;
  while ((match = pathPattern.exec(text)) !== null) {
    const value = match[1];
    const key = `path:${value}`;
    if (!seen.has(key)) {
      seen.add(key);
      references.push({
        kind: 'path',
        value,
        addedAt: new Date().toISOString(),
      });
    }
  }

  // Match @git:owner/repo or @git(github.com/owner/repo)
  const gitPattern = /@git[:\(]\s*([^\s\)]+)\)?/gi;
  while ((match = gitPattern.exec(text)) !== null) {
    const value = match[1];
    const key = `git:${value}`;
    if (!seen.has(key)) {
      seen.add(key);
      references.push({
        kind: 'git',
        value,
        addedAt: new Date().toISOString(),
      });
    }
  }

  // Match @npm:package-name or @npm(package-name)
  const npmPattern = /@npm[:\(]\s*([^\s\)]+)\)?/gi;
  while ((match = npmPattern.exec(text)) !== null) {
    const value = match[1];
    const key = `npm:${value}`;
    if (!seen.has(key)) {
      seen.add(key);
      references.push({
        kind: 'npm',
        value,
        addedAt: new Date().toISOString(),
      });
    }
  }

  return references;
}

/**
 * Merge new references with existing ones, avoiding duplicates
 */
export function mergeReferences(
  existing: ProjectReference[],
  newRefs: ProjectReference[]
): ProjectReference[] {
  const seen = new Set<string>();
  const merged: ProjectReference[] = [];

  // Add existing first
  for (const ref of existing) {
    const key = `${ref.kind}:${ref.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(ref);
    }
  }

  // Add new ones
  for (const ref of newRefs) {
    const key = `${ref.kind}:${ref.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(ref);
    }
  }

  return merged;
}

/**
 * Format reference for display
 */
export function formatReference(ref: ProjectReference): string {
  switch (ref.kind) {
    case 'url':
      return ref.label || new URL(ref.value).hostname;
    case 'path':
      return ref.label || ref.value.split('/').pop() || ref.value;
    case 'git':
      return ref.label || ref.value;
    case 'npm':
      return ref.label || ref.value;
    default:
      return ref.value;
  }
}
