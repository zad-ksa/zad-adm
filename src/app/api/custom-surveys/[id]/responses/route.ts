import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // Resolve the real UUID of the survey first (in case parameter is a slug)
    const survey = await prisma.customSurvey.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }
        ]
      },
      select: { id: true }
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const responses = await prisma.customSurveyResponse.findMany({
      where: { surveyId: survey.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(responses);
  } catch (error: any) {
    console.error("Error fetching custom survey responses:", error);
    return NextResponse.json({ error: "Failed to fetch custom survey responses" }, { status: 500 });
  }
}
