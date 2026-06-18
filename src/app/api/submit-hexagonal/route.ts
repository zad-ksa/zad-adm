import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      charityName,
      authorizedTitle,
      answers,
    } = body;

    if (!charityName || !authorizedTitle || !answers) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها" },
        { status: 400 }
      );
    }

    const response = await prisma.hexagonalResponse.create({
      data: {
        charityName: charityName.trim(),
        authorizedTitle,
        answers, // JSON format: { q1: string[], q2: string[], ... }
      },
    });

    return NextResponse.json({ success: true, response }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving hexagonal survey response:", error);
    return NextResponse.json(
      { 
        error: "حدث خطأ أثناء حفظ البيانات", 
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
