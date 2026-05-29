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

// POST /api/integrations/github/push — Push tasks as GitHub Issues
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tasks, projectName } = PushSchema.parse(body);

    // Get GitHub integration config
    const integration = await prisma.integration.findUnique({ where: { id: 'github' } });
    if (!integration || !integration.enabled) {
      return NextResponse.json({ error: 'GitHub integration not configured' }, { status: 400 });
    }

    const token = safeDecrypt(integration.token);
    if (!token) {
      return NextResponse.json({ error: 'GitHub token not found' }, { status: 400 });
    }

    const metadata = integration.metadata ? JSON.parse(integration.metadata) : null;
    if (!metadata?.owner || !metadata?.repo) {
      return NextResponse.json({ error: 'GitHub owner/repo not configured' }, { status: 400 });
    }

    const { owner, repo } = metadata;
    const results: { taskId: string; issueNumber?: number; error?: string }[] = [];

    // Create milestone for the project (if not exists)
    let milestoneNumber: number | undefined;
    try {
      const msRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/milestones`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ title: projectName }),
      });
      if (msRes.ok) {
        const ms = await msRes.json();
        milestoneNumber = ms.number;
      } else if (msRes.status === 422) {
        // Milestone already exists, find it
        const listRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/milestones?state=open&per_page=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );
        if (listRes.ok) {
          const milestones = await listRes.json();
          const existing = milestones.find((m: { title: string }) => m.title === projectName);
          if (existing) milestoneNumber = existing.number;
        }
      }
    } catch {
      // Non-critical — continue without milestone
    }

    // Create issues for each task
    for (const task of tasks) {
      try {
        const issueBody = [
          `## ${task.title}`,
          '',
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

        const issueLabels = [
          task.priority,
          ...(task.labels || []),
        ].filter(Boolean);

        const issuePayload: Record<string, unknown> = {
          title: `[${task.id}] ${task.title}`,
          body: issueBody,
          labels: issueLabels,
        };
        if (milestoneNumber) {
          issuePayload.milestone = milestoneNumber;
        }

        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify(issuePayload),
        });

        if (res.ok) {
          const issue = await res.json();
          results.push({ taskId: task.id, issueNumber: issue.number });
        } else {
          const err = await res.json();
          results.push({ taskId: task.id, error: err.message || `HTTP ${res.status}` });
        }
      } catch (err) {
        results.push({ taskId: task.id, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    const created = results.filter(r => r.issueNumber).length;
    const failed = results.filter(r => r.error).length;

    return NextResponse.json({
      success: failed === 0,
      created,
      failed,
      results,
      repoUrl: `https://github.com/${owner}/${repo}/issues`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('POST /api/integrations/github/push error:', error);
    return NextResponse.json({ error: 'Failed to push to GitHub' }, { status: 500 });
  }
}
