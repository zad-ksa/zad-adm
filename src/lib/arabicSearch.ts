/**
 * بحثٌ في نصٍّ عربيٍّ كما يكتبه الباحثُ لا كما كُتب النصّ.
 *
 * **ولمَ تسوية**: من يبحث يكتب على عجلٍ بلا همزةٍ ولا تشكيل — «لائحه
 * الجمعيه» — والنصُّ منقولٌ من مصدره بهمزاته وتاءاته المربوطة. فالمطابقةُ
 * الحرفيّةُ تردُّ «لا نتائج» على نصٍّ فيه ما طُلب.
 *
 * **والتسويةُ عند السؤال لا عند الحفظ**: النصُّ يبقى كما كُتب، فيُقرأ صحيحاً
 * ويُنسخ صحيحاً — والمُسوّى نسخةٌ عابرةٌ للمقارنة وحدَها.
 */

/** الحركاتُ والتطويلُ — تسقط في التسوية ولا موضعَ لها في المقارنة. */
const MARKS = /[ً-ْـ]/;

export function normalizeArabic(value: string): string {
  return value
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ؤئ]/g, "ء")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** هل يقع السؤالُ في النصّ؟ وسؤالٌ فارغٌ يقع في كلِّ نصّ — فلا يُرشَّح بلا شيء. */
export function matchesQuery(text: string, query: string): boolean {
  const q = normalizeArabic(query);
  if (!q) return true;
  return normalizeArabic(text).includes(q);
}

export type HighlightPart = { text: string; hit: boolean };

/**
 * تقطيعُ نصٍّ على مواضع البحث — ليُلوَّن الموافقُ منه دون غيره.
 *
 * **ويُقطَّع على النصِّ كما كُتب لا على المُسوَّى**: القارئُ يقرأ ما كُتب،
 * والتلوينُ على نسخةٍ مُسوّاةٍ يعرض نصّاً غيرَ النصّ. فتُبنى خريطةُ مواضعَ من
 * المُسوّى إلى الأصل، ويُقصُّ الأصلُ عليها.
 *
 * **والحرفُ قد يسقط في التسوية** (تشكيلٌ أو تطويلٌ أو فراغٌ مكرَّر)، فلا
 * موضعَ له في الخريطة ويلتصق بما حولَه — ومن ثمَّ لم تكفِ `indexOf` وحدَها
 * على فارق الطولين.
 */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const q = normalizeArabic(query);
  if (!q || !text) return [{ text, hit: false }];

  let normalized = "";
  const mapping: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const raw = text[i];
    let piece: string;
    if (/\s/.test(raw)) {
      // والفراغاتُ المتتاليةُ فراغٌ واحدٌ كما في تسوية السؤال، وإلّا اختلف
      // الطولان فلم يُطابق «لائحة الجمعية» نصّاً بينهما سطر.
      piece = normalized.endsWith(" ") ? "" : " ";
    } else {
      piece = normalizeArabic(raw);
    }
    for (const ch of piece) {
      normalized += ch;
      mapping.push(i);
    }
  }

  const parts: HighlightPart[] = [];
  let cursor = 0;
  let from = 0;
  while (from <= normalized.length - q.length) {
    const at = normalized.indexOf(q, from);
    if (at === -1) break;
    const start = mapping[at];
    let end = mapping[at + q.length - 1] + 1;
    // والتشكيلُ اللاحقُ يدخل في المُعلَّم: حركةٌ على آخر حرفٍ تسقط في
    // التسوية، فلو خرجت من القطعة رُسمت علامةً وحدها في عنصرٍ آخر.
    while (end < text.length && MARKS.test(text[end])) end++;
    if (start > cursor) parts.push({ text: text.slice(cursor, start), hit: false });
    parts.push({ text: text.slice(start, end), hit: true });
    cursor = end;
    from = at + q.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
  return parts.length > 0 ? parts : [{ text, hit: false }];
}
