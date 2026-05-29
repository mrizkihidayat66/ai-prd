import type { AgentDefinition } from './types';
import { GENERATE_PRD_SYSTEM_PROMPT } from '../prompts/generate-prd';

export const GENERATE_AGENT: AgentDefinition = {
  role: 'generate',
  name: 'PRD Generator',
  description: 'Produces comprehensive, professional PRD documents from gathered requirements.',
  tools: [],
  temperature: 0.3,
  systemPrompt: GENERATE_PRD_SYSTEM_PROMPT,
};
