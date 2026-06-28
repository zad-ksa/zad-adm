import { Scale, FolderOpen, FileText, LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import GovernanceStagesManager from "./GovernanceStagesManager";
import GovernanceFolders from "./GovernanceFolders";
import { getSession } from "@/lib/auth";
import DepartmentServicesTimeline from "@/components/DepartmentServicesTimeline";
import CharityClientTimeline from "@/components/CharityClientTimeline";
import GovernanceManualViewer from "@/components/GovernanceManualViewer";
import Link from "next/link";
import { CharitySize } from "@/data/governanceManual";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | الحوكمة`,
  };
}

export default async function GovernancePage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ name: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { name } = await params;
  const { tab } = await searchParams;
  const decodedName = decodeURIComponent(name);
  const activeTab = tab || "manual"; // Default to manual

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
    include: {
      governanceProgress: true
    }
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

  const encodedName = encodeURIComponent(decodedName);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 left-0 w-48 h-48 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 text-center py-6">
          <div className="w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
            <Scale className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            حوكمة الجمعية
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-6">
            هذه المساحة مخصصة لإدارة ومتابعة معايير الحوكمة والامتثال لجمعية <span className="font-bold text-slate-700 dark:text-slate-300">{decodedName}</span>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link 
              href={`/charity/${encodedName}/governance?tab=manual`}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'manual' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <FileText className="w-4 h-4" />
              دليل الحوكمة
            </Link>
            <Link 
              href={`/charity/${encodedName}/governance?tab=files`}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'files' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <FolderOpen className="w-4 h-4" />
              الملفات والأنظمة
            </Link>
            <Link 
              href={`/charity/${encodedName}/governance?tab=services`}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'services' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              الخدمات والمشاريع
            </Link>
          </div>
        </div>
      </div>
      
      {session?.role === "CHARITY_CLIENT" && (
        <CharityClientTimeline title="المخطط الزمني" stages={stages} />
      )}

      {charity && activeTab === 'manual' && (
        <GovernanceManualViewer 
          charityId={charity.id} 
          initialSize={(charity.size as CharitySize) || null} 
          progress={charity.governanceProgress}
        />
      )}

      {charity && activeTab === 'files' && (
        <GovernanceFolders charityId={charity.id} regulations={regulations} isAdmin={isAdmin} />
      )}
      
      {charity && activeTab === 'services' && (
        <DepartmentServicesTimeline charityId={charity.id} department="GOVERNANCE" />
      )}
    </div>
  );
}
