import type { ProjectTag } from '@/types';

/**
 * Parse tags JSON string to array of ProjectTag objects
 */
export function parseTags(tagsJson: string | null): ProjectTag[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    if (Array.isArray(parsed)) {
      // If it's array of strings, convert to ProjectTag format
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        return parsed.map((name) => ({ name }));
      }
      // If it's already ProjectTag format
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Stringify tags array to JSON
 */
export function stringifyTags(tags: string[] | ProjectTag[]): string {
  if (tags.length === 0) return '[]';
  // Normalize to array of strings
  const tagNames = tags.map((tag) => (typeof tag === 'string' ? tag : tag.name));
  return JSON.stringify(tagNames);
}

/**
 * Extract tag names from ProjectTag array
 */
export function getTagNames(tags: ProjectTag[] | undefined): string[] {
  if (!tags) return [];
  return tags.map((tag) => tag.name);
}
