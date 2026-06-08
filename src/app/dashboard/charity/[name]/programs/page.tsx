import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import ProgramsClient from "./ProgramsClient";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | البرامج والمشاريع`,
  };
}

export default async function CharityProgramsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // Fetch charity record from Charity table or bootstrap it from survey responses
  let charity = await prisma.charity.findUnique({
    where: { name: decodedName },
  });

  if (!charity) {
    const latestResponse = await prisma.surveyResponse.findFirst({
      where: { charityName: { equals: decodedName, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });

    charity = await prisma.charity.create({
      data: {
        name: decodedName,
        establishmentDate: latestResponse?.establishmentDate || null,
        licenseNumber: latestResponse?.licenseNumber || null,
      },
    });
  }

  // Fetch all programs for this charity
  const programs = await prisma.program.findMany({
    where: { charityId: charity.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProgramsClient
      charity={{
        id: charity.id,
        name: charity.name,
        logoUrl: charity.logoUrl,
      }}
      initialPrograms={programs}
    />
  );
}
