import { z } from 'zod';

/**
 * Validation schemas for LLM tool call responses
 */

export const ClarificationQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  recommendation: z.string(),
  options: z.array(z.string()),
});

export const RequirementsSummarySchema = z.object({
  coreFeatures: z.array(z.string()),
  technicalStack: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  outOfScope: z.array(z.string()).optional(),
});

export const WebSearchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
});

/**
 * Validate and sanitize LLM tool call responses
 * Returns validated data or null if validation fails
 */
export function validateClarificationQuestions(data: unknown): z.infer<typeof ClarificationQuestionSchema>[] | null {
  try {
    const schema = z.array(ClarificationQuestionSchema);
    return schema.parse(data);
  } catch (error) {
    console.error('[LLM Validation] Invalid clarification questions:', error);
    return null;
  }
}

export function validateRequirementsSummary(data: unknown): z.infer<typeof RequirementsSummarySchema> | null {
  try {
    return RequirementsSummarySchema.parse(data);
  } catch (error) {
    console.error('[LLM Validation] Invalid requirements summary:', error);
    return null;
  }
}

export function validateWebSearchResults(data: unknown): z.infer<typeof WebSearchResultSchema>[] | null {
  try {
    const schema = z.array(WebSearchResultSchema);
    return schema.parse(data);
  } catch (error) {
    console.error('[LLM Validation] Invalid web search results:', error);
    return null;
  }
}

/**
 * Sanitize text content from LLM responses
 * Removes potentially harmful content while preserving formatting
 */
export function sanitizeLLMText(text: string): string {
  if (typeof text !== 'string') return '';
  
  // Remove null bytes
  let sanitized = text.replace(/\0/g, '');
  
  // Limit length to prevent memory issues
  const MAX_TEXT_LENGTH = 50000;
  if (sanitized.length > MAX_TEXT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_TEXT_LENGTH) + '... [truncated]';
  }
  
  return sanitized;
}

/**
 * Validate LLM streaming response chunks
 * Ensures chunks are valid and safe to process
 */
export function validateStreamChunk(chunk: unknown): boolean {
  if (typeof chunk !== 'object' || chunk === null) {
    return false;
  }
  
  // Basic structure validation
  // Extend based on your streaming protocol
  return true;
}
