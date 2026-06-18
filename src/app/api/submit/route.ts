import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      charityName,
      establishmentDate,
      licenseNumber,
      authorizedName,
      authorizedTitle,
      scorePercentage,
      answers,
    } = body;

    const response = await prisma.surveyResponse.create({
      data: {
        charityName,
        establishmentDate,
        licenseNumber,
        authorizedName,
        authorizedTitle,
        scorePercentage,
        answers,
      },
    });

    return NextResponse.json({ success: true, response }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving survey response:", error);
    return NextResponse.json(
      { 
        error: "حدث خطأ أثناء حفظ البيانات", 
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
