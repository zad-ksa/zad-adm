import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { authErrorResponse } from "@/lib/guards";
import { requireOwnedSurvey } from "@/lib/surveyGuard";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await requireOwnedSurvey(id);
  } catch (err) {
    return authErrorResponse(err);
  }

  try {

    // Generate an 8-character hex string
    const newSlug = crypto.randomBytes(4).toString('hex');

    const updatedSurvey = await prisma.customSurvey.update({
      where: { id },
      data: { slug: newSlug }
    });

    return NextResponse.json(updatedSurvey);
  } catch (error) {
    console.error("Error regenerating custom survey link:", error);
    return NextResponse.json({ error: "Failed to regenerate link" }, { status: 500 });
  }
}
