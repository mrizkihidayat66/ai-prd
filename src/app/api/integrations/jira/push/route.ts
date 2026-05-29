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

const PRIORITY_MAP: Record<string, string> = {
  critical: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// POST /api/integrations/jira/push — Push tasks as Jira Issues
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tasks, projectName } = PushSchema.parse(body);

    const integration = await prisma.integration.findUnique({ where: { id: 'jira' } });
    if (!integration || !integration.enabled) {
      return NextResponse.json({ error: 'Jira integration not configured' }, { status: 400 });
    }

    const token = safeDecrypt(integration.token);
    if (!token) {
      return NextResponse.json({ error: 'Jira API token not found' }, { status: 400 });
    }

    if (!integration.baseUrl) {
      return NextResponse.json({ error: 'Jira instance URL not configured' }, { status: 400 });
    }

    const metadata = integration.metadata ? JSON.parse(integration.metadata) : null;
    if (!metadata?.projectKey || !metadata?.email) {
      return NextResponse.json({ error: 'Jira project key or email not configured' }, { status: 400 });
    }

    const { projectKey, email } = metadata;
    const baseUrl = integration.baseUrl.replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;

    const results: { taskId: string; issueKey?: string; error?: string }[] = [];

    // Create an epic for the project
    let epicKey: string | undefined;
    try {
      const epicRes = await fetch(`${baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            project: { key: projectKey },
            summary: projectName,
            issuetype: { name: 'Epic' },
            description: {
              type: 'doc',
              version: 1,
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: `Tasks generated from PRD: ${projectName}` }],
              }],
            },
          },
        }),
      });
      if (epicRes.ok) {
        const epic = await epicRes.json();
        epicKey = epic.key;
      }
    } catch {
      // Non-critical — continue without epic
    }

    // Create issues for each task
    for (const task of tasks) {
      try {
        const descriptionContent = [
          { type: 'paragraph', content: [{ type: 'text', text: task.description }] },
          { type: 'paragraph', content: [
            { type: 'text', text: `Priority: ${task.priority} | Phase: ${task.phase}`, marks: [{ type: 'strong' }] },
          ]},
        ];

        if (task.estimatedHours) {
          descriptionContent.push({
            type: 'paragraph',
            content: [{ type: 'text', text: `Estimate: ${task.estimatedHours}h`, marks: [{ type: 'em' }] }],
          });
        }

        if (task.dependencies?.length) {
          descriptionContent.push({
            type: 'paragraph',
            content: [{ type: 'text', text: `Dependencies: ${task.dependencies.join(', ')}`, marks: [{ type: 'em' }] }],
          });
        }

        const fields: Record<string, unknown> = {
          project: { key: projectKey },
          summary: `[${task.id}] ${task.title}`,
          issuetype: { name: 'Task' },
          priority: { name: PRIORITY_MAP[task.priority] || 'Medium' },
          description: {
            type: 'doc',
            version: 1,
            content: descriptionContent,
          },
        };

        if (epicKey) {
          fields.parent = { key: epicKey };
        }

        if (task.estimatedHours) {
          fields.timetracking = { originalEstimate: `${task.estimatedHours}h` };
        }

        if (task.labels?.length) {
          fields.labels = task.labels.map(l => l.replace(/\s+/g, '-'));
        }

        const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        });

        if (res.ok) {
          const issue = await res.json();
          results.push({ taskId: task.id, issueKey: issue.key });
        } else {
          const err = await res.json().catch(() => ({}));
          const msg = err.errorMessages?.join(', ') || err.errors ? JSON.stringify(err.errors) : `HTTP ${res.status}`;
          results.push({ taskId: task.id, error: msg });
        }
      } catch (err) {
        results.push({ taskId: task.id, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    const created = results.filter(r => r.issueKey).length;
    const failed = results.filter(r => r.error).length;

    return NextResponse.json({
      success: failed === 0,
      created,
      failed,
      results,
      projectUrl: `${baseUrl}/browse/${projectKey}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('POST /api/integrations/jira/push error:', error);
    return NextResponse.json({ error: 'Failed to push to Jira' }, { status: 500 });
  }
}
