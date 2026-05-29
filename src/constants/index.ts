import type { ProjectStatus } from '@/types';

// Re-export limits
export * from './limits';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  CLARIFYING: 'Clarifying',
  REQUIREMENTS_LOCKED: 'Requirements Locked',
  GENERATING: 'Generating PRD',
  PLAN_GENERATED: 'PRD Generated',
  COMPLETED: 'Completed',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  CLARIFYING: 'bg-yellow-500/20 text-yellow-400',
  REQUIREMENTS_LOCKED: 'bg-blue-500/20 text-blue-400',
  GENERATING: 'bg-orange-500/20 text-orange-400',
  PLAN_GENERATED: 'bg-green-500/20 text-green-400',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400',
};

export const AI_PROVIDER_IDS = [
  'openai',
  'anthropic',
  'google',
  'ollama',
  'lmstudio',
  'agentrouter',
  'openai_compatible',
] as const;

export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];

export const AI_PROVIDER_LABELS: Record<AIProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  ollama: 'Ollama (Local)',
  lmstudio: 'LM Studio (Local)',
  agentrouter: 'AgentRouter',
  openai_compatible: 'OpenAI-Compatible',
};
