/**
 * Zod schemas for validating LLM responses.
 * Ensures AI outputs conform to expected structures before processing.
 */

import { z } from "zod";

/**
 * Clarification questions response from LLM
 */
export const clarificationResponseSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string().min(1),
      options: z.array(z.string()).optional(),
      type: z.enum(["single", "multiple", "text"]).optional(),
    })
  ).min(1).max(10),
});

export type ClarificationResponse = z.infer<typeof clarificationResponseSchema>;

/**
 * PRD generation response — just validates it's a non-empty string with expected sections
 */
export const prdResponseSchema = z.string()
  .min(100, "PRD response too short")
  .refine(
    (content) => content.includes("##"),
    "PRD must contain section headings (##)"
  );

/**
 * Validation scorecard response from validate agent
 */
export const validationResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  dimensions: z.array(
    z.object({
      name: z.string(),
      score: z.number().min(0).max(100),
      feedback: z.string(),
      issues: z.array(z.string()).optional(),
    })
  ),
  summary: z.string(),
  criticalIssues: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
});

export type ValidationResponse = z.infer<typeof validationResponseSchema>;

/**
 * Task breakdown response from task-breakdown agent
 */
export const taskBreakdownResponseSchema = z.object({
  phases: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      tasks: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          priority: z.enum(["critical", "high", "medium", "low"]).optional(),
          estimatedHours: z.number().optional(),
          dependencies: z.array(z.string()).optional(),
          acceptanceCriteria: z.array(z.string()).optional(),
        })
      ),
    })
  ).min(1),
  totalEstimatedHours: z.number().optional(),
  ganttChart: z.string().optional(),
});

export type TaskBreakdownResponse = z.infer<typeof taskBreakdownResponseSchema>;

/**
 * Research agent response
 */
export const researchResponseSchema = z.object({
  findings: z.array(
    z.object({
      topic: z.string(),
      summary: z.string(),
      relevance: z.enum(["high", "medium", "low"]).optional(),
    })
  ),
  competitors: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      strengths: z.array(z.string()).optional(),
      weaknesses: z.array(z.string()).optional(),
    })
  ).optional(),
  recommendations: z.array(z.string()).optional(),
});

export type ResearchResponse = z.infer<typeof researchResponseSchema>;

/**
 * Architecture agent response
 */
export const architectureResponseSchema = z.object({
  recommendation: z.string(),
  stack: z.object({
    frontend: z.array(z.string()).optional(),
    backend: z.array(z.string()).optional(),
    database: z.array(z.string()).optional(),
    infrastructure: z.array(z.string()).optional(),
  }).optional(),
  diagrams: z.array(
    z.object({
      type: z.string(),
      mermaid: z.string(),
    })
  ).optional(),
  tradeoffs: z.array(
    z.object({
      option: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
    })
  ).optional(),
});

export type ArchitectureResponse = z.infer<typeof architectureResponseSchema>;

/**
 * Safely parse and validate an LLM JSON response.
 * Returns the validated data or null if parsing/validation fails.
 */
export function validateLLMResponse<T>(
  raw: string,
  schema: z.ZodSchema<T>,
  context?: string
): { data: T; error: null } | { data: null; error: string } {
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonStr = raw.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    const validated = schema.parse(parsed);
    return { data: validated, error: null };
  } catch (error) {
    const prefix = context ? `[${context}]` : "[LLM]";
    if (error instanceof z.ZodError) {
      const msg = `${prefix} Response validation failed: ${error.issues[0]?.message}`;
      console.error(msg);
      return { data: null, error: msg };
    }
    if (error instanceof SyntaxError) {
      const msg = `${prefix} Response is not valid JSON`;
      console.error(msg, raw.slice(0, 200));
      return { data: null, error: msg };
    }
    return { data: null, error: `${prefix} Unknown validation error` };
  }
}
