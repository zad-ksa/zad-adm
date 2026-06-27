import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const services = await prisma.service.findMany({
    select: { id: true, name: true, department: true, charityId: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(services);
}
