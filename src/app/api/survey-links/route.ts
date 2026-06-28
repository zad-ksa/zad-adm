import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const charityName = searchParams.get("charityName");
    const surveyType = searchParams.get("surveyType");

    if (token) {
      const link = await prisma.surveyLink.findUnique({
        where: { id: token },
      });
      if (!link) {
        return NextResponse.json({ error: "الرابط غير موجود" }, { status: 404 });
      }
      const charity = await prisma.charity.findUnique({
        where: { name: link.charityName },
        select: { logoUrl: true },
      });
      return NextResponse.json({
        ...link,
        logoUrl: charity?.logoUrl || null,
      });
    }

    if (charityName && surveyType) {
      const link = await prisma.surveyLink.findFirst({
        where: {
          charityName: decodeURIComponent(charityName),
          surveyType,
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(link || null);
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error) {
    console.error("SurveyLink GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json();
    const { charityName, surveyType, customQuestions } = body;

    if (!charityName || !surveyType) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Deactivate previous active links for this charity and survey type
    await prisma.surveyLink.updateMany({
      where: {
        charityName,
        surveyType,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create a new active link
    const newLink = await prisma.surveyLink.create({
      data: {
        charityName,
        surveyType,
        isActive: true,
        // @ts-ignore
        customQuestions: customQuestions || undefined,
      },
    });

    return NextResponse.json(newLink);
  } catch (error) {
    console.error("SurveyLink POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const updatedLink = await prisma.surveyLink.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error("SurveyLink PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
