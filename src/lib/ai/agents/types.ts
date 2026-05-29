/**
 * Agent System — Core types and orchestration for multi-agent PRD generation.
 * 
 * Agents are specialized AI personas with distinct system prompts, tools, and responsibilities.
 * The orchestrator routes work to the appropriate agent based on the current workflow phase.
 */

export type AgentRole = 
  | 'research'
  | 'clarify'
  | 'architecture'
  | 'generate'
  | 'validate'
  | 'task-breakdown';

export type AgentDefinition = {
  role: AgentRole;
  name: string;
  description: string;
  systemPrompt: string;
  /** Tool names this agent is allowed to use */
  tools: string[];
  /** Temperature override (if different from global settings) */
  temperature?: number;
  /** Max output tokens override (ensures enough room for structured responses) */
  maxOutputTokens?: number;
};

export type WorkflowPhase = 
  | 'research'
  | 'clarify'
  | 'generate'
  | 'validate'
  | 'plan'
  | 'implement';

export type WorkflowState = {
  currentPhase: WorkflowPhase;
  completedPhases: WorkflowPhase[];
  /** Quality score from validation (0-100) */
  qualityScore?: number;
  /** Issues found during validation */
  validationIssues?: ValidationIssue[];
  /** Generated task breakdown */
  tasks?: TaskItem[];
};

export type ValidationIssue = {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: 'completeness' | 'consistency' | 'diagram' | 'cross-reference' | 'quality';
  section: string;
  message: string;
  suggestion?: string;
};

export type ValidationResult = {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: ValidationIssue[];
  summary: string;
  sectionScores: Record<string, number>;
};

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  phase: string;
  estimatedHours?: number;
  dependencies?: string[];
  labels?: string[];
};

export type TaskBreakdownResult = {
  tasks: TaskItem[];
  phases: { name: string; tasks: string[]; duration: string }[];
  totalEstimatedHours: number;
  mermaidGantt: string;
};
