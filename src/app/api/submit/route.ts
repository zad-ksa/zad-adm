import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
  } catch (error) {
    console.error("Submit Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
