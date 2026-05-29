import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";

// GET /api/search?q=keyword — Full-text search across projects and PRD content
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const lowerQuery = query.toLowerCase();

    // Search projects by name and description
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        updatedAt: true,
      },
      take: 10,
    });

    // Search PRD content in plans
    const plans = await prisma.plan.findMany({
      where: {
        content: { contains: query },
      },
      select: {
        id: true,
        content: true,
        projectId: true,
        project: {
          select: {
            name: true,
          },
        },
      },
      take: 10,
    });

    // Extract matching snippets from PRD content
    const prdResults = plans.map((plan) => {
      const content = plan.content ?? "";
      const idx = content.toLowerCase().indexOf(lowerQuery);
      const start = Math.max(0, idx - 80);
      const end = Math.min(content.length, idx + query.length + 80);
      const snippet =
        (start > 0 ? "..." : "") +
        content.slice(start, end) +
        (end < content.length ? "..." : "");

      return {
        type: "prd" as const,
        projectId: plan.projectId,
        projectName: plan.project.name,
        snippet: snippet.replace(/\n/g, " "),
      };
    });

    // Format project results
    const projectResults = projects.map((p) => ({
      type: "project" as const,
      projectId: p.id,
      projectName: p.name,
      snippet: p.description || "",
      status: p.status,
    }));

    return NextResponse.json({
      query,
      results: [...projectResults, ...prdResults],
      total: projectResults.length + prdResults.length,
    });
  } catch (error) {
    return handleApiError(error, "search");
  }
}
