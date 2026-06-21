import { Scale } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import GovernanceStagesManager from "./GovernanceStagesManager";
import GovernanceRegulationsManager from "./GovernanceRegulationsManager";
import { getSession } from "@/lib/auth";
import DepartmentServicesTimeline from "@/components/DepartmentServicesTimeline";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | الحوكمة`,
  };
}

export default async function GovernancePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
  });

  const session = await getSession();
  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER"].includes(session?.role || "");

  let stages: any[] = [];
  let regulations: any[] = [];
  if (charity) {
    stages = await prisma.governanceStage.findMany({
      where: { charityId: charity.id },
      orderBy: { order: 'asc' },
    });
    
    regulations = await prisma.regulation.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        charityVisibilities: true
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
        {/* Decorative subtle background element */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 text-center py-12">
          <div className="w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
            <Scale className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            حوكمة الجمعية
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            هذه المساحة مخصصة لإدارة ومتابعة معايير الحوكمة والامتثال لجمعية <span className="font-bold text-slate-700 dark:text-slate-300">{decodedName}</span>. سيتم إضافة الأدوات والمؤشرات قريباً.
          </p>
        </div>
      </div>

      {charity && (
        <DepartmentServicesTimeline charityId={charity.id} department="GOVERNANCE" />
      )}

      {charity && (
        <GovernanceRegulationsManager charityId={charity.id} regulations={regulations} isAdmin={isAdmin} />
      )}
    </div>
  );
}
