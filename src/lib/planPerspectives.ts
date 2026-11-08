/**
 * منظوراتُ الخطة التي تُرفع منها المنح.
 *
 * مبادرةُ الخطة التشغيلية تُنسَب إلى هدفٍ، والهدفُ إلى منظور (بطاقةُ الأداء
 * المتوازن: المستفيدون · أصحاب المصلحة · المالي · العمليات الداخلية · التعلّم
 * والنمو). والمنحُ تُرفع لما يُنفَّذ للمستفيد أو في عمليات الجمعية الداخلية، لا
 * لأهداف التعلّم والنمو ولا للبعد المالي.
 *
 * **والمطابقةُ ببادئة الرمز لا بالاسم.** الاسمُ يُكتب في القاعدة بهجاءين —
 * «المستفيدون» في سبع جمعيات و«المستفيدين» في واحدة — فمُرشِّحٌ على الاسم
 * يُسقط جمعيةً بلا أن يقول إنّه أسقطها. والبادئةُ (`س` و`ل`) عمودٌ محروسٌ
 * بـ`@@unique([charityId, prefix])`، فهي المُعرِّفُ الثابت للمنظور في كل جمعية.
 */

/** `س` المستفيدون · `ل` العمليات الداخلية. */
export const GRANT_PERSPECTIVE_PREFIXES = ["س", "ل"] as const;

export type GrantPerspectivePrefix = (typeof GRANT_PERSPECTIVE_PREFIXES)[number];

export function isGrantPerspective(prefix: string | null | undefined): boolean {
  return !!prefix && (GRANT_PERSPECTIVE_PREFIXES as readonly string[]).includes(prefix);
}
