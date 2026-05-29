import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";

// GET /api/analytics — Dashboard analytics/stats
export async function GET() {
  try {
    // Parallel queries for efficiency
    const [
      totalProjects,
      projectsByStatus,
      recentProjects,
      totalComments,
      unresolvedComments,
      reviewStats,
    ] = await Promise.all([
      // Total project count
      prisma.project.count(),

      // Projects grouped by status
      prisma.project.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Recent projects (last 7 days)
      prisma.project.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Total comments
      prisma.comment.count(),

      // Unresolved comments
      prisma.comment.count({
        where: { resolved: false },
      }),

      // Review status distribution
      prisma.review.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    // Count projects with plans
    const projectsWithPlans = await prisma.plan.count();

    // Status distribution map
    const statusDistribution: Record<string, number> = {};
    for (const item of projectsByStatus) {
      statusDistribution[item.status] = item._count.id;
    }

    // Review distribution map
    const reviewDistribution: Record<string, number> = {};
    for (const item of reviewStats) {
      reviewDistribution[item.status] = item._count.id;
    }

    return NextResponse.json({
      projects: {
        total: totalProjects,
        withPlans: projectsWithPlans,
        recentWeek: recentProjects,
        byStatus: statusDistribution,
      },
      collaboration: {
        totalComments: totalComments,
        unresolvedComments: unresolvedComments,
        reviews: reviewDistribution,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, "analytics");
  }
}
