/**
 * تقطيع نص على هاشتاقاته — خالصا، بلا شاشة.
 *
 * فالهاشتاق يكتب ضمن نص المنشور ولا حقل له (طلب صاحب الموقع)، ويعرض بلون
 * ازرق حيث يقرأ. وهذا ما يعرف اين هو من النص.
 *
 * والحرف العربي والرقم العربي كلاهما داخل في الهاشتاق (`\p{L}` و`\p{N}`)، فلا
 * يقطع «#زاد_التنموية» عند اول حرف عربي كما يفعل `\w`.
 */

export type TextPiece = {
  text: string;
  /** هل هذا المقطع هاشتاق؟ */
  tag: boolean;
};

/** الهاشتاق: شباك ثم حرف او رقم او شرطة سفلية — ولا يقطعه الحرف العربي. */
const HASHTAG = /#[\p{L}\p{N}_]+/gu;

/**
 * مقاطع النص بالترتيب: ما ليس هاشتاقا، وما هو هاشتاق.
 *
 * ولا يرجع مقاطع فارغة: من يعرضها يكتب عنصرا لكل مقطع، والفارغ عنصر بلا شيء.
 */
export function splitHashtags(text: string | null | undefined): TextPiece[] {
  const value = text ?? "";
  if (!value) return [];

  const pieces: TextPiece[] = [];
  let at = 0;
  for (const match of value.matchAll(HASHTAG)) {
    const index = match.index ?? 0;
    if (index > at) pieces.push({ text: value.slice(at, index), tag: false });
    pieces.push({ text: match[0], tag: true });
    at = index + match[0].length;
  }
  if (at < value.length) pieces.push({ text: value.slice(at), tag: false });
  return pieces;
}

/** الهاشتاقات وحدها كما كتبت، بلا تكرار. */
export function hashtagsIn(text: string | null | undefined): string[] {
  return [...new Set(splitHashtags(text).filter((piece) => piece.tag).map((piece) => piece.text))];
}
