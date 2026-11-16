import { prisma } from "@/lib/db";
import {
  chainForCategory,
  REQUEST_CATEGORIES,
  type CategoryRoutes,
  type RoutableChain,
} from "@/lib/requestCategories";
import type { ChainPurpose } from "@/lib/requestQuery";

/**
 * مسارُ الطلب: أيُّ سلسلةٍ يسلكها طلبُ قسمٍ ما، ومن أوّلُ معتمِديه.
 *
 * **ويُحسب هنا لا في كلِّ مُستدعٍ**: يسأله فعلُ الرفع ليُسنِد الطلبَ إلى
 * سلسلته، وتسأله الصفحةُ لتُظهر للموظف مسارَ قسمه قبل أن يُرسل — ولو حُسب
 * في الموضعين لاختلف المعروضُ عن المسلوك، وهي العلّةُ نفسُها التي جُمع لها
 * `isMediaPlanEnabled` في موضعٍ واحد.
 *
 * **وقواعدُ الاختيار في العدّة** (`chainForCategory`) لا هنا: هي منطقٌ محضٌ
 * يُختبَر، وهذا الملفُّ جَلبُ صفوفٍ لا أكثر.
 */

type LoadedChain = RoutableChain & {
  id: string;
  name: string;
  categories: string[];
  firstApproverId: string | null;
};

/**
 * سلاسلُ غرضٍ ما بأقسامها وأوّل معتمِديها.
 *
 * **وتسقط إلى «بلا أقسام» لا إلى عطب**: عمودُ `categories` قد لا يكون أُنشئ
 * بعد (`prisma/sql/workflow-chain-categories.sql`)، فتعمل الصفحةُ كما كانت
 * تعمل قبله — بالسلسلة المفعَّلة وحدَها — ولا تسقط صفحةُ الاعتمادات كلُّها
 * على هجرةٍ لم تُطبَّق.
 */
async function loadChains(purpose: ChainPurpose): Promise<LoadedChain[]> {
  const shape = {
    where: { purpose },
    orderBy: { createdAt: "asc" as const },
  };
  const steps = { select: { approverId: true }, orderBy: { order: "asc" as const } };

  try {
    const rows = await prisma.workflowChain.findMany({
      ...shape,
      select: { id: true, name: true, isActive: true, categories: true, steps },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      isActive: c.isActive,
      categories: c.categories,
      stepCount: c.steps.length,
      firstApproverId: c.steps[0]?.approverId ?? null,
    }));
  } catch (error) {
    console.error("loadChains", error);
    const rows = await prisma.workflowChain.findMany({
      ...shape,
      select: { id: true, name: true, isActive: true, steps },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      isActive: c.isActive,
      categories: [],
      stepCount: c.steps.length,
      firstApproverId: c.steps[0]?.approverId ?? null,
    }));
  }
}

export type ChainRoute = { chainId: string; chainName: string; approverId: string };

/** مسارُ قسمٍ بعينه — أو `null` إن لم يكن له سلسلةٌ ولا سلسلةٌ افتراضيّة. */
export async function routeForCategory(
  category: string | null | undefined,
  purpose: ChainPurpose = "GENERAL"
): Promise<ChainRoute | null> {
  const chain = chainForCategory(category, await loadChains(purpose));
  // `stepCount > 0` شرطُ الاختيار، فأوّلُ معتمِدٍ موجودٌ قطعاً — والفحصُ
  // لإقناع المترجم لا لحالٍ تقع.
  if (!chain?.firstApproverId) return null;
  return { chainId: chain.id, chainName: chain.name, approverId: chain.firstApproverId };
}

/** مسارُ كلِّ قسمٍ معروف — تقرؤه الصفحةُ لتُسمّي المسارَ تحت القسم المختار. */
export async function categoryRoutes(purpose: ChainPurpose = "GENERAL"): Promise<CategoryRoutes> {
  const chains = await loadChains(purpose);
  const routes: CategoryRoutes = {};
  for (const category of REQUEST_CATEGORIES) {
    const chain = chainForCategory(category.key, chains);
    if (chain) routes[category.key] = { chainName: chain.name };
  }
  return routes;
}
