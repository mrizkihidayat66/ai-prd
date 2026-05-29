'use client';

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

type WorkflowStep = {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'pending';
};

type Props = {
  projectStatus: string;
  hasValidation?: boolean;
  hasTasks?: boolean;
};

function getWorkflowSteps(projectStatus: string, hasValidation: boolean, hasTasks: boolean): WorkflowStep[] {
  const steps: WorkflowStep[] = [
    { id: 'clarify', label: 'Requirements', status: 'pending' },
    { id: 'generate', label: 'Generate PRD', status: 'pending' },
    { id: 'validate', label: 'Validate', status: 'pending' },
    { id: 'tasks', label: 'Task Breakdown', status: 'pending' },
  ];

  // Determine status based on project state
  switch (projectStatus) {
    case 'CLARIFYING':
      steps[0].status = 'active';
      break;
    case 'REQUIREMENTS_LOCKED':
      steps[0].status = 'completed';
      steps[1].status = 'pending';
      break;
    case 'GENERATING':
      steps[0].status = 'completed';
      steps[1].status = 'active';
      break;
    case 'PLAN_GENERATED':
    case 'COMPLETED':
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      if (hasValidation) {
        steps[2].status = 'completed';
        if (hasTasks) {
          steps[3].status = 'completed';
        } else {
          steps[3].status = 'pending';
        }
      } else {
        steps[2].status = 'pending';
      }
      break;
  }

  return steps;
}

export function WorkflowProgress({ projectStatus, hasValidation = false, hasTasks = false }: Props) {
  const steps = getWorkflowSteps(projectStatus, hasValidation, hasTasks);

  return (
    <div className="flex items-center gap-1 text-xs">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-1">
          {step.status === 'completed' && (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
          )}
          {step.status === 'active' && (
            <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
          )}
          {step.status === 'pending' && (
            <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
          <span className={`${
            step.status === 'completed' ? 'text-green-400' :
            step.status === 'active' ? 'text-blue-400' :
            'text-muted-foreground/60'
          }`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <span className="text-muted-foreground/30 mx-0.5">→</span>
          )}
        </div>
      ))}
    </div>
  );
}
