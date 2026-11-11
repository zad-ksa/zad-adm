import type { SheetColumn, SheetSpec, CellValue } from "./xlsx.ts";
import { grantStatusLabel } from "./donorOrg.ts";

/**
 * تقريرُ المنح: أيُّ الأعمدةِ يحمل، وكيف تُكتب خلاياه.
 *
 * وهو أوسعُ من الجدول على الشاشة عمداً: الجدولُ يُقرأ في لمحةٍ فستّةُ أعمدةٍ
 * تكفيه، والتقريرُ يُفتح في إكسل ليُجمع ويُقارن — فيحمل المبلغَ المعتمدَ
 * والمحصَّلَ وعددَ المستفيدين والأقساطَ وتاريخَ الإغلاق، وهي حقولٌ مكتوبةٌ في
 * القاعدة ولم يكن لها موضعٌ تُقرأ فيه مجموعةً قطّ.
 *
 * **وما يُصدَّر هو ما يراه المُصدِّر**: الصفوفُ تأتي مُرشَّحةً كما على الشاشة،
 * والخادمُ يُعيد قراءتها في نطاق الرائي — فلا يُخرج ملفٌّ صفّاً لا تُظهره
 * الصفحةُ لصاحبه.
 */

export type GrantReportRow = {
  charityName: string;
  donorName: string;
  /** جهةٌ مكتوبةٌ بالاسم بلا صفٍّ مرتبط — تُعلَّم في التقرير ولا تُحذف. */
  donorMissing: boolean;
  initiativeName: string;
  requestedAmount: number;
  status: string;
  collectedAmount: number | null;
  beneficiariesCount: number | null;
  installmentsCount: number | null;
  installmentsNotes: string | null;
  /** «2026-11-11» أو نصُّ تاريخٍ مقروء. */
  createdAt: string;
  closureDate: string | null;
};

export const GRANT_REPORT_COLUMNS: SheetColumn[] = [
  { header: "الجمعية", width: 24 },
  { header: "الجهة المانحة", width: 26 },
  { header: "المشروع", width: 34 },
  { header: "المبلغ المطلوب", width: 16, kind: "number" },
  { header: "المبلغ المحصَّل", width: 16, kind: "number" },
  { header: "الحالة", width: 13 },
  { header: "المستفيدون", width: 12, kind: "number" },
  { header: "عدد الأقساط", width: 12, kind: "number" },
  { header: "ملاحظات الأقساط", width: 30 },
  { header: "تاريخ الرفع", width: 14 },
  { header: "تاريخ الإغلاق", width: 14 },
];

/**
 * الخلايا. والفارغُ يُترك فارغاً لا يُكتب «٠» ولا «غير محدد»:
 * صفرُ المستفيدين خبرٌ، وغيابُ العدد خبرٌ آخر — وخلطُهما يُفسد أيَّ جمعٍ لاحق.
 */
export function grantReportCells(row: GrantReportRow): CellValue[] {
  return [
    row.charityName,
    row.donorMissing ? `${row.donorName} (بلا جهةٍ مرتبطة)` : row.donorName,
    row.initiativeName,
    row.requestedAmount,
    row.collectedAmount,
    grantStatusLabel(row.status),
    row.beneficiariesCount,
    row.installmentsCount,
    row.installmentsNotes,
    row.createdAt,
    row.closureDate,
  ];
}

export function grantsReportSheet(rows: GrantReportRow[]): SheetSpec {
  return {
    name: "المنح",
    columns: GRANT_REPORT_COLUMNS,
    rows: rows.map(grantReportCells),
  };
}

/**
 * اسمُ الملفّ: «تقرير المنح - 2026-11-11.xlsx».
 *
 * وبالتاريخ الميلاديِّ بأرقامٍ لاتينيّة: ملفّاتٌ تُحفظ في مجلَّدٍ واحدٍ تُرتَّب
 * بأسمائها، و«١١ نوفمبر» لا يُرتِّب شيئاً.
 */
export function grantsReportFileName(today: Date, scope?: string): string {
  const stamp = today.toISOString().slice(0, 10);
  return `تقرير المنح${scope ? ` - ${scope}` : ""} - ${stamp}.xlsx`;
}
