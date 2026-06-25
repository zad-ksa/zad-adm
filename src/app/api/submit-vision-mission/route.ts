import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      charityName,
      respondentName,
      respondentTitle,
      answers,
    } = body;

    if (!charityName || respondentName === undefined || respondentTitle === undefined || !answers) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها" },
        { status: 400 }
      );
    }

    const charity = await prisma.charity.findUnique({
      where: { name: charityName.trim() },
    });

    if (!charity) {
      return NextResponse.json(
        { error: "الجمعية المحددة غير موجودة" },
        { status: 404 }
      );
    }

    const response = await prisma.visionMissionResponse.create({
      data: {
        charityId: charity.id,
        charityName: charity.name,
        respondentName: (respondentName || "").trim(),
        respondentTitle: (respondentTitle || "").trim(),
        answers, // JSON format
      },
    });

    return NextResponse.json({ success: true, response }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving vision mission response:", error);
    return NextResponse.json(
      { 
        error: "حدث خطأ أثناء حفظ البيانات", 
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
