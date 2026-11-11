import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * خدمات الجمعية تحكم أقسامها.
 *
 * الجمعية «تشملها» خدمةٌ ما إذا كان لها صفٌّ في `Service` بذلك الاسم — وهو
 * نفسه خطّتها في تلك الخدمة (مراحله). فالإسناد صفٌّ، والخطة غير المكتوبة صفٌّ
 * بلا مراحل. ولا جدول آخر.
 *
 * والأقسام التي لها صفحاتٌ باسم الجمعية تُفتح لجمعيةٍ تشملها خدمةُ القسم وحدها:
 * لا تُسرد في الشريط، ولا يُفتح رابطها، ولا تُجلب في قوائمه وحساباته — حتى لمن
 * مُنح الخدمة، فالمنح يحدّد من يعمل في الخدمة، والإسناد يحدّد أيُّ الجمعيات فيها.
 *
 * و«المالية» (`/main/finance/[name]`) ليست منها: صفحتها عقد الجمعية مع زاد
 * وأقساطه، وهو قائمٌ لكل جمعيةٍ متعاقدة أياً كانت خدماتها.
 */
export const SECTION_SERVICES = {
  manage_strategy: "التخطيط الاستراتيجي",
  manage_governance: "الحوكمة",
  manage_resource_development: "التسويق وتنمية الموارد المالية",
  // الخطة الإعلامية: صفحتُها باسم الجمعية، فلا تُفتح لجمعيةٍ لا تشملها خدمةُ
  // «الإعلامية» — ولو لحاملِ الصلاحية، كبقيّة الأقسام.
  manage_media_plan: "الإعلامية",
} as const;

export type SectionPermission = keyof typeof SECTION_SERVICES;

export function sectionService(permission: string): string | null {
  return (SECTION_SERVICES as Record<string, string>)[permission] ?? null;
}

/**
 * صفوف الخدمة في الجمعيات. والاستراتيجية تُعرف أيضاً بقسمها STRATEGY، لأن
 * getStrategyService القديم كان يُنشئها به.
 */
export function serviceRowsWhere(serviceName: string): Prisma.ServiceWhereInput {
  return serviceName === SECTION_SERVICES.manage_strategy
    ? { OR: [{ name: serviceName }, { department: "STRATEGY" }] }
    : { name: serviceName };
}

/**
 * الكيان الداخلي («شركة زاد») يبقى حيث ظهوره مقصود (انظر charityScope)، ولا
 * خدمات له: خدمات زاد تُقدَّم للجمعيات، لا لنفسها.
 */
export async function charityHasService(charityId: string, serviceName: string) {
  const [charity, row] = await Promise.all([
    prisma.charity.findUnique({ where: { id: charityId }, select: { isInternal: true } }),
    prisma.service.findFirst({ where: { charityId, ...serviceRowsWhere(serviceName) }, select: { id: true } }),
  ]);
  return !!charity?.isInternal || !!row;
}

/** شرط الجمعيات التي تشملها الخدمة — يُضمّ إلى شرط الإسناد. */
export function charitiesWithServiceWhere(serviceName: string): Prisma.CharityWhereInput {
  return { OR: [{ isInternal: true }, { services: { some: serviceRowsWhere(serviceName) } }] };
}
