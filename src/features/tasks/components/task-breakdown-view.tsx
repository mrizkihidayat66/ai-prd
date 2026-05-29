'use client';

import { useState, useEffect } from 'react';
import {
  ListTodo,
  Loader2,
  Download,
  Clock,
  Tag,
  ShieldAlert,
  Github,
  Clipboard,
  Check,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MermaidDiagram } from '@/components/common/mermaid-diagram';
import type { TaskBreakdownResult, TaskItem, ValidationResult } from '@/lib/ai/agents/types';

type Props = {
  projectId: string;
  projectName: string;
  /** Callback when task generation completes (parent should refresh metadata) */
  onTasksComplete?: () => void;
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export function TaskBreakdownView({ projectId, projectName, onTasksComplete }: Props) {
  const [result, setResult] = useState<TaskBreakdownResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [validationScore, setValidationScore] = useState<number | null>(null);
  const [checkingGate, setCheckingGate] = useState(true);

  // Check quality gate — fetch project metadata for validation score
  useEffect(() => {
    async function checkValidation() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          const metadata = data.project?.metadata ? JSON.parse(data.project.metadata) : null;
          if (metadata?.validation?.score != null) {
            setValidationScore(metadata.validation.score);
          }
          if (metadata?.taskBreakdown?.tasks && Array.isArray(metadata.taskBreakdown.tasks)) {
            setResult(metadata.taskBreakdown);
            if (metadata.taskBreakdown.phases?.length > 0) {
              setActivePhase(metadata.taskBreakdown.phases[0].name);
            }
          }
        }
      } catch {
        // ignore — will show gate as not passed
      } finally {
        setCheckingGate(false);
      }
    }
    checkValidation();
  }, [projectId]);

  async function generateTasks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Task breakdown failed');
      }
      const data = await res.json();
      setResult(data.taskBreakdown);
      if (data.taskBreakdown?.phases?.length > 0) {
        setActivePhase(data.taskBreakdown.phases[0].name);
      }
      onTasksComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function exportMarkdown() {
    if (!result) return;

    let md = `# ${projectName} — Implementation Tasks\n\n`;
    md += `**Total Tasks**: ${result.tasks.length}\n`;
    md += `**Estimated Hours**: ${result.totalEstimatedHours}h\n`;
    md += `**Phases**: ${result.phases.length}\n\n`;

    for (const phase of result.phases) {
      md += `## ${phase.name} (${phase.duration})\n\n`;
      const phaseTasks = result.tasks.filter(t => t.phase === phase.name);
      for (const task of phaseTasks) {
        md += `- [ ] **${task.id}**: ${task.title}\n`;
        md += `  - ${task.description}\n`;
        md += `  - Priority: ${task.priority} | Est: ${task.estimatedHours}h`;
        if (task.labels?.length) md += ` | Labels: ${task.labels.join(', ')}`;
        if (task.dependencies?.length) md += ` | Depends: ${task.dependencies.join(', ')}`;
        md += '\n';
      }
      md += '\n';
    }

    if (result.mermaidGantt) {
      md += `## Timeline\n\n\`\`\`mermaid\n${result.mermaidGantt}\n\`\`\`\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-tasks.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportGitHubIssues() {
    if (!result) return;

    let md = `# ${projectName} — GitHub Issues\n\n`;
    md += `> Paste each section below as a separate GitHub Issue.\n\n---\n\n`;

    for (const task of result.tasks) {
      md += `## ${task.title}\n\n`;
      md += `**Labels:** ${[task.priority, ...(task.labels || [])].join(', ')}\n`;
      md += `**Milestone:** ${task.phase}\n`;
      md += `**Estimate:** ${task.estimatedHours}h\n\n`;
      md += `### Description\n\n${task.description}\n\n`;
      if (task.dependencies?.length) {
        md += `### Dependencies\n\n`;
        md += task.dependencies.map(d => `- Blocked by: #${d}`).join('\n');
        md += '\n\n';
      }
      md += `### Acceptance Criteria\n\n- [ ] Implementation complete\n- [ ] Tests passing\n- [ ] Code reviewed\n\n---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-github-issues.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('GitHub Issues exported', { description: 'Create issues from the downloaded file.' });
  }

  function copyTask(task: TaskItem) {
    const text = `**${task.id}: ${task.title}**\n${task.description}\n- Priority: ${task.priority}\n- Estimate: ${task.estimatedHours}h\n- Phase: ${task.phase}${task.labels?.length ? `\n- Labels: ${task.labels.join(', ')}` : ''}${task.dependencies?.length ? `\n- Depends on: ${task.dependencies.join(', ')}` : ''}`;
    navigator.clipboard.writeText(text);
    toast.success('Task copied to clipboard');
  }

  const [pushing, setPushing] = useState<string | null>(null);

  async function pushToIntegration(provider: 'github' | 'linear' | 'jira') {
    if (!result) return;
    setPushing(provider);
    try {
      const res = await fetch(`/api/integrations/${provider}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: result.tasks,
          projectName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Push failed (${res.status})`);
      }
      if (data.success) {
        toast.success(`Pushed ${data.created} issues to ${provider}`, {
          description: data.repoUrl || data.projectUrl || undefined,
        });
      } else {
        toast.warning(`Pushed ${data.created} issues, ${data.failed} failed`, {
          description: `Check ${provider} for details.`,
        });
      }
    } catch (err) {
      toast.error(`Failed to push to ${provider}`, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPushing(null);
    }
  }

  if (checkingGate) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Quality gate: must have validation score >= 70
  if (validationScore === null || validationScore < 70) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <ShieldAlert className="h-12 w-12 text-yellow-400/70" />
        <div className="text-center max-w-sm space-y-2">
          <p className="text-sm font-medium text-foreground">
            Quality Gate Required
          </p>
          <p className="text-sm text-muted-foreground">
            {validationScore === null
              ? 'Your PRD must be validated before generating tasks. Switch to the Validate tab first.'
              : `Your PRD scored ${validationScore}/100 (minimum 70 required). Improve your PRD and re-validate to unlock task generation.`}
          </p>
        </div>
        {validationScore !== null && validationScore < 70 && (
          <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
            Score: {validationScore}/100 — Needs improvement
          </Badge>
        )}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <ListTodo className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Generate an implementation task breakdown from your PRD with priorities, estimates, and dependencies.
        </p>
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        <Button onClick={generateTasks} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Tasks...
            </>
          ) : (
            <>
              <ListTodo className="h-4 w-4 mr-2" />
              Generate Task Breakdown
            </>
          )}
        </Button>
      </div>
    );
  }

  const filteredTasks = activePhase
    ? result.tasks.filter(t => t.phase === activePhase)
    : result.tasks;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{result.tasks.length}</span> tasks
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{result.totalEstimatedHours}</span>h estimated
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{result.phases.length}</span> phases
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm" disabled={pushing !== null}>
                {pushing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Push to...
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => pushToIntegration('github')}>
                <Github className="h-4 w-4 mr-2" />
                GitHub Issues
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => pushToIntegration('linear')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Linear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => pushToIntegration('jira')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Jira
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportGitHubIssues}>
                <Download className="h-4 w-4 mr-2" />
                Download GitHub .md
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={exportMarkdown}>
            <Download className="h-4 w-4 mr-1" />
            Export .md
          </Button>
          <Button variant="outline" size="sm" onClick={generateTasks} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regenerate'}
          </Button>
        </div>
      </div>

      {/* Phase Tabs */}
      <div className="flex gap-1 flex-wrap">
        <Button
          variant={activePhase === null ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActivePhase(null)}
        >
          All
        </Button>
        {result.phases.map(phase => (
          <Button
            key={phase.name}
            variant={activePhase === phase.name ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActivePhase(phase.name)}
          >
            {phase.name}
            <span className="ml-1 text-xs opacity-70">({phase.tasks.length})</span>
          </Button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredTasks.map((task: TaskItem) => (
          <Card key={task.id} className="p-3 group/task">
            <div className="flex items-start gap-3">
              <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">
                {task.id}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{task.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${PRIORITY_COLORS[task.priority]}`}
                  >
                    {task.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  {task.estimatedHours && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.estimatedHours}h
                    </span>
                  )}
                  {task.labels && task.labels.length > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {task.labels.join(', ')}
                    </span>
                  )}
                  {task.dependencies && task.dependencies.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      → {task.dependencies.join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover/task:opacity-100 transition-opacity shrink-0"
                onClick={() => copyTask(task)}
                title="Copy task"
              >
                <Clipboard className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Gantt Chart */}
      {result.mermaidGantt && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Timeline</h4>
          <MermaidDiagram chart={result.mermaidGantt} />
        </div>
      )}
    </div>
  );
}
