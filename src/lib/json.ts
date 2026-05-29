/**
 * Safe JSON parsing helpers.
 * 
 * Centralizes try-catch around JSON.parse to avoid request-crashing failures
 * when stored JSON columns or external responses contain malformed data.
 */

/**
 * Parse a JSON string, returning a fallback value on failure.
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    console.error('[json] parse failed:', e instanceof Error ? e.message : String(e));
    return fallback;
  }
}

/**
 * Parse a JSON string, returning null on failure (no fallback required).
 */
export function tryJsonParse<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Stringify a value, returning a fallback string on failure (e.g., circular refs).
 */
export function safeJsonStringify(value: unknown, fallback = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch (e) {
    console.error('[json] stringify failed:', e instanceof Error ? e.message : String(e));
    return fallback;
  }
}
