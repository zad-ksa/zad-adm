import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, authErrorResponse } from "@/lib/guards";
import { getSurveyScope, surveyScopeWhere } from "@/lib/surveyAccess";

/**
 * قائمةُ الاستبيانات — كلُّها لحامل «جميع الاستبيانات»، وما أنشأه لمن سواه.
 *
 * والحارسُ يفحص الأدنى (`manage_own_surveys`) لأنّ الأعلى يحمله عبر `IMPLIES`،
 * ثمّ يُرشِّح النطاقُ ما يُرى. فلا تُفحص الصلاحيةُ مرّتين بمنطقَين.
 */
export async function GET() {
  let scope;
  try {
    scope = getSurveyScope(await requirePermission("manage_own_surveys"));
  } catch (err) {
    return authErrorResponse(err);
  }

  try {
    const surveys = await prisma.customSurvey.findMany({
      where: surveyScopeWhere(scope),
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { responses: true },
        },
      },
    });

    return NextResponse.json(surveys);
  } catch (error: unknown) {
    console.error("Error fetching custom surveys:", error);
    return NextResponse.json({ error: "Failed to fetch custom surveys" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requirePermission("manage_own_surveys");
  } catch (err) {
    return authErrorResponse(err);
  }

  try {
    const body = await request.json();
    const { title, introText } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const survey = await prisma.customSurvey.create({
      data: {
        title,
        introText,
        isActive: false,
        // المالكُ يُختم عند الإنشاء لا يُحدَّد لاحقاً: استبيانٌ بلا مالكٍ لا
        // يراه مُنشئُه إن كان لا يرى إلا ما أنشأه.
        createdById: session.id,
        createdByName: session.name ?? null,
      },
    });

    return NextResponse.json(survey);
  } catch (error: unknown) {
    console.error("Error creating custom survey:", error);
    return NextResponse.json({ error: "Failed to create custom survey" }, { status: 500 });
  }
}
