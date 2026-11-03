import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Rss } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EXTERNAL_CHARITIES } from "@/lib/charityScope";
import { PageHeader } from "@/components/console/layout";
import { toCivilDate } from "@/lib/businessDays";
import { loadHolidays } from "@/lib/zadAttendance";
import {
  calendarDaysBetween,
  sinceLabel,
  stalenessOf,
  toCivilDateInput,
  workingDaysBetween,
} from "@/lib/latestUpdates";
import { cellKey, getLatestUpdatesAccess } from "@/lib/latestUpdatesAccess";
import LatestUpdatesClient, { type LatestCell } from "./LatestUpdatesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "آخر المستجدات | زاد التنموية",
};

/**
 * آخر المستجدات — جدول الجمعيات × الخدمات، وفي كل خلية آخر ما استجدّ.
 *
 * والبوابة في الخادم لا بإخفاء وسمٍ في القائمة: إخفاء الرابط ليس منعاً.
 * و«منذ» ولونه يُحسبان هنا لحظة القراءة لا يُخزَّنان — الصفحة تُبنى عند كل
 * طلب، فاللون صحيحٌ دائماً بلا مهمّةٍ دورية تكتبه.
 */
export default async function LatestUpdatesPage() {
  const session = await getSession();
  if (!session?.id) redirect("/login");
  const access = await getLatestUpdatesAccess(session);
  if (!access.canView) redirect("/main");

  const [charities, services, latestRows, counts] = await Promise.all([
    prisma.charity.findMany({
      where: EXTERNAL_CHARITIES,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { charity: EXTERNAL_CHARITIES },
      select: { name: true, charityId: true },
    }),
    // الأحدث حدثاً في كل خلية، وعند التساوي الأحدث إدخالاً.
    prisma.latestUpdate.findMany({
      distinct: ["charityId", "serviceName"],
      orderBy: [{ charityId: "asc" }, { serviceName: "asc" }, { eventDate: "desc" }, { createdAt: "desc" }],
      select: { id: true, charityId: true, serviceName: true, content: true, eventDate: true },
    }),
    prisma.latestUpdate.groupBy({
      by: ["charityId", "serviceName"],
      _count: { _all: true },
    }),
  ]);

  const serviceNames = [...new Set(services.map((s) => s.name).filter((n) => n.trim() !== ""))].sort((a, b) =>
    a.localeCompare(b, "ar")
  );
  const existing = new Set(services.map((s) => cellKey(s.charityId, s.name)));

  const today = toCivilDate(new Date());
  const oldest = latestRows.reduce<Date>((min, r) => (r.eventDate < min ? r.eventDate : min), today);
  const holidays = latestRows.length > 0 ? await loadHolidays({ start: oldest, end: today }) : [];

  const countOf = new Map(counts.map((c) => [cellKey(c.charityId, c.serviceName), c._count._all]));
  const latest: Record<string, LatestCell> = {};
  for (const r of latestRows) {
    const key = cellKey(r.charityId, r.serviceName);
    const days = calendarDaysBetween(r.eventDate, today);
    latest[key] = {
      content: r.content,
      eventDate: toCivilDateInput(r.eventDate),
      since: sinceLabel(days),
      staleness: stalenessOf(workingDaysBetween(r.eventDate, today, holidays)),
      count: countOf.get(key) ?? 1,
    };
  }

  // خليةٌ يضيف فيها: قائمةٌ فعلاً، وفي نطاقه أو هو صاحب التحرير.
  const addable = [...existing].filter((k) => access.addable === null || access.addable.has(k));

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <PageHeader
        icon={<Rss className="w-6 h-6" />}
        title="آخر المستجدات"
        description="آخر ما استجدّ في كل خدمة عند كل جمعية. اضغط المستجد لترى سجلّه كاملاً."
      />
      <LatestUpdatesClient
        charities={charities}
        serviceNames={serviceNames}
        existing={[...existing]}
        addable={addable}
        latest={latest}
        canManage={access.canManage}
        today={toCivilDateInput(today)}
      />
    </div>
  );
}
