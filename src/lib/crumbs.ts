import type { Crumb } from "@/components/console/layout";

/**
 * مسار التنقّل لصفحات الجمعية.
 *
 * صفحة الجمعية نفسها هي «الخدمات» (`/main/services-overview/[name]`) — إليها
 * تقود بطاقتها في تبويب الجمعيات. وأقسامها الأخرى (المالية، المنح، الاستراتيجية،
 * الحوكمة) تحتها منطقياً وإن كانت روابطها في مجلداتٍ أخرى. فالسلسلة واحدةٌ لكلها:
 *
 *     الجمعيات / اسم الجمعية / القسم
 */
export function charityHref(name: string) {
  return `/main/services-overview/${encodeURIComponent(name)}`;
}

export function charityCrumbs(name: string, ...tail: Crumb[]): Crumb[] {
  return [
    { label: "الجمعيات", href: "/main/charities" },
    tail.length > 0 ? { label: name, href: charityHref(name) } : { label: name },
    ...tail,
  ];
}

/**
 * مسار التنقّل للكيان الداخلي («شركة زاد»).
 *
 * لا يبدأ بـ«الجمعيات» لأنه ليس منها، ولا يقود إلى صفحة الخدمات لأنه مستثنًى
 * من قوائمها. فاسمه أول الحلقات، ورابطه قسمُه الذي فُتح منه — الاستراتيجية أو
 * تنمية الموارد.
 */
export function internalCrumbs(name: string, sectionHref: string | undefined, ...tail: Crumb[]): Crumb[] {
  return [tail.length > 0 && sectionHref ? { label: name, href: sectionHref } : { label: name }, ...tail];
}

/**
 * يختار السلسلة المناسبة: جمعيةٌ متعاقدة أم كيانٌ داخلي.
 *
 * و`sectionHref` جذرُ القسم للكيان الداخلي — يُهمَل للجمعيات لأن جذرها واحد.
 */
export function entityCrumbs(
  name: string,
  options: { isInternal?: boolean; sectionHref?: string },
  ...tail: Crumb[]
): Crumb[] {
  return options.isInternal
    ? internalCrumbs(name, options.sectionHref, ...tail)
    : charityCrumbs(name, ...tail);
}
