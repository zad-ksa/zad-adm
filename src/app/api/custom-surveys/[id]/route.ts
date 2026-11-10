import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { authErrorResponse } from "@/lib/guards";
import { getSurveyScope, maySeeSurvey } from "@/lib/surveyAccess";
import { requireOwnedSurvey } from "@/lib/surveyGuard";

// Deliberately public: the respondent page at /custom-survey/[id] loads the
// survey structure through this handler before the visitor has any session.
// The published link (slug) is the capability here, and it can be rotated via
// the regenerate-link route. Every other handler below is staff-only.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const survey = await prisma.customSurvey.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }
        ]
      },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // مُنشئُ الاستبيان وحكمُ الملكيّة لا يُذاعان على المستجيبين: هذا المسارُ
    // عامٌّ بقصد، فاسمُ المُنشئ يُحجب عن غير الموظفين. و`canManage` تُغني صفحةَ
    // التحرير عن مسارٍ ثانٍ تسأل به «هل لي هذا؟».
    const { createdById, createdByName, ...open } = survey;
    const scope = getSurveyScope(await getSession());
    if (!scope.canView) return NextResponse.json(open);

    return NextResponse.json({
      ...open,
      createdById,
      createdByName,
      canManage: maySeeSurvey(scope, createdById),
    });
  } catch (error: unknown) {
    console.error("Error fetching custom survey:", error);
    return NextResponse.json({ error: "Failed to fetch custom survey" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await requireOwnedSurvey(id);
  } catch (err) {
    return authErrorResponse(err);
  }

  try {
    const body = await request.json();
    const { title, introText, isActive, sections } = body;

    // First update the survey details
    const updatedSurvey = await prisma.customSurvey.update({
      where: { id },
      data: {
        title,
        introText,
        isActive
      }
    });

    // If sections are provided, we replace the entire structure
    if (sections && Array.isArray(sections)) {
      // Delete existing sections (which cascades to questions)
      await prisma.customSurveySection.deleteMany({
        where: { surveyId: id }
      });

      // Create new structure
      for (const [sIndex, section] of sections.entries()) {
        const createdSection = await prisma.customSurveySection.create({
          data: {
            id: (section.id && typeof section.id === "string" && section.id.length > 10) ? section.id : undefined,
            title: section.title,
            order: sIndex,
            surveyId: id
          }
        });

        if (section.questions && Array.isArray(section.questions)) {
          for (const [qIndex, question] of section.questions.entries()) {
            await prisma.customSurveyQuestion.create({
              data: {
                id: (question.id && typeof question.id === "string" && question.id.length > 10) ? question.id : undefined,
                text: question.text,
                type: question.type || "TEXT",
                isRequired: question.isRequired ?? true,
                allowAttachment: question.allowAttachment ?? false,
                requireAttachmentIfYes: question.requireAttachmentIfYes ?? false,
                options: question.options ? question.options : null,
                order: qIndex,
                sectionId: createdSection.id
              }
            });
          }
        }
      }
    }

    // Fetch the updated survey with its full structure
    const finalSurvey = await prisma.customSurvey.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    return NextResponse.json(finalSurvey);
  } catch (error: any) {
    console.error("Error updating custom survey:", error);
    return NextResponse.json({ error: "Failed to update custom survey" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await requireOwnedSurvey(id);
  } catch (err) {
    return authErrorResponse(err);
  }

  try {
    await prisma.customSurvey.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting custom survey:", error);
    return NextResponse.json({ error: "Failed to delete custom survey" }, { status: 500 });
  }
}
