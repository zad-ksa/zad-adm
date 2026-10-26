"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { assertCharityAccess } from "@/lib/access";
import { logAudit } from "@/lib/auditLog";

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

const TONES = ["muted", "warn", "good", "danger"];

function message(e: unknown) {
  const raw = e instanceof Error ? e.message : "تعذّر إتمام العملية";
  if (raw === "UNAUTHORIZED") return "الجلسة منتهية — أعد الدخول";
  if (raw === "FORBIDDEN") return "لا تملك صلاحية إدارة الاستراتيجية";
  if (raw === "FORBIDDEN_CHARITY") return "هذه الجمعية غير مُسندةٍ إليك";
  return raw;
}
