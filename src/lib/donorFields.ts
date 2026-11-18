/**
 * مجالاتُ المنح: تنقيةُ ما يُكتب، وتقطيعُ النصِّ القديم إلى صفوف.
 *
 * منطقٌ خالصٌ يُختبر: الفعلُ يكتب في القاعدة، وهذا يقرّر ما يُكتب — فتُراجَع
 * قواعدُ التقطيع بأمثلةٍ لا بتجربةٍ على بياناتٍ حيّة.
 */

export const MAX_FIELD_NAME = 120;
export const MAX_FIELD_DESCRIPTION = 500;

/** اسمُ المجال كما يُحفظ: مسافاتٌ مضمومة، وطولٌ محدود. */
export function cleanFieldName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_FIELD_NAME);
}

/** الوصفُ اختياريّ: الفارغُ يُحفظ عدماً لا نصّاً فارغاً. */
export function cleanFieldDescription(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim().slice(0, MAX_FIELD_DESCRIPTION);
  return value === "" ? null : value;
}

/**
 * تقطيعُ نصِّ المجالات القديم (`DonorOrg.fields`) إلى أسماءِ مجالات.
 *
 * **والفواصلُ المقبولةُ ثلاثة**: السطرُ الجديد، والفاصلةُ العربيةُ واللاتينية،
 * والنقطةُ الوسطى. أمّا الشرطةُ فتُقبل في أوّل السطر علامةَ تعداد، ولا تُقبل
 * فاصلاً في وسطه: «دعم الأيتام - المرحلة الثانية» اسمٌ واحدٌ لا اسمان.
 *
 * **ولا تُقطَّع الواو**: «التعليم والتدريب» مجالٌ واحدٌ في لسان الناس، وتقطيعُه
 * يُنشئ مجالَين لا وجودَ لهما.
 *
 * والمكرَّرُ يسقط بعد التسوية، والفارغُ كذلك — فنصٌّ مُنمَّقٌ بفواصلَ متتاليةٍ
 * لا يُنشئ صفوفاً فارغة.
 */
export function splitLegacyFields(text: string | null | undefined): string[] {
  if (!text) return [];
  const parts = text
    .split(/[\n\r،,؛;•]+/)
    .map((part) => cleanFieldName(part.replace(/^\s*[-–—*]\s*/, "")))
    .filter((part) => part !== "");

  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const key = part.replace(/\s+/g, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out;
}

/** هل في القائمة مجالٌ بهذا الاسم؟ — المقارنةُ بلا مسافاتٍ ولا حالةِ أحرف. */
export function sameFieldName(a: string, b: string): boolean {
  const key = (v: string) => v.replace(/\s+/g, "").toLowerCase();
  return key(a) === key(b) && key(a) !== "";
}

/**
 * مصيرُ المشروع المقترح — ثلاثةُ أحوالٍ لا أكثر.
 *
 * **ولمَ ثلاثة**: الجمعيةُ تسأل سؤالاً واحداً عمّا كتبته: أرُفع إلى الجهة أم
 * لا؟ و«مؤجَّل» هو الجواب الثالث الصادق — لا رُفع ولا طُرح. وما بعد الرفع
 * (مقبولةٌ أو مرفوضة) خبرُ المنحة لا خبرُ المقترح، ويُقرأ في جدول المنح.
 */
export const PROPOSAL_STATUSES = [
  { value: "PROPOSED", label: "مقترح", tone: "neutral" },
  { value: "SUBMITTED", label: "رفع للجهة", tone: "good" },
  { value: "DEFERRED", label: "مؤجل", tone: "warn" },
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]["value"];

export function proposalStatusOf(value: string | null | undefined): ProposalStatus {
  return PROPOSAL_STATUSES.some((s) => s.value === value) ? (value as ProposalStatus) : "PROPOSED";
}

export function proposalStatusLabel(value: string | null | undefined): string {
  return PROPOSAL_STATUSES.find((s) => s.value === proposalStatusOf(value))!.label;
}

export function proposalStatusTone(value: string | null | undefined): "neutral" | "good" | "warn" {
  return PROPOSAL_STATUSES.find((s) => s.value === proposalStatusOf(value))!.tone;
}
