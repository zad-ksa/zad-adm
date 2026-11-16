/**
 * مطابقةُ اسمِ شخصٍ مكتوبٍ بيدٍ باسمٍ مخزَّن — خالصةً، بلا قاعدةٍ ولا شاشة.
 *
 * **ولمَ لا تُقارَن الأسماءُ بحرفها**: «مدير المبادرة» عمودُ نصٍّ يُكتب يدوياً،
 * فتتسلّل إليه مسافةٌ زائدةٌ، وهمزةٌ تُكتب «أحمد» و«احمد»، وتاءٌ مربوطةٌ تُكتب
 * «حمزه» و«حمزة». ومقارنةٌ حرفيّةٌ تُخرج صاحبَ المبادرة من صفحة «مبادراتي» بلا
 * أن يعلم لماذا — وغيابُ صفٍّ لا يُشتكى منه كما يُشتكى من صفٍّ زائد.
 *
 * وليست مطابقةً «ذكيّةً» تُقرِّب المتشابهَين: من اختلف اسمُه اختلف. هذه تُسوّي
 * رسمَ الحرف الواحد لا غير.
 */

/** الاسمُ على رسمٍ واحدٍ يُقارَن به. */
export function normalizePersonName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    // التشكيلُ والتطويل يسقطان.
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** أهما اسمٌ واحد؟ والفراغُ لا يطابق شيئاً — ولا نفسَه. */
export function samePersonName(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizePersonName(a);
  if (!left) return false;
  return left === normalizePersonName(b);
}
