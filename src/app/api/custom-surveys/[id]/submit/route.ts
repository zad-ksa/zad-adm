import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { charityName, answers, attachments } = body;

    if (!charityName) {
      return NextResponse.json({ error: "Charity name is required" }, { status: 400 });
    }

    const response = await prisma.customSurveyResponse.create({
      data: {
        surveyId: id,
        charityName,
        answers: answers || {},
        attachments: attachments || {}
      }
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error submitting custom survey response:", error);
    return NextResponse.json({ error: "Failed to submit custom survey response" }, { status: 500 });
  }
}
