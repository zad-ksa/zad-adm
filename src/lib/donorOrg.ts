/**
 * الجهاتُ المانحة: أنواعُها وحالةُ الرفع فيها وتسويةُ أسمائها.
 *
 * وحدةٌ خالصةٌ بلا استيراد — يقرؤها الموقعُ وسكربتُ الهجرة
 * (`scripts/seed-donor-orgs.mjs`) كليهما، فلا تُكتب تسويةُ الاسم مرّتين
 * فتختلفا.
 */

export type DonorKind = "FOUNDATION" | "EHSAN" | "CHARITY_FUND";

/** تبويبٌ لكل نوع تحت «تنمية الموارد المالية». */
export const DONOR_KINDS = [
  { value: "FOUNDATION", label: "الجهات المانحة", href: "/main/donors" },
  { value: "EHSAN", label: "منصة إحسان", href: "/main/ehsan" },
  { value: "CHARITY_FUND", label: "صندوق دعم الجمعيات", href: "/main/charity-fund" },
] as const satisfies readonly { value: DonorKind; label: string; href: string }[];

export function donorKindOf(value: string): DonorKind {
  return DONOR_KINDS.some((k) => k.value === value) ? (value as DonorKind) : "FOUNDATION";
}

export type IntakeStatus = "OPEN" | "CLOSED";

export const INTAKE_STATUSES = [
  { value: "OPEN", label: "مفتوح" },
  { value: "CLOSED", label: "مغلق" },
] as const satisfies readonly { value: IntakeStatus; label: string }[];

export function intakeStatusOf(value: string): IntakeStatus {
  return value === "OPEN" ? "OPEN" : "CLOSED";
}

export function intakeLabel(status: IntakeStatus): string {
  return status === "OPEN" ? "مفتوح" : "مغلق";
}

/**
 * تسويةُ اسم الجهة للمطابقة — لا للعرض.
 *
 * فالاسمُ في الملفات والقاعدة يُكتب بمسافةٍ زائدةٍ في طرفه، وبألفٍ بهمزةٍ وبلا
 * همزة، وبتاءٍ مربوطةٍ وهاء. وفي قاعدتك اليوم: «بنك الجزيرة» و«بنك الجزيرة␣»
 * بُعدان برمزين، و«منصة إحسان» و«منصة احسان» جهتان في الجدول وواحدةٌ في الواقع.
 *
 * والمخرَجُ مفتاحُ مقارنةٍ لا اسمٌ يُعرض: «مؤسسه» ليست هجاءً صحيحاً، وإنما
 * صورةٌ تتساوى فيها الهجاءات.
 */
export function normalizeDonorName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[أإآٱ]/g, "ا") // أ إ آ ٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/[ً-ْٰـ]/g, ""); // التشكيل والتطويل
}

/** الاسمُ كما يُخزَّن: مسافاتٌ مسوّاةٌ بلا تغيير هجاء. */
export function cleanDonorName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

/**
 * سطرٌ يُقال حين تُخالف التواريخُ الحالةَ المعلنة.
 *
 * والحالةُ هي الحقيقة — يضبطها الموظف — والتاريخان بيانٌ معلن: جهةٌ تُفتح بلا
 * تاريخٍ، وأخرى تُغلق قبل موعدها. فلا تُقلب الشارةُ بالتاريخ، ويُقال التناقضُ
 * سطراً هادئاً ليراجعه من يعلم.
 */
export function intakeDateNote(
  status: IntakeStatus,
  opensAt: Date | null,
  closesAt: Date | null,
  now: Date
): string | null {
  const t = now.getTime();
  if (status === "OPEN" && closesAt && closesAt.getTime() < t) {
    return "الحالة مفتوحة وتاريخُ الإغلاق المعلن قد مضى";
  }
  if (status === "OPEN" && opensAt && opensAt.getTime() > t) {
    return "الحالة مفتوحة وتاريخُ الفتح المعلن لم يحضر بعد";
  }
  if (status === "CLOSED" && opensAt && opensAt.getTime() <= t && (!closesAt || closesAt.getTime() >= t)) {
    return "الحالة مغلقة وموعدُ الرفع المعلن قائم";
  }
  return null;
}

/** حالاتُ المنحة كما خُزّنت نصّاً في `GrantApplication.status`. */
export const GRANT_STATUSES = [
  { value: "PENDING", label: "قيد الدراسة" },
  { value: "APPROVED", label: "مقبولة" },
  { value: "REJECTED", label: "مرفوضة" },
  { value: "CLOSED", label: "مغلقة" },
] as const;

export function grantStatusLabel(value: string): string {
  return GRANT_STATUSES.find((s) => s.value === value)?.label ?? value;
}
