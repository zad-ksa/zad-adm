/**
 * الإشعارُ الانبثاقيُّ في بوّابة الجمعية: أين يظهر، ومتى، وكم مرّة.
 *
 * منطقٌ خالصٌ يُختبر، ويقرؤه الطرفان: شاشةُ زادٍ التي تكتب الإشعار،
 * والبوّابةُ التي تعرضه — فلا يُكتب موضعٌ لا تعرفه البوّابة، ولا تَعرض
 * البوّابةُ ما لم يحن وقتُه.
 */

export type PopupPage = {
  key: string;
  label: string;
  /** أوّلُ مقطعٍ بعد اسم الجمعية في المسار — و`""` لصفحة البوّابة الأولى. */
  segment: string | null;
};

/**
 * مواضعُ الظهور: مقاطعُ مسارات البوّابة كما هي في `src/app/portal/[name]`.
 *
 * و`ANY` موضعٌ لا مقطعَ له: يظهر في أوّل صفحةٍ تُفتح أيّاً كانت — للتعميم
 * الذي لا يخصّ قسماً.
 */
export const POPUP_PAGES: readonly PopupPage[] = [
  { key: "ANY", label: "أي صفحة في البوابة", segment: null },
  { key: "HOME", label: "الصفحة الرئيسية للبوابة", segment: "" },
  { key: "FUNDRAISING", label: "تنمية الموارد المالية", segment: "fundraising" },
  { key: "SERVICES", label: "الخدمات", segment: "services" },
  { key: "GOVERNANCE", label: "الحوكمة", segment: "governance" },
  { key: "DESIGN_REQUESTS", label: "طلبات التصاميم", segment: "design-requests" },
  { key: "MEDIA", label: "الخطة الإعلامية", segment: "media" },
  { key: "TEMPLATES", label: "مكتبة النماذج", segment: "templates" },
  { key: "MAIL", label: "البريد", segment: "mail" },
  { key: "HR", label: "الموارد البشرية", segment: "hr" },
  { key: "PROFILE", label: "الملف الشخصي", segment: "profile" },
];

export const POPUP_REPEATS = [
  { value: "ONCE", label: "مرة واحدة لكل مستخدم" },
  { value: "EVERY", label: "في كل زيارة للصفحة" },
] as const;

export type PopupRepeat = (typeof POPUP_REPEATS)[number]["value"];

export function popupRepeatOf(value: string): PopupRepeat {
  return value === "EVERY" ? "EVERY" : "ONCE";
}

export function popupPageLabel(key: string): string {
  return POPUP_PAGES.find((p) => p.key === key)?.label ?? key;
}

export function isPopupPage(key: string): boolean {
  return POPUP_PAGES.some((p) => p.key === key);
}

/**
 * مقطعُ القسم من مسار البوّابة: `/portal/<الجمعية>/<المقطع>/...`.
 *
 * ويُفكّ ترميزُ الاسم أو لا يُفكّ، سيّان: المقطعُ المقروءُ هو الثالث، واسمُ
 * الجمعية قد يحمل مسافاتٍ مُرمَّزة ولا يُنظر فيه هنا.
 */
export function portalPathSegment(pathname: string): string | null {
  const parts = pathname.split("?")[0].split("#")[0].split("/").filter((p) => p !== "");
  if (parts[0] !== "portal" || parts.length < 2) return null;
  return parts[2] ?? "";
}

/** هل يظهر إشعارُ هذا الموضع في هذا المسار؟ */
export function popupMatchesPath(pageKey: string, pathname: string): boolean {
  const segment = portalPathSegment(pathname);
  if (segment === null) return false;
  if (pageKey === "ANY") return true;
  const page = POPUP_PAGES.find((p) => p.key === pageKey);
  if (!page || page.segment === null) return false;
  return page.segment === segment;
}

export type PopupLife = {
  isActive: boolean;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

/**
 * هل الإشعارُ حيٌّ الآن؟ — التفعيلُ ثمّ الفترة.
 *
 * والفترةُ طرفاها اختياريّان: بلا بدايةٍ يبدأ من كتابته، وبلا نهايةٍ يبقى حتى
 * يُعطَّل. و`endsAt` تُقرأ شاملةً لليوم المكتوب؟ لا: هي لحظةٌ كما خُزِّنت —
 * والشاشةُ تكتبها آخرَ اليوم إن أراد كاتبُها يوماً كاملاً.
 */
export function isPopupLive(popup: PopupLife, now: Date): boolean {
  if (!popup.isActive) return false;
  const at = now.getTime();
  if (popup.startsAt && new Date(popup.startsAt).getTime() > at) return false;
  if (popup.endsAt && new Date(popup.endsAt).getTime() < at) return false;
  return true;
}

/** هل تستهدف هذه الجمعيةَ؟ — والفارغةُ تعني الكلّ. */
export function popupTargetsCharity(charityIds: readonly string[], charityId: string): boolean {
  return charityIds.length === 0 || charityIds.includes(charityId);
}
