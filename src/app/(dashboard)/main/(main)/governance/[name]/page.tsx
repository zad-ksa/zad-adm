import { Scale, FolderOpen, FileText, LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import GovernanceFolders from "./GovernanceFolders";
import GovernanceRegulationsManager from "./GovernanceRegulationsManager";
import { getSession } from "@/lib/auth";
import { isAdmin as checkIsAdmin, hasPermission } from "@/lib/permissions";
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

import { Suspense } from "react";
import CircularLoader from "@/components/CircularLoader";

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
  const encodedName = encodeURIComponent(decodedName);

  const session = await getSession();

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


        </div>
      </div>
      
      <Suspense key={activeTab} fallback={<div className="py-12"><CircularLoader /></div>}>
        <GovernanceTabContent decodedName={decodedName} activeTab={activeTab} session={session} />
      </Suspense>
    </div>
  );
}

async function GovernanceTabContent({ 
  decodedName, 
  activeTab, 
  session 
}: { 
  decodedName: string, 
  activeTab: string, 
  session: any 
}) {
  // Regulations are not scoped to the charity, so they do not have to wait for
  // it — and only two of the three tabs render them. The default "manual" tab
  // was paying a round trip for a list it never showed.
  const needsRegulations = activeTab === "files" || activeTab === "services";

  const [charity, regulations] = await Promise.all([
    prisma.charity.findUnique({
      where: { name: decodedName },
      include: {
        governanceProgress: true
      }
    }),
    needsRegulations
      ? prisma.regulation.findMany({
          orderBy: { createdAt: 'asc' },
          include: {
            charityVisibilities: true
          }
        })
      : Promise.resolve([]),
  ]);

  // Two further queries used to run here, chained: a Service lookup followed by
  // its ServiceStage rows. The result was assigned to a `stages` variable that
  // nothing on this page ever read, so both round trips were pure waste and are
  // gone. If a stages view is wanted here later it should be fetched by the
  // component that renders it.

  const isAdmin = checkIsAdmin(session?.role) || hasPermission(session?.role || "", session?.permissions || [], "manage_governance");

  return (
    <>


      {charity && activeTab === 'manual' && (
        <GovernanceManualViewer 
          charityId={charity.id}
          charityName={decodedName}
          initialSize={(charity.size as CharitySize) || null} 
          annualRevenue={charity.annualRevenue}
          progress={charity.governanceProgress}
        />
      )}

      {charity && activeTab === 'files' && (
        <GovernanceFolders charityId={charity.id} regulations={regulations} isAdmin={isAdmin} />
      )}
      
      {charity && activeTab === 'services' && (
        <div className="space-y-12">
          <GovernanceRegulationsManager charityId={charity.id} regulations={regulations} isAdmin={isAdmin} />
        </div>
      )}
    </>
  );
}
