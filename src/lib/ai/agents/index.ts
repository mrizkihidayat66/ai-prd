/**
 * Agent System — Barrel export
 */

export * from './types';
export { RESEARCH_AGENT } from './research-agent';
export { ARCHITECTURE_AGENT } from './architecture-agent';
export { VALIDATE_AGENT } from './validate-agent';
export { TASK_BREAKDOWN_AGENT } from './task-breakdown-agent';

// Re-export existing prompts as agent-compatible definitions
export { CLARIFY_AGENT } from './clarify-agent';
export { GENERATE_AGENT } from './generate-agent';
