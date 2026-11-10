import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authErrorResponse } from "@/lib/guards";
import { requireOwnedSurvey } from "@/lib/surveyGuard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let session;
  try {
    // ولا يُنسخ إلا ما يملكه: النسخةُ تحمل أسئلةَ أصلها كلَّها، فنسخُ استبيانِ
    // غيرِه طريقٌ إلى قراءته.
    ({ session } = await requireOwnedSurvey(id));
  } catch (err) {
    return authErrorResponse(err);
  }

  try {
    // Fetch the original survey with sections and questions
    const originalSurvey = await prisma.customSurvey.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!originalSurvey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Prepare data for the new survey (nested create)
    const newSurvey = await prisma.customSurvey.create({
      data: {
        title: `${originalSurvey.title} (نسخة)`,
        introText: originalSurvey.introText,
        isActive: false,
        // والنسخةُ لمن نسخها لا لمن أنشأ أصلَها: هي استبيانٌ جديدٌ يُحرّره.
        createdById: session.id,
        createdByName: session.name ?? null,
        sections: {
          create: originalSurvey.sections.map((section) => ({
            title: section.title,
            order: section.order,
            questions: {
              create: section.questions.map((q) => ({
                text: q.text,
                type: q.type,
                isRequired: q.isRequired,
                allowAttachment: q.allowAttachment,
                requireAttachmentIfYes: q.requireAttachmentIfYes,
                options: q.options || undefined,
                order: q.order,
              })),
            },
          })),
        },
      },
    });

    return NextResponse.json(newSurvey);
  } catch (error) {
    console.error("Error copying survey:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
