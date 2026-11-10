import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authErrorResponse } from "@/lib/guards";
import { requireOwnedSurvey } from "@/lib/surveyGuard";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  // والردودُ أخطرُ ما في الباب: إجاباتُ الجمعيات. فلا تُقرأ إلا لمالك
  // الاستبيان. والحارسُ يحلّ المُعرِّفَ أو الرابطَ معاً، فلا حاجةَ إلى حلٍّ ثانٍ.
  let survey;
  try {
    ({ survey } = await requireOwnedSurvey(id));
  } catch (err) {
    return authErrorResponse(err);
  }

  try {
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
