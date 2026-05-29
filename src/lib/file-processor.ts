/**
 * File processor utility for handling uploaded documents and large text inputs.
 * Extracts text content, chunks if needed, and provides metadata.
 */

export type ProcessedDocument = {
  content: string;
  filename: string;
  charCount: number;
  wordCount: number;
  isLarge: boolean;
  truncated: boolean;
  summary?: string;
};

/** Threshold above which we consider input "large" and suggest upload */
export const LARGE_INPUT_THRESHOLD = 5000;

/** Maximum characters we'll send as context (to avoid overwhelming the LLM) */
const MAX_CONTEXT_CHARS = 30000;

/**
 * Extract text content from a File object.
 * Supports .md, .txt, .markdown, .rst, .json, .yaml, .yml
 */
export async function extractTextFromFile(file: File): Promise<ProcessedDocument> {
  const text = await file.text();
  return processText(text, file.name);
}

/**
 * Process raw text input (from paste or file).
 * Handles chunking and metadata extraction.
 */
export function processText(text: string, filename: string = 'pasted-content.md'): ProcessedDocument {
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const isLarge = charCount > LARGE_INPUT_THRESHOLD;
  let truncated = false;
  let content = text;

  // Truncate if exceeds max context
  if (charCount > MAX_CONTEXT_CHARS) {
    content = text.slice(0, MAX_CONTEXT_CHARS);
    truncated = true;
  }

  return {
    content,
    filename,
    charCount,
    wordCount,
    isLarge,
    truncated,
  };
}

/**
 * Format a processed document as a context message for the AI.
 */
export function formatDocumentAsContext(doc: ProcessedDocument): string {
  const header = `📄 **Imported Document**: ${doc.filename} (${doc.wordCount} words, ${doc.charCount} chars)`;
  const truncationNote = doc.truncated
    ? `\n⚠️ *Document was truncated to ${MAX_CONTEXT_CHARS} characters. The full document has ${doc.charCount} characters.*`
    : '';

  return `${header}${truncationNote}\n\n---\n\n${doc.content}`;
}

/**
 * Check if pasted text is large enough to warrant a warning.
 */
export function shouldWarnLargeInput(text: string): boolean {
  return text.length > LARGE_INPUT_THRESHOLD;
}

/**
 * Get a human-readable size description.
 */
export function getInputSizeDescription(text: string): string {
  const chars = text.length;
  const words = text.split(/\s+/).filter(Boolean).length;

  if (chars < 1000) return `${words} words`;
  if (chars < 10000) return `~${Math.round(words / 100) * 100} words (${Math.round(chars / 1000)}k chars)`;
  return `~${Math.round(words / 1000)}k words (${Math.round(chars / 1000)}k chars)`;
}
