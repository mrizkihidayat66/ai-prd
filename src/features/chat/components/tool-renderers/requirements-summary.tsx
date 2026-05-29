'use client';

import { Rocket, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Summary = {
  projectName: string;
  problemStatement: string;
  targetAudience: string;
  coreFeatures: string[];
  techStack: {
    frontend: string;
    backend: string;
    database: string;
    hosting: string;
  };
  dataModel: string[];
  auth: { required: boolean; method: string; roles: string[] };
  integrations: string[];
  deployment: string;
  designNotes: string;
};

type Props = {
  summary: Summary;
  onGenerate: () => void;
  generating?: boolean;
};

export function RequirementsSummary({ summary, onGenerate, generating }: Props) {
  // Guard against undefined/invalid summary
  if (!summary || typeof summary !== 'object') {
    return null;
  }
  
  const coreFeatures = Array.isArray(summary.coreFeatures) ? summary.coreFeatures : [];
  return (
    <div id="requirements-summary" className="requirements-summary my-3 rounded-xl border border-green-500/30 bg-green-500/5 p-5">
      <div className="requirements-summary-header flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <h3 className="font-semibold text-sm">Requirements Complete</h3>
      </div>

      <div className="requirements-summary-details space-y-3 text-xs">
        <div>
          <span className="font-medium text-muted-foreground">Project:</span>{' '}
          <span>{summary.projectName}</span>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Problem:</span>{' '}
          <span>{summary.problemStatement}</span>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Audience:</span>{' '}
          <span>{summary.targetAudience}</span>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Core Features:</span>
          <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
            {coreFeatures.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Tech Stack:</span>{' '}
          <span>
            {summary.techStack.frontend} / {summary.techStack.backend} / {summary.techStack.database} / {summary.techStack.hosting}
          </span>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Auth:</span>{' '}
          <span>
            {summary.auth.required ? `${summary.auth.method} (${summary.auth.roles.join(', ')})` : 'Not required'}
          </span>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Deployment:</span>{' '}
          <span>{summary.deployment}</span>
        </div>
      </div>

      <Button
        name="generate-prd"
        onClick={onGenerate}
        disabled={generating}
        className="requirements-generate-btn w-full mt-5"
      >
        <Rocket className="w-4 h-4 mr-2" />
        {generating ? 'Generating PRD...' : 'Generate PRD'}
      </Button>
    </div>
  );
}
