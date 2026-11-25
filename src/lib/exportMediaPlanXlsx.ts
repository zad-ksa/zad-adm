// تصديرُ الخطّة الإعلاميّة لشهرٍ إلى Excel — في المتصفّح، بلا خادم.
//
// صفٌّ لكلِّ منشورٍ مرتّباً بيومه ووقته، والورقةُ من اليمين إلى اليسار، ورأسُها
// ثابتٌ عند التمرير. والمكتبةُ تُحمَّل عند الضغط وحدَه: ثقيلةٌ، ولا يحتاجها من
// يفتح الخطّة ليقرأها.

import { shortStatus, type MediaStatus } from "@/lib/mediaPlan";

export type ExportPost = {
  scheduledOn: string;
  scheduledAt: string | null;
  title?: string | null;
  content: string;
  description?: string | null;
  platforms: string[];
  imageUrl: string | null;
  linkUrl: string | null;
  attachments?: { url: string; name?: string | null }[];
  status: MediaStatus;
};

const NAVY = "FF1F3864";
const LIGHT = "FFEEF1F6";

const WEEKDAY = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { weekday: "long", timeZone: "UTC" });

function weekdayOf(iso: string): string {
  return WEEKDAY.format(new Date(`${iso}T00:00:00Z`));
}

export async function exportMediaPlanXlsx({
  charityName,
  monthLabel,
  posts,
  platformName,
}: {
  charityName: string;
  monthLabel: string;
  posts: ExportPost[];
  /** اسمُ المنصّة من مفتاحها — والمفتاحُ نفسُه إن لم تُعرف. */
  platformName: (key: string) => string;
}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("الخطة الإعلامية", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 2 }],
  });

  const columns = [
    { header: "م", width: 5 },
    { header: "التاريخ", width: 12 },
    { header: "اليوم", width: 10 },
    { header: "الوقت", width: 8 },
    { header: "المنصات", width: 18 },
    { header: "العنوان", width: 26 },
    { header: "نص التصميم", width: 40 },
    { header: "نص المنشور", width: 50 },
    { header: "الحالة", width: 16 },
    { header: "الصورة", width: 14 },
    { header: "الرابط", width: 14 },
    { header: "المرفقات", width: 18 },
  ];
  ws.columns = columns.map((c) => ({ width: c.width }));

  // سطرُ العنوان فوق الجدول.
  ws.mergeCells(1, 1, 1, columns.length);
  const title = ws.getCell(1, 1);
  title.value = `الخطة الإعلامية — ${charityName} — ${monthLabel}`;
  title.font = { bold: true, size: 14, color: { argb: NAVY } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 26;

  const head = ws.getRow(2);
  columns.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  head.height = 22;

  const sorted = [...posts].sort(
    (a, b) =>
      a.scheduledOn.localeCompare(b.scheduledOn) ||
      // ما لا وقتَ له في آخر يومه، كما في التقويم.
      (a.scheduledAt ?? "99:99").localeCompare(b.scheduledAt ?? "99:99")
  );

  const link = (url: string | null | undefined, text: string) =>
    url ? { text, hyperlink: url } : "";

  sorted.forEach((p, i) => {
    const files = p.attachments ?? [];
    const row = ws.addRow([
      i + 1,
      p.scheduledOn,
      weekdayOf(p.scheduledOn),
      p.scheduledAt ?? "",
      p.platforms.map(platformName).join("، "),
      p.title ?? "",
      p.content ?? "",
      p.description ?? "",
      shortStatus(p.status),
      link(p.imageUrl, "عرض الصورة"),
      link(p.linkUrl, "فتح الرابط"),
      // خانةٌ واحدةٌ تحمل رابطاً واحداً: المرفقُ الأوّلُ رابطٌ، والعددُ يُذكر.
      files.length ? link(files[0].url, files.length > 1 ? `${files.length} مرفقات` : files[0].name || "مرفق") : "",
    ]);
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell((cell, col) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFBFBFBF" } },
        bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
        left: { style: "thin", color: { argb: "FFBFBFBF" } },
        right: { style: "thin", color: { argb: "FFBFBFBF" } },
      };
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
      if ([1, 2, 3, 4, 9].includes(col)) cell.alignment = { ...cell.alignment, horizontal: "center" };
      if (cell.value && typeof cell.value === "object" && "hyperlink" in cell.value) {
        cell.font = { color: { argb: "FF0563C1" }, underline: true };
      }
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `الخطة الإعلامية - ${charityName} - ${monthLabel}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
