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
