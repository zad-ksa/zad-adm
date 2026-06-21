import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import ProgramsClient from "./ProgramsClient";
import DepartmentServicesTimeline from "@/components/DepartmentServicesTimeline";


export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | البرامج والمشاريع`,
  };
}

const getCachedProgramsData = async (charityName: string) => {
    let charityData = await prisma.charity.findUnique({
      where: { name: charityName },
      include: {
        programs: {
          orderBy: { createdAt: "desc" }
        }
      }
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
      }) as any;
      (charityData as any).programs = [];
    }

    return { charity: charityData!, programs: (charityData as any).programs };
  };

export default async function CharityProgramsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const { charity, programs } = await getCachedProgramsData(decodedName);

  return (
    <div className="space-y-12">
      <ProgramsClient
        charity={{
          id: charity.id,
          name: charity.name,
          logoUrl: charity.logoUrl,
        }}
        initialPrograms={programs}
      />
      
      {charity && (
        <DepartmentServicesTimeline charityId={charity.id} department="PROGRAMS" />
      )}
    </div>
  );
}
