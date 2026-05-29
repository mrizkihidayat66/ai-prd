import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { safeDecrypt } from '@/lib/crypto';

const PushSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    priority: z.string(),
    phase: z.string(),
    estimatedHours: z.number().optional(),
    dependencies: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
  })),
  projectName: z.string(),
});

const PRIORITY_MAP: Record<string, number> = {
  critical: 1, // Urgent
  high: 2,     // High
  medium: 3,   // Medium
  low: 4,      // Low
};

// POST /api/integrations/linear/push — Push tasks as Linear Issues
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tasks, projectName } = PushSchema.parse(body);

    const integration = await prisma.integration.findUnique({ where: { id: 'linear' } });
    if (!integration || !integration.enabled) {
      return NextResponse.json({ error: 'Linear integration not configured' }, { status: 400 });
    }

    const token = safeDecrypt(integration.token);
    if (!token) {
      return NextResponse.json({ error: 'Linear API key not found' }, { status: 400 });
    }

    const metadata = integration.metadata ? JSON.parse(integration.metadata) : null;
    const teamId = metadata?.teamId;
    if (!teamId) {
      return NextResponse.json({ error: 'Linear team ID not configured' }, { status: 400 });
    }

    const results: { taskId: string; issueId?: string; error?: string }[] = [];

    // Create a project in Linear for grouping
    let projectId: string | undefined;
    try {
      const projectRes = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation CreateProject($input: ProjectCreateInput!) {
            projectCreate(input: $input) {
              success
              project { id }
            }
          }`,
          variables: {
            input: {
              name: projectName,
              teamIds: [teamId],
            },
          },
        }),
      });
      if (projectRes.ok) {
        const data = await projectRes.json();
        if (data.data?.projectCreate?.success) {
          projectId = data.data.projectCreate.project.id;
        }
      }
    } catch {
      // Non-critical — continue without project grouping
    }

    // Create issues
    for (const task of tasks) {
      try {
        const description = [
          task.description,
          '',
          `**Priority:** ${task.priority}`,
          `**Phase:** ${task.phase}`,
          task.estimatedHours ? `**Estimate:** ${task.estimatedHours}h` : '',
          task.dependencies?.length ? `**Dependencies:** ${task.dependencies.join(', ')}` : '',
          '',
          '### Acceptance Criteria',
          '- [ ] Implementation complete',
          '- [ ] Tests passing',
          '- [ ] Code reviewed',
        ].filter(Boolean).join('\n');

        const input: Record<string, unknown> = {
          title: `[${task.id}] ${task.title}`,
          description,
          teamId,
          priority: PRIORITY_MAP[task.priority] ?? 3,
        };

        if (projectId) {
          input.projectId = projectId;
        }

        if (task.estimatedHours) {
          input.estimate = Math.ceil(task.estimatedHours / 4); // Convert hours to points (rough: 4h = 1pt)
        }

        const res = await fetch('https://api.linear.app/graphql', {
          method: 'POST',
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `mutation CreateIssue($input: IssueCreateInput!) {
              issueCreate(input: $input) {
                success
                issue { id identifier url }
              }
            }`,
            variables: { input },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.data?.issueCreate?.success) {
            results.push({ taskId: task.id, issueId: data.data.issueCreate.issue.identifier });
          } else {
            const errors = data.errors?.map((e: { message: string }) => e.message).join(', ');
            results.push({ taskId: task.id, error: errors || 'GraphQL error' });
          }
        } else {
          results.push({ taskId: task.id, error: `HTTP ${res.status}` });
        }
      } catch (err) {
        results.push({ taskId: task.id, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    const created = results.filter(r => r.issueId).length;
    const failed = results.filter(r => r.error).length;

    return NextResponse.json({
      success: failed === 0,
      created,
      failed,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('POST /api/integrations/linear/push error:', error);
    return NextResponse.json({ error: 'Failed to push to Linear' }, { status: 500 });
  }
}
