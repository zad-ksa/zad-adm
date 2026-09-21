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
