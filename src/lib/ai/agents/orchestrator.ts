/**
 * Agent Orchestrator — Routes work to the appropriate agent based on workflow phase.
 * 
 * This is the central coordination layer that manages the multi-agent workflow.
 * It determines which agent to invoke, passes context, and manages state transitions.
 */

import { streamText } from 'ai';
import { getSettings, getModel } from '@/lib/ai/provider';
import { VALIDATE_AGENT } from './validate-agent';
import { TASK_BREAKDOWN_AGENT } from './task-breakdown-agent';
import { RESEARCH_AGENT } from './research-agent';
import { ARCHITECTURE_AGENT } from './architecture-agent';
import type {
  AgentRole,
  WorkflowPhase,
  ValidationResult,
  TaskBreakdownResult,
} from './types';

type AgentInvokeOptions = {
  role: AgentRole;
  input: string;
  /** Additional context to prepend to the user message */
  context?: string;
};

type AgentResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  /** Raw text response from the model */
  rawText?: string;
};

/**
 * Get the agent definition by role
 */
function getAgentByRole(role: AgentRole) {
  switch (role) {
    case 'validate':
      return VALIDATE_AGENT;
    case 'task-breakdown':
      return TASK_BREAKDOWN_AGENT;
    case 'research':
      return RESEARCH_AGENT;
    case 'architecture':
      return ARCHITECTURE_AGENT;
    default:
      throw new Error(`Agent role "${role}" is not available for orchestrated invocation`);
  }
}

/**
 * Robustly extract JSON from AI response text.
 * Tries multiple strategies in order:
 * 1. Direct parse
 * 2. Strip markdown fences then parse
 * 3. Find outermost {...} or [...] and parse
 * 4. Return null if all fail
 */
function extractJSON<T>(text: string): T | null {
  const trimmed = text.trim();

  // Strategy 1: Direct parse
  try {
    return JSON.parse(trimmed) as T;
  } catch { /* continue */ }

  // Strategy 2: Strip markdown code fences
  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '');
  try {
    return JSON.parse(fenceStripped) as T;
  } catch { /* continue */ }

  // Strategy 3: Find outermost JSON object or array
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  let startIdx = -1;
  let openChar = '{';
  let closeChar = '}';

  if (firstBrace === -1 && firstBracket === -1) return null;
  if (firstBrace === -1) {
    startIdx = firstBracket;
    openChar = '[';
    closeChar = ']';
  } else if (firstBracket === -1) {
    startIdx = firstBrace;
  } else if (firstBracket < firstBrace) {
    startIdx = firstBracket;
    openChar = '[';
    closeChar = ']';
  } else {
    startIdx = firstBrace;
  }

  // Walk forward to find matching close
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        const candidate = trimmed.slice(startIdx, i + 1);
        try {
          return JSON.parse(candidate) as T;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

/**
 * Invoke an agent with structured input and parse JSON response.
 * Used for non-streaming agents (validate, task-breakdown, research, architecture).
 */
async function invokeAgent<T>(options: AgentInvokeOptions): Promise<AgentResponse<T>> {
  const { role, input, context } = options;
  const agent = getAgentByRole(role);
  const settings = await getSettings();
  const model = getModel(settings);

  const userMessage = context
    ? `${context}\n\n---\n\n${input}`
    : input;

  try {
    const stream = streamText({
      model,
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: agent.temperature ?? settings.temperature,
      maxOutputTokens: agent.maxOutputTokens ?? settings.maxTokens,
    });

    // Collect the full streamed response
    const result = await stream;
    const text = (await result.text).trim();
    const finishReason = await result.finishReason;

    // Check if response was truncated due to token limit
    if (finishReason === 'length') {
      console.warn(`[orchestrator] Agent "${role}" response truncated (finishReason=length). Output may be incomplete.`);
    }

    // Robust JSON extraction with multiple fallback strategies
    const data = extractJSON<T>(text);
    if (data !== null) {
      return { success: true, data, rawText: text };
    }

    // If truncated, don't bother retrying with the same text — it's incomplete JSON
    if (finishReason === 'length') {
      return { success: false, error: 'Response was truncated due to token limits. The output JSON is incomplete.', rawText: text };
    }

    // If all extraction strategies fail, retry once with a stricter prompt
    try {
      const retryStream = streamText({
        model,
        system: 'You are a JSON formatter. Convert the following text into a valid JSON object matching the original structure. Return ONLY the JSON — no markdown fences, no explanation, no extra text.',
        messages: [{ role: 'user', content: text.slice(0, 8000) }],
        temperature: 0,
        maxOutputTokens: agent.maxOutputTokens ?? settings.maxTokens,
      });

      const retryResult = await retryStream;
      const retryText = (await retryResult.text).trim();
      const retryData = extractJSON<T>(retryText);
      if (retryData !== null) {
        return { success: true, data: retryData, rawText: text };
      }
    } catch {
      // Retry failed, fall through
    }

    // Final fallback: return raw text
    return { success: true, rawText: text };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const details = error instanceof Error && 'cause' in error ? String(error.cause) : '';
    console.error(`[orchestrator] Agent "${role}" failed:`, message, details ? `| cause: ${details}` : '');
    // Include response body if available (AI SDK sometimes attaches it)
    if (error && typeof error === 'object' && 'responseBody' in error) {
      console.error(`[orchestrator] Response body:`, String((error as Record<string, unknown>).responseBody).slice(0, 500));
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      console.error(`[orchestrator] Status code:`, (error as Record<string, unknown>).statusCode);
    }
    return { success: false, error: message };
  }
}

/**
 * Run PRD validation against a generated document.
 */
export async function validatePRD(prdContent: string): Promise<AgentResponse<ValidationResult>> {
  return invokeAgent<ValidationResult>({
    role: 'validate',
    input: prdContent,
    context: 'Please validate the following PRD document and produce a quality assessment:',
  });
}

/**
 * Generate task breakdown from a PRD.
 */
export async function generateTaskBreakdown(prdContent: string): Promise<AgentResponse<TaskBreakdownResult>> {
  return invokeAgent<TaskBreakdownResult>({
    role: 'task-breakdown',
    input: prdContent,
    context: 'Please analyze the following PRD and produce a structured task breakdown:',
  });
}

/**
 * Run research analysis for a project idea.
 */
export async function runResearch(projectDescription: string): Promise<AgentResponse> {
  return invokeAgent({
    role: 'research',
    input: projectDescription,
    context: 'Please research the following project idea and provide market context, competitor analysis, and recommendations:',
  });
}

/**
 * Get architecture recommendations based on requirements.
 */
export async function suggestArchitecture(requirements: string): Promise<AgentResponse> {
  return invokeAgent({
    role: 'architecture',
    input: requirements,
    context: 'Based on the following gathered requirements, provide architecture recommendations:',
  });
}

/**
 * Determine the next workflow phase based on current state.
 */
export function getNextPhase(currentPhase: WorkflowPhase): WorkflowPhase | null {
  const phaseOrder: WorkflowPhase[] = [
    'research',
    'clarify',
    'generate',
    'validate',
    'plan',
    'implement',
  ];

  const currentIndex = phaseOrder.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
    return null;
  }
  return phaseOrder[currentIndex + 1];
}

/**
 * Check if a validation result passes the quality gate.
 * Score must be >= 70 (grade C or above) to proceed.
 */
export function passesQualityGate(result: ValidationResult): boolean {
  return result.score >= 70;
}
