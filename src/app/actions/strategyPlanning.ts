"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { assertCharityAccess } from "@/lib/access";
import { logAudit } from "@/lib/auditLog";
import { DEFAULT_PERSPECTIVES } from "@/lib/strategyOptions";

/**
 * أفعال نظام التخطيط الاستراتيجي — الخطة في docs/خطة-نظام-التخطيط-الاستراتيجي.md
 *
 * والإدخال لموظف زاد في هذه المرحلة: كل فعلٍ هنا يتحقّق من صلاحية
 * `manage_strategy` ومن أن الجمعية مُسندةٌ إلى الموظف. ولبوّابة الجمعية
 * لاحقاً مفتاحان على `Charity` مُهيَّآن ولم يُستعملا بعد.
 */

type Result = { error?: string };

async function requireStrategyAccess(charityId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_strategy")) {
    throw new Error("FORBIDDEN");
  }
  await assertCharityAccess(session.id, session.role, charityId);
  return session;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_strategy")) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/**
 * حالة الخطة الاستراتيجية للجمعية — اختيارٌ يدويٌّ لا محسوب.
 *
 * ويُخزَّن نصُّ الحالة لا مفتاحها: حذفُ خيارٍ من القائمة لاحقاً لا يُفرِّغ حالة
 * جمعيةٍ اختارته. ويُسجَّل كل تغييرٍ في سجل التدقيق، فحالةُ الخطة قولٌ على
 * الجمعية يُسأل عنه مَن قاله.
 */
export async function setStrategyStatus(charityId: string, status: string | null): Promise<Result> {
  try {
    const session = await requireStrategyAccess(charityId);

    const value = status?.trim() || null;
    if (value) {
      const option = await prisma.strategyStatusOption.findFirst({
        where: { name: value, isActive: true },
        select: { id: true },
      });
      if (!option) return { error: "حالةٌ غير موجودة في القائمة" };
    }

    const charity = await prisma.charity.update({
      where: { id: charityId },
      data: { strategyStatus: value, strategyStatusUpdatedAt: value ? new Date() : null },
      select: { name: true },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "STRATEGY_STATUS_SET",
      targetType: "Charity",
      targetId: charityId,
      metadata: { charityName: charity.name, status: value },
    });

    revalidatePath(`/main/strategy/${encodeURIComponent(charity.name)}`);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

// ── إدارة قائمة الحالات ─────────────────────────────────────────────────────
// القائمة بياناتٌ لا ثوابت في الكود، فتُدار من حيث تُستعمل: نافذةٌ في صفحة
// الاستراتيجية نفسها، لا شاشةٌ في الإعدادات يُنسى مكانها.

export async function addStatusOption(name: string, tone: string): Promise<Result> {
  try {
    await requireAdmin();
    const value = name.trim();
    if (!value) return { error: "اسم الحالة مطلوب" };
    if (value.length > 60) return { error: "اسم الحالة طويل جداً" };
    if (!TONES.includes(tone)) return { error: "نبرةٌ غير معروفة" };

    const clash = await prisma.strategyStatusOption.findUnique({ where: { name: value } });
    if (clash) return { error: "توجد حالةٌ بهذا الاسم" };

    const last = await prisma.strategyStatusOption.findFirst({ orderBy: { order: "desc" } });
    await prisma.strategyStatusOption.create({
      data: { name: value, tone, order: (last?.order ?? 0) + 1 },
    });
    revalidatePath("/main/strategy", "layout");
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function updateStatusOption(id: string, name: string, tone: string): Promise<Result> {
  try {
    await requireAdmin();
    const value = name.trim();
    if (!value) return { error: "اسم الحالة مطلوب" };
    if (!TONES.includes(tone)) return { error: "نبرةٌ غير معروفة" };

    const current = await prisma.strategyStatusOption.findUnique({ where: { id } });
    if (!current) return { error: "حالةٌ غير موجودة" };

    const clash = await prisma.strategyStatusOption.findFirst({ where: { name: value, NOT: { id } } });
    if (clash) return { error: "توجد حالةٌ بهذا الاسم" };

    await prisma.strategyStatusOption.update({ where: { id }, data: { name: value, tone } });

    // الجمعيات تحمل نصَّ الحالة، فتغييرُ الاسم يتبعه تحديثُ من اختارها — وإلا
    // صارت حالتهم اسماً لا وجود له في القائمة.
    if (current.name !== value) {
      await prisma.charity.updateMany({
        where: { strategyStatus: current.name },
        data: { strategyStatus: value },
      });
    }

    revalidatePath("/main/strategy", "layout");
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/**
 * الحذف تعطيلٌ لا إزالة حين تستعملها جمعية: إزالةُ الصف تترك حالةَ تلك الجمعية
 * نصّاً بلا خيارٍ يقابله في القائمة، فتختفي من المُحدِّد بلا بيان.
 */
export async function removeStatusOption(id: string): Promise<Result & { deactivated?: boolean }> {
  try {
    await requireAdmin();
    const option = await prisma.strategyStatusOption.findUnique({ where: { id } });
    if (!option) return { error: "حالةٌ غير موجودة" };

    const inUse = await prisma.charity.count({ where: { strategyStatus: option.name } });
    if (inUse > 0) {
      await prisma.strategyStatusOption.update({ where: { id }, data: { isActive: false } });
      revalidatePath("/main/strategy", "layout");
      return { deactivated: true };
    }

    await prisma.strategyStatusOption.delete({ where: { id } });
    revalidatePath("/main/strategy", "layout");
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function reactivateStatusOption(id: string): Promise<Result> {
  try {
    await requireAdmin();
    await prisma.strategyStatusOption.update({ where: { id }, data: { isActive: true } });
    revalidatePath("/main/strategy", "layout");
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}


// ── دليل الأهداف والمؤشرات ──────────────────────────────────────────────────
// الهيكل ثلاث طبقات: المحور (البعد) ← الهدف ← المؤشر. وكلُّ فعلٍ هنا يتحقّق من
// أن الجمعية صاحبة الصف مُسندةٌ إلى الموظف — فالوصول يُتحقَّق من الصف لا من
// المسار الذي جاء منه الطلب.

const POLARITIES = ["UP", "DOWN"];

async function charityOfPerspective(perspectiveId: string) {
  const row = await prisma.strategyPerspective.findUnique({
    where: { id: perspectiveId },
    select: { charityId: true },
  });
  if (!row) throw new Error("بعدٌ غير موجود");
  return row.charityId;
}

async function charityOfObjective(objectiveId: string) {
  const row = await prisma.strategyObjective.findUnique({
    where: { id: objectiveId },
    select: { perspective: { select: { charityId: true } } },
  });
  if (!row) throw new Error("هدفٌ غير موجود");
  return row.perspective.charityId;
}

async function charityOfIndicator(indicatorId: string) {
  const row = await prisma.strategyIndicator.findUnique({
    where: { id: indicatorId },
    select: { objective: { select: { perspective: { select: { charityId: true } } } } },
  });
  if (!row) throw new Error("مؤشرٌ غير موجود");
  return row.objective.perspective.charityId;
}

/** يُبطل الصفحة بعد كل كتابة: الجداول تُقرأ في الرسم، فلا بدّ من إعادته. */
async function revalidateGuide(charityId: string) {
  const charity = await prisma.charity.findUnique({ where: { id: charityId }, select: { name: true } });
  if (charity) revalidatePath(`/main/strategy/${encodeURIComponent(charity.name)}`, "layout");
}

/**
 * إنشاء الأبعاد الخمسة دفعةً واحدة — لجمعيةٍ يبدأ دليلها فارغاً.
 *
 * ولا يُكرّر ما وُجد: يُطابق بالبادئة، فتشغيلُه مرّتين لا يُنشئ عشرة أبعاد.
 */
export async function bootstrapPerspectives(charityId: string): Promise<Result & { created?: number }> {
  try {
    await requireStrategyAccess(charityId);

    const existing = await prisma.strategyPerspective.findMany({
      where: { charityId },
      select: { prefix: true },
    });
    const have = new Set(existing.map((p) => p.prefix));
    const missing = DEFAULT_PERSPECTIVES.filter((p) => !have.has(p.prefix));
    if (missing.length === 0) return { created: 0 };

    await prisma.strategyPerspective.createMany({
      data: missing.map((p) => ({
        charityId,
        name: p.name,
        prefix: p.prefix,
        order: DEFAULT_PERSPECTIVES.findIndex((d) => d.prefix === p.prefix) + 1,
      })),
    });

    await revalidateGuide(charityId);
    return { created: missing.length };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function savePerspective(input: {
  id?: string;
  charityId: string;
  name: string;
  prefix: string;
}): Promise<Result> {
  try {
    await requireStrategyAccess(input.charityId);

    const name = input.name.trim();
    const prefix = input.prefix.trim();
    if (!name) return { error: "اسم البعد مطلوب" };
    if (!prefix) return { error: "رمز البعد مطلوب" };
    if (prefix.length > 4) return { error: "الرمز حرفٌ أو حرفان" };

    const clash = await prisma.strategyPerspective.findFirst({
      where: { charityId: input.charityId, prefix, ...(input.id ? { NOT: { id: input.id } } : {}) },
      select: { id: true },
    });
    if (clash) return { error: "يوجد بعدٌ بهذا الرمز" };

    if (input.id) {
      await prisma.strategyPerspective.update({ where: { id: input.id }, data: { name, prefix } });
    } else {
      const last = await prisma.strategyPerspective.findFirst({
        where: { charityId: input.charityId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      await prisma.strategyPerspective.create({
        data: { charityId: input.charityId, name, prefix, order: (last?.order ?? 0) + 1 },
      });
    }

    await revalidateGuide(input.charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/**
 * حذف بعدٍ يحذف أهدافه ومؤشراتها ونتائجها (Cascade في المخطّط). ولذلك يُعاد
 * عددُ ما سيُحذف قبل التنفيذ ليُعرض في حوار التأكيد — حذفٌ صامتٌ لثلاثين مؤشراً
 * ليس تأكيداً.
 */
export async function countPerspectiveChildren(perspectiveId: string) {
  const [objectives, indicators] = await Promise.all([
    prisma.strategyObjective.count({ where: { perspectiveId } }),
    prisma.strategyIndicator.count({ where: { objective: { perspectiveId } } }),
  ]);
  return { objectives, indicators };
}

export async function deletePerspective(id: string): Promise<Result> {
  try {
    const charityId = await charityOfPerspective(id);
    await requireStrategyAccess(charityId);
    await prisma.strategyPerspective.delete({ where: { id } });
    await revalidateGuide(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function saveObjective(input: {
  id?: string;
  perspectiveId: string;
  code: string;
  name: string;
  description?: string;
}): Promise<Result> {
  try {
    const charityId = await charityOfPerspective(input.perspectiveId);
    await requireStrategyAccess(charityId);

    const code = input.code.trim();
    const name = input.name.trim();
    if (!code) return { error: "رمز الهدف مطلوب" };
    if (!name) return { error: "نصّ الهدف مطلوب" };

    const clash = await prisma.strategyObjective.findFirst({
      where: { perspectiveId: input.perspectiveId, code, ...(input.id ? { NOT: { id: input.id } } : {}) },
      select: { id: true },
    });
    if (clash) return { error: "يوجد هدفٌ بهذا الرمز في البعد نفسه" };

    const data = { code, name, description: input.description?.trim() || null };

    if (input.id) {
      await prisma.strategyObjective.update({ where: { id: input.id }, data });
    } else {
      const last = await prisma.strategyObjective.findFirst({
        where: { perspectiveId: input.perspectiveId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      await prisma.strategyObjective.create({
        data: { ...data, perspectiveId: input.perspectiveId, order: (last?.order ?? 0) + 1 },
      });
    }

    await revalidateGuide(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteObjective(id: string): Promise<Result> {
  try {
    const charityId = await charityOfObjective(id);
    await requireStrategyAccess(charityId);
    await prisma.strategyObjective.delete({ where: { id } });
    await revalidateGuide(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export type IndicatorInput = {
  id?: string;
  objectiveId: string;
  code: string;
  name: string;
  description?: string;
  unit?: string;
  formula?: string;
  frequency?: string;
  polarity?: string;
  cumulative?: boolean;
  owner?: string;
  execOwner?: string;
  measureOwner?: string;
  baseline?: string;
};

export async function saveIndicator(input: IndicatorInput): Promise<Result> {
  try {
    const charityId = await charityOfObjective(input.objectiveId);
    await requireStrategyAccess(charityId);

    const code = input.code.trim();
    const name = input.name.trim();
    if (!code) return { error: "رمز المؤشر مطلوب" };
    if (!name) return { error: "نصّ المؤشر مطلوب" };
    const polarity = input.polarity && POLARITIES.includes(input.polarity) ? input.polarity : "UP";

    const baseline = parseDecimal(input.baseline);
    if (baseline === "invalid") return { error: "خط الأساس يجب أن يكون رقماً" };

    const clash = await prisma.strategyIndicator.findFirst({
      where: { objectiveId: input.objectiveId, code, ...(input.id ? { NOT: { id: input.id } } : {}) },
      select: { id: true },
    });
    if (clash) return { error: "يوجد مؤشرٌ بهذا الرمز في الهدف نفسه" };

    const data = {
      code,
      name,
      description: input.description?.trim() || null,
      unit: input.unit?.trim() || null,
      formula: input.formula?.trim() || null,
      frequency: input.frequency?.trim() || null,
      polarity,
      cumulative: input.cumulative ?? false,
      owner: input.owner?.trim() || null,
      execOwner: input.execOwner?.trim() || null,
      measureOwner: input.measureOwner?.trim() || null,
      baseline,
    };

    if (input.id) {
      await prisma.strategyIndicator.update({ where: { id: input.id }, data });
    } else {
      const last = await prisma.strategyIndicator.findFirst({
        where: { objectiveId: input.objectiveId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      await prisma.strategyIndicator.create({
        data: { ...data, objectiveId: input.objectiveId, order: (last?.order ?? 0) + 1 },
      });
    }

    await revalidateGuide(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteIndicator(id: string): Promise<Result> {
  try {
    const charityId = await charityOfIndicator(id);
    await requireStrategyAccess(charityId);
    await prisma.strategyIndicator.delete({ where: { id } });
    await revalidateGuide(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/** فراغٌ يعني «غير محدَّد» لا صفراً: صفرُ خطِّ أساسٍ قولٌ، والفراغ سكوت. */
function parseDecimal(value: string | undefined): number | null | "invalid" {
  const raw = value?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : "invalid";
}

const TONES = ["muted", "warn", "good", "danger"];

function message(e: unknown) {
  const raw = e instanceof Error ? e.message : "تعذّر إتمام العملية";
  if (raw === "UNAUTHORIZED") return "الجلسة منتهية — أعد الدخول";
  if (raw === "FORBIDDEN") return "لا تملك صلاحية إدارة الاستراتيجية";
  if (raw === "FORBIDDEN_CHARITY") return "هذه الجمعية غير مُسندةٍ إليك";
  return raw;
}
