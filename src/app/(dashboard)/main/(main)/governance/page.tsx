import { Scale, FileText } from "lucide-react";
import { PageHeader } from "@/components/console/layout";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import GovernanceRegulationsManager from "./[name]/GovernanceRegulationsManager";
import { getSession } from "@/lib/auth";
import { requireSection } from "@/lib/sectionGuard";
import { isAdmin as checkIsAdmin, hasPermission } from "@/lib/permissions";
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

  await requireSection("manage_governance");
  const session = await getSession();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Scale className="w-6 h-6" />}
        title="الحوكمة وخدمات المركز"
        description="هذه المساحة مخصصة لاستعراض دليل الحوكمة الشامل والاطلاع على خدمات المركز الوطني."
      />
      
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
  const isAdmin = checkIsAdmin(session?.role) || hasPermission(session?.role || "", session?.permissions || [], "manage_governance");

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
