import type { AgentDefinition } from './types';
import { CLARIFY_SYSTEM_PROMPT } from '../prompts/clarify';

export const CLARIFY_AGENT: AgentDefinition = {
  role: 'clarify',
  name: 'Requirements Analyst',
  description: 'Guides users through structured requirements gathering across 8 dimensions via natural conversation.',
  tools: ['ask_clarification', 'mark_requirements_complete', 'web_search'],
  systemPrompt: CLARIFY_SYSTEM_PROMPT,
};
