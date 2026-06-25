"use client";

import { Printer } from "lucide-react";

type Stage = {
  id: string;
  name: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  order: number;
  isCurrent: boolean;
  isContinuous?: boolean;
};

type TimelineSection = {
  title: string;
  stages: Stage[];
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ar-SA");
}

function buildPrintHtml(charityName: string, sections: TimelineSection[]): string {
  let sectionsHtml = "";

  for (const section of sections) {
    if (section.stages.length === 0) continue;
    const sorted = [...section.stages].sort((a, b) => a.order - b.order);
    const currentIdx = sorted.findIndex(s => s.isCurrent);

    let rows = "";
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const isCompleted = currentIdx !== -1 && i < currentIdx;
      const isCurrent = s.isCurrent;
      const isContinuous = s.isContinuous;
      const dates = [s.startDate ? formatDate(s.startDate) : "", s.endDate ? formatDate(s.endDate) : ""].filter(Boolean).join(" — ");

      let badge = "—";
      if (isContinuous) badge = `<span class="cont-badge">مستمرة</span>`;
      else if (isCurrent) badge = `<span class="current-badge">الحالية</span>`;
      else if (isCompleted) badge = `<span class="done-badge">مكتملة</span>`;

      rows += `<tr>
        <td style="text-align:center;font-weight:bold">${isContinuous ? "∞" : i + 1}</td>
        <td style="font-weight:${isCurrent ? "bold" : "normal"}">${s.name}</td>
        <td style="color:#475569">${s.description || "—"}</td>
        <td dir="ltr" style="font-size:9pt;color:#475569">${dates || "—"}</td>
        <td>${badge}</td>
      </tr>`;
    }

    sectionsHtml += `
      <div class="section">
        <div class="section-title">${section.title}</div>
        <table>
          <thead>
            <tr><th>#</th><th>اسم المرحلة</th><th>الوصف</th><th>الفترة الزمنية</th><th>الحالة</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  return `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="utf-8"/>
<title>خطة خدمات ${charityName}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #1e293b; direction: rtl; }
  h1 { font-size: 17pt; font-weight: bold; border-bottom: 3px solid #0ea5e9; padding-bottom: 8px; margin-bottom: 6px; }
  .sub { color: #64748b; font-size: 10pt; margin-bottom: 20px; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section-title { font-size: 13pt; font-weight: bold; margin-bottom: 8px; background: #f1f5f9; padding: 6px 10px; border-radius: 6px; border-right: 4px solid #0ea5e9; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { background: #0ea5e9; color: white; padding: 6px 8px; text-align: right; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .current-badge { background: #0ea5e9; color: white; font-size: 8pt; padding: 1px 6px; border-radius: 10px; }
  .done-badge { background: #10b981; color: white; font-size: 8pt; padding: 1px 6px; border-radius: 10px; }
  .cont-badge { background: #f59e0b; color: white; font-size: 8pt; padding: 1px 6px; border-radius: 10px; }
</style></head>
<body>
<h1>خطة خدمات جمعية ${charityName}</h1>
<p class="sub">تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}</p>
${sectionsHtml}
</body></html>`;
}

export default function ServicesPrintButton({
  charityName,
  sections,
}: {
  charityName: string;
  sections: TimelineSection[];
}) {
  function handlePrint() {
    const html = buildPrintHtml(charityName, sections);
    const win = window.open("", "_blank", "width=920,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
    >
      <Printer className="w-4 h-4" />
      طباعة / PDF
    </button>
  );
}
