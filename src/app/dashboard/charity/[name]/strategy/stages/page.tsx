import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import StrategicStagesManager from "../StrategicStagesManager";
import { ensureStagesForCharity } from "@/app/actions/strategy";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} - إدارة المراحل | زاد التنموية`,
  };
}

export default async function StrategicStagesPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
  });

  let stages: any[] = [];
  if (charity) {
    await ensureStagesForCharity(charity.id);
    stages = await prisma.strategicStage.findMany({
      where: { charityId: charity.id },
      orderBy: { order: 'asc' },
    });
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {charity && (
        <StrategicStagesManager charityId={charity.id} initialStages={stages} />
      )}
    </div>
  );
}
