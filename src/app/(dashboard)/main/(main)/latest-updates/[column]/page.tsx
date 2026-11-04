import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Rss } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/console/layout";
import { cellKey, getLatestUpdatesScope } from "@/lib/latestUpdatesAccess";
import { buildCells } from "@/lib/latestUpdatesView";
import LatestUpdatesClient, { type GridColumn } from "../LatestUpdatesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "الخدمات الفرعية | آخر المستجدات",
};

/**
 * جدول خدمةٍ واحدة: جمعياتها المرتبطة بالشخص × خدماتها الفرعية المُضافة يدوياً.
 * وأحداثه تُحفظ على العمود الأب ومعها الخدمة الفرعية، فتظهر في الجدول العام.
 */
export default async function LatestUpdatesColumnPage({ params }: { params: Promise<{ column: string }> }) {
  const { column } = await params;
  const columnKey = decodeURIComponent(column);

  const session = await getSession();
  if (!session?.id) redirect("/login");
  const scope = await getLatestUpdatesScope(session);
  if (!scope.canView) redirect("/main");

  // عمودٌ لا يراه الشخص كعمودٍ غير موجود: لا يُفصح الرابط عمّا لم يُمنح.
  const parent = scope.columns.find((c) => c.key === columnKey);
  if (!parent) notFound();

  const charities = scope.charities.filter((c) => scope.cells.has(cellKey(c.id, columnKey)));
  const subs = await prisma.latestUpdateSubColumn.findMany({
    where: { parentKey: columnKey },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });

  const { cells, today } = await buildCells(
    { charityIds: charities.map((c) => c.id), columnKeys: [columnKey], subOnly: true },
    (r) => cellKey(r.charityId, r.subColumnId ?? "")
  );

  const columns: GridColumn[] = subs.map((s) => ({ id: s.id, name: s.name, editable: true }));
  const visible = charities.flatMap((c) => subs.map((s) => cellKey(c.id, s.id)));

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <PageHeader
        icon={<Rss className="w-6 h-6" />}
        crumbs={[{ label: "آخر المستجدات", href: "/main/latest-updates" }, { label: parent.name }]}
        title={parent.name}
        description="الخدمات الفرعية لهذه الخدمة. ما يُضاف هنا يظهر في خانتها في الجدول العام أيضاً."
      />
      <LatestUpdatesClient
        mode={{ kind: "sub", parentKey: columnKey, parentName: parent.name }}
        charities={charities}
        columns={columns}
        visible={visible}
        latest={cells}
        canAdd={scope.canAdd}
        canManage={scope.canManage}
        today={today}
      />
    </div>
  );
}
