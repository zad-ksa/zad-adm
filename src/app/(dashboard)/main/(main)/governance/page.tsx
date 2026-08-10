import { Scale, FileText } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import GovernanceRegulationsManager from "./[name]/GovernanceRegulationsManager";
import { getSession } from "@/lib/auth";
import GovernanceManualViewer from "@/components/GovernanceManualViewer";
import { Suspense } from "react";
import CircularLoader from "@/components/CircularLoader";

export const metadata: Metadata = {
  title: "دليل الحوكمة وخدمات المركز | الحوكمة",
};

export default async function GeneralGovernancePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab || "manual"; // Default to manual

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
            الحوكمة وخدمات المركز
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-6">
            هذه المساحة مخصصة لاستعراض دليل الحوكمة الشامل والاطلاع على خدمات المركز الوطني.
          </p>
        </div>
      </div>
      
      <Suspense key={activeTab} fallback={<div className="py-12"><CircularLoader /></div>}>
        <GovernanceTabContent activeTab={activeTab} session={session} />
      </Suspense>
    </div>
  );
}

async function GovernanceTabContent({ 
  activeTab, 
  session 
}: { 
  activeTab: string, 
  session: any 
}) {
  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER"].includes(session?.role || "");

  const regulations = await prisma.regulation.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      charityVisibilities: true
    }
  });

  return (
    <>
      {activeTab === 'manual' && (
        <GovernanceManualViewer />
      )}

      {activeTab === 'services' && (
        <div className="space-y-12">
          <GovernanceRegulationsManager regulations={regulations} isAdmin={isAdmin} />
        </div>
      )}
    </>
  );
}
