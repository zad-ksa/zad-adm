import { Scale } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import GovernanceStagesManager from "./GovernanceStagesManager";
import GovernanceFolders from "./GovernanceFolders";
import { getSession } from "@/lib/auth";
import DepartmentServicesTimeline from "@/components/DepartmentServicesTimeline";
import CharityClientTimeline from "@/components/CharityClientTimeline";

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
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
        {/* Decorative subtle background element */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 text-center py-6">
          <div className="w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
            <Scale className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            حوكمة الجمعية
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            هذه المساحة مخصصة لإدارة ومتابعة معايير الحوكمة والامتثال لجمعية <span className="font-bold text-slate-700 dark:text-slate-300">{decodedName}</span>. سيتم إضافة الأدوات والمؤشرات قريباً.
          </p>
        </div>
      </div>
      
      {session?.role === "CHARITY_CLIENT" && (
        <CharityClientTimeline title="المخطط الزمني" stages={stages} />
      )}

      {charity && (
        <GovernanceFolders charityId={charity.id} regulations={regulations} isAdmin={isAdmin} />
      )}
      
      {charity && (
        <DepartmentServicesTimeline charityId={charity.id} department="GOVERNANCE" />
      )}
    </div>
  );
}
