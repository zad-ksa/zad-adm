import { prisma } from "@/lib/db";
import { toCivilDate } from "@/lib/businessDays";
import { loadHolidays } from "@/lib/zadAttendance";
import {
  calendarDaysBetween,
  sinceLabel,
  stalenessOf,
  toCivilDateInput,
  workingDaysBetween,
  type Staleness,
} from "@/lib/latestUpdates";

/**
 * خانات الجدولين: آخر حدثٍ في كل خانة، و«منذ» ولونه، وعدد السجلّ.
 *
 * يُحسب لحظة القراءة لا يُخزَّن — الصفحة تُبنى عند كل طلب، فاللون صحيحٌ
 * دائماً بلا مهمّةٍ دورية تكتبه.
 */

export type CellView = {
  content: string;
  eventDate: string;
  since: string;
  staleness: Staleness;
  count: number;
  subColumnName: string | null;
};

type Row = {
  charityId: string;
  serviceName: string;
  subColumnId: string | null;
  content: string;
  eventDate: Date;
  createdAt: Date;
  subColumn: { name: string } | null;
};

/**
 * `groupOf` يحدّد خانة الحدث: في الجدول العام (الجمعية، العمود) فيجتمع فيها
 * ما كان على العمود وما كان على فروعه، وفي الفرعي (الجمعية، الخدمة الفرعية).
 */
export async function buildCells(
  where: { charityIds: string[]; columnKeys: string[]; subOnly?: boolean },
  groupOf: (r: Row) => string
): Promise<{ cells: Record<string, CellView>; today: string }> {
  const today = toCivilDate(new Date());
  if (where.charityIds.length === 0 || where.columnKeys.length === 0) {
    return { cells: {}, today: toCivilDateInput(today) };
  }

  const rows = await prisma.latestUpdate.findMany({
    where: {
      charityId: { in: where.charityIds },
      serviceName: { in: where.columnKeys },
      ...(where.subOnly ? { subColumnId: { not: null } } : {}),
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    select: {
      charityId: true,
      serviceName: true,
      subColumnId: true,
      content: true,
      eventDate: true,
      createdAt: true,
      subColumn: { select: { name: true } },
    },
  });

  // مرتّبةٌ تنازلياً، فأول صفٍّ لكل خانةٍ هو أحدثها.
  const first = new Map<string, Row>();
  const count = new Map<string, number>();
  for (const r of rows) {
    const k = groupOf(r);
    if (!first.has(k)) first.set(k, r);
    count.set(k, (count.get(k) ?? 0) + 1);
  }

  const oldest = [...first.values()].reduce<Date>((min, r) => (r.eventDate < min ? r.eventDate : min), today);
  const holidays = first.size > 0 ? await loadHolidays({ start: oldest, end: today }) : [];

  const cells: Record<string, CellView> = {};
  for (const [k, r] of first) {
    cells[k] = {
      content: r.content,
      eventDate: toCivilDateInput(r.eventDate),
      since: sinceLabel(calendarDaysBetween(r.eventDate, today)),
      staleness: stalenessOf(workingDaysBetween(r.eventDate, today, holidays)),
      count: count.get(k) ?? 1,
      subColumnName: r.subColumn?.name ?? null,
    };
  }
  return { cells, today: toCivilDateInput(today) };
}
