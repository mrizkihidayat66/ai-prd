import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const reviewStatusEnum = z.enum([
  "draft",
  "in_review",
  "changes_requested",
  "approved",
]);

const upsertReviewSchema = z.object({
  status: reviewStatusEnum.optional(),
  reviewer: z.string().min(1).optional(),
  notes: z.string().optional(),
});

// GET /api/projects/[id]/review — Get review status for a project
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let review = await prisma.review.findUnique({
      where: { projectId: id },
    });

    // Return default draft state if no review exists
    if (!review) {
      review = {
        id: "",
        projectId: id,
        status: "draft",
        reviewer: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error("Failed to fetch review:", error);
    return NextResponse.json(
      { error: "Failed to fetch review" },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/review — Create or update review status
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = upsertReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const review = await prisma.review.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        status: parsed.data.status || "draft",
        reviewer: parsed.data.reviewer || null,
        notes: parsed.data.notes || null,
      },
      update: {
        ...parsed.data,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error("Failed to update review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}
