// ─── Status & Section enums ───────────────────────────────────────────────────

export type ProjectStatus =
  | 'CLARIFYING'
  | 'REQUIREMENTS_LOCKED'
  | 'PLAN_GENERATED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export type PlanSection =
  | 'prd'
  | 'architecture'
  | 'taskList'
  | 'apiSpec'
  | 'dbSchema'
  | 'rules'
  | 'workflow'
  | 'diagrams'
  | 'promptContext'
  | 'effortEstimate';

export const PLAN_SECTION_LABELS: Record<PlanSection, string> = {
  prd: 'Product Requirements',
  architecture: 'Architecture',
  taskList: 'Task List',
  apiSpec: 'API Specification',
  dbSchema: 'Database Schema',
  rules: 'Agent Rules',
  workflow: 'Workflow',
  diagrams: 'Diagrams',
  promptContext: 'AI Bootstrap Context',
  effortEstimate: 'Effort Estimate',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  CLARIFYING: 'Clarifying',
  REQUIREMENTS_LOCKED: 'Requirements Locked',
  PLAN_GENERATED: 'Plan Generated',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  CLARIFYING: 'bg-yellow-500/20 text-yellow-400',
  REQUIREMENTS_LOCKED: 'bg-blue-500/20 text-blue-400',
  PLAN_GENERATED: 'bg-green-500/20 text-green-400',
  IN_PROGRESS: 'bg-purple-500/20 text-purple-400',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400',
};

// ─── Requirement clarification dimensions ────────────────────────────────────

export type RequirementDimension = {
  key: string;
  label: string;
  icon: string;
};

export const REQUIREMENT_DIMENSIONS: RequirementDimension[] = [
  { key: 'problem', label: 'Problem', icon: '🎯' },
  { key: 'features', label: 'Features', icon: '⚡' },
  { key: 'tech_stack', label: 'Tech Stack', icon: '🛠️' },
  { key: 'data_model', label: 'Data Model', icon: '🗃️' },
  { key: 'auth', label: 'Auth & Roles', icon: '🔐' },
  { key: 'integrations', label: 'Integrations', icon: '🔗' },
  { key: 'deployment', label: 'Deploy', icon: '☁️' },
  { key: 'design', label: 'Design', icon: '🎨' },
];

// ─── API response types ───────────────────────────────────────────────────────

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  plan: { id: string; version: number } | null;
  _count: { conversations: number; commits: number; contextLogs: number };
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
  plan: Record<string, string | number | null> | null;
  conversations: ConversationEntry[];
  _count: { commits: number; contextLogs: number };
};

export type CommitEntry = {
  id: string;
  version: string;
  message: string;
  author: string;
  createdAt: string;
  diff: string | null;
};

export type ContextLogEntry = {
  id: string;
  source: string;
  type: string;
  content: string;
  createdAt: string;
};

export type PlanSnapshotEntry = {
  id: string;
  version: number;
  createdAt: string;
  sections: string[];
};

// ─── Chat / clarification types ───────────────────────────────────────────────

export type ChatMessage = {
  role: 'USER' | 'ASSISTANT';
  content: string;
};

export type ClarifyQuestion = {
  id: string;
  dimension: string;
  question: string;
  options: string[];
  recommendation: string;
};

export type ParsedAIResponse = {
  status: 'needs_clarification' | 'requirements_complete';
  covered?: string[];
  missing?: string[];
  questions?: ClarifyQuestion[];
  summary?: Record<string, unknown>;
};
