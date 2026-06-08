import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import ProgramsClient from "./ProgramsClient";
import { unstable_cache } from "next/cache";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | البرامج والمشاريع`,
  };
}

const getCachedProgramsData = unstable_cache(
  async (charityName: string) => {
    let charityData = await prisma.charity.findUnique({
      where: { name: charityName },
    });

    if (!charityData) {
      const latestResponse = await prisma.surveyResponse.findFirst({
        where: { charityName: { equals: charityName, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
      });

      charityData = await prisma.charity.create({
        data: {
          name: charityName,
          establishmentDate: latestResponse?.establishmentDate || null,
          licenseNumber: latestResponse?.licenseNumber || null,
        },
      });
    }

    const programsData = await prisma.program.findMany({
      where: { charityId: charityData.id },
      orderBy: { createdAt: "desc" },
    });

    return { charity: charityData, programs: programsData };
  },
  ['charity-programs'],
  { revalidate: 300, tags: ['programs'] }
);

export default async function CharityProgramsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const { charity, programs } = await getCachedProgramsData(decodedName);

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
