import { Scale, FolderOpen, FileText, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/console/layout";
import { charityCrumbs } from "@/lib/crumbs";
import { requireCharitySection } from "@/lib/sectionGuard";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
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

  await requireCharitySection("manage_governance", decodedName);
  const activeTab = tab || "manual"; // Default to manual
  const encodedName = encodeURIComponent(decodedName);

  const session = await getSession();

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={charityCrumbs(decodedName, { label: "الحوكمة" })}
        icon={<Scale className="w-6 h-6" />}
        title="الحوكمة"
        description="إدارة ومتابعة معايير الحوكمة والامتثال للجمعية."
      />

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
  const needsRegulations = activeTab === "services";

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


      {charity && activeTab === 'services' && (
        <div className="space-y-12">
          <GovernanceRegulationsManager charityId={charity.id} regulations={regulations} isAdmin={isAdmin} />
        </div>
      )}
    </>
  );
}
