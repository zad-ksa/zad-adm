import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Rss } from "lucide-react";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/console/layout";
import { cellKey, getLatestUpdatesScope } from "@/lib/latestUpdatesAccess";
import { buildCells } from "@/lib/latestUpdatesView";
import LatestUpdatesClient, { type GridColumn } from "./LatestUpdatesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "آخر المستجدات | زاد التنموية",
};

/**
 * آخر المستجدات — جمعيات الشخص × خدماته، وفي كل خانة آخر ما استجدّ فيها أو
 * في أحد فروعها. والبوابة في الخادم: إخفاء الرابط ليس منعاً.
 */
export default async function LatestUpdatesPage() {
  const session = await getSession();
  if (!session?.id) redirect("/login");
  const scope = await getLatestUpdatesScope(session);
  if (!scope.canView) redirect("/main");

  const { cells, today } = await buildCells(
    { charityIds: scope.charities.map((c) => c.id), columnKeys: scope.columns.map((c) => c.key) },
    (r) => cellKey(r.charityId, r.serviceName)
  );

  const columns: GridColumn[] = scope.columns.map((c) => ({
    id: c.key,
    name: c.name,
    editable: c.custom,
    href: `/main/latest-updates/${encodeURIComponent(c.key)}`,
  }));

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <PageHeader
        icon={<Rss className="w-6 h-6" />}
        title="آخر المستجدات"
        description="آخر ما استجدّ في كل خدمة عند كل جمعية. اضغط المستجد لترى سجلّه، واسم الخدمة لترى خدماتها الفرعية."
      />
      <LatestUpdatesClient
        mode={{ kind: "main" }}
        charities={scope.charities}
        columns={columns}
        visible={[...scope.cells]}
        latest={cells}
        canAdd={scope.canAdd}
        canManage={scope.canManage}
        today={today}
      />
    </div>
  );
}
