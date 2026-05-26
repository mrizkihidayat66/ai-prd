export type ProjectStatus =
  | 'CLARIFYING'
  | 'REQUIREMENTS_LOCKED'
  | 'GENERATING'
  | 'PLAN_GENERATED'
  | 'COMPLETED';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

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

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  plan: { id: string; version: number } | null;
  _count: { conversations: number };
};

export type ConversationEntry = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

export type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  plan: { id: string; version: number; content: string | null } | null;
  conversations: ConversationEntry[];
};

export type PlanSnapshotEntry = {
  id: string;
  version: number;
  content: string;
  createdAt: string;
};
