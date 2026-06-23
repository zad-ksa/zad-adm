import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const surveys = await prisma.customSurvey.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { responses: true }
        }
      }
    });

    return NextResponse.json(surveys);
  } catch (error: any) {
    console.error("Error fetching custom surveys:", error);
    return NextResponse.json({ error: "Failed to fetch custom surveys" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
        isActive: false
      }
    });

    return NextResponse.json(survey);
  } catch (error: any) {
    console.error("Error creating custom survey:", error);
    return NextResponse.json({ error: "Failed to create custom survey" }, { status: 500 });
  }
}
