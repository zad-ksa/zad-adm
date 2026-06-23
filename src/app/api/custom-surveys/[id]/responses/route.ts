import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const responses = await prisma.customSurveyResponse.findMany({
      where: { surveyId: id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(responses);
  } catch (error: any) {
    console.error("Error fetching custom survey responses:", error);
    return NextResponse.json({ error: "Failed to fetch custom survey responses" }, { status: 500 });
  }
}
