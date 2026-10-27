"use server";

/**
 * إعداداتُ صفحة الطلبات المالية: نسبةُ الضريبة وأنواعُ الطلب.
 *
 * وهي خلف `manage_financial_settings` وحدها — لا الصفحةُ ولا الرفعُ خلفها.
 * والنتائجُ تُردّ كائناتٍ لا تُرمى استثناءات، كما في حالات الخطة
 * الاستراتيجية: اللوحةُ تبقى مفتوحةً والخطأُ يُقرأ في موضعه.
 */

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { VAT_RATE_SETTING_KEY, isValidVatRate } from "@/lib/financialRequest";

const PAGE = "/main/financial-requests";

type Result = { error?: string };

const message = (e: unknown) => (e instanceof Error ? e.message : "تعذّر إكمال العملية");

async function requireSettings() {
  const session = await getSession();
  if (!session?.id) throw new Error("غير مصرح");
  if (!hasPermission(session.role, session.permissions || [], "manage_financial_settings")) {
    throw new Error("غير مصرح");
  }
  return session;
}

/** الأنواعُ كلُّها — المعطَّلةُ معها — وعددُ ما استُعمل منها. */
export async function listFinancialTypes() {
  await requireSettings();
  const types = await prisma.financialRequestType.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      order: true,
      isActive: true,
      _count: { select: { requests: true } },
    },
  });
  return types.map((t) => ({
    id: t.id,
    name: t.name,
    order: t.order,
    isActive: t.isActive,
    usage: t._count.requests,
  }));
}

// ── نسبة الضريبة ────────────────────────────────────────────────────────────

/**
 * ضبطُ النسبة في الإعداد العام.
 *
 * ولا تمسّ طلباً مرفوعاً: النسبةُ مثبَّتةٌ في صفّه، فما اعتُمد بخمسة عشر
 * يبقى عليها ولو صارت النسبةُ غداً خمسة.
 */
export async function setVatRate(value: string | number): Promise<Result> {
  try {
    await requireSettings();
    if (!isValidVatRate(value)) return { error: "النسبة يجب أن تكون بين صفر ومئة" };

    const rate = Math.round(Number(value) * 100) / 100;
    await prisma.globalSetting.upsert({
      where: { key: VAT_RATE_SETTING_KEY },
      create: { key: VAT_RATE_SETTING_KEY, value: rate },
      update: { value: rate },
    });
    revalidatePath(PAGE);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

// ── أنواع الطلب ─────────────────────────────────────────────────────────────

export async function addFinancialType(name: string): Promise<Result & { reactivated?: boolean }> {
  try {
    await requireSettings();
    const value = name.trim();
    if (!value) return { error: "اسم النوع مطلوب" };
    if (value.length > 60) return { error: "اسم النوع طويل جداً" };

    // الاسمُ فريدٌ في الجدول، والمعطَّلُ يبقى فيه. فإضافةُ اسمٍ معطَّلٍ
    // إعادةُ تفعيلٍ لا اصطدامُ مفتاحٍ فريد — وهو ما يقصده من كتبه.
    const clash = await prisma.financialRequestType.findUnique({ where: { name: value } });
    if (clash) {
      if (clash.isActive) return { error: "يوجد نوعٌ بهذا الاسم" };
      await prisma.financialRequestType.update({ where: { id: clash.id }, data: { isActive: true } });
      revalidatePath(PAGE);
      return { reactivated: true };
    }

    const last = await prisma.financialRequestType.findFirst({ orderBy: { order: "desc" } });
    await prisma.financialRequestType.create({
      data: { name: value, order: (last?.order ?? 0) + 1 },
    });
    revalidatePath(PAGE);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/**
 * تعديلُ المسمّى — ولا يمسّ طلباً قائماً.
 *
 * فكلُّ طلبٍ يحمل `typeLabel` وقت رفعه: الوثيقةُ المعتمَدة لا يُعاد كتابةُ
 * نوعها بعد ختمها. وهذا يخالف حالاتِ الخطة الاستراتيجية — إذ تلك حالةٌ
 * راهنةٌ يتبعها حاملوها، وهذا سِجلّ.
 */
export async function renameFinancialType(id: string, name: string): Promise<Result> {
  try {
    await requireSettings();
    const value = name.trim();
    if (!value) return { error: "اسم النوع مطلوب" };
    if (value.length > 60) return { error: "اسم النوع طويل جداً" };

    const current = await prisma.financialRequestType.findUnique({ where: { id } });
    if (!current) return { error: "نوعٌ غير موجود" };

    if (value !== current.name) {
      const clash = await prisma.financialRequestType.findUnique({ where: { name: value } });
      if (clash) return { error: "يوجد نوعٌ بهذا الاسم" };
    }

    await prisma.financialRequestType.update({ where: { id }, data: { name: value } });
    revalidatePath(PAGE);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/** الحذفُ تعطيلٌ إن كان النوع مستعملاً: اسمٌ في وثيقةٍ معتمَدة لا يختفي. */
export async function removeFinancialType(id: string): Promise<Result & { deactivated?: boolean }> {
  try {
    await requireSettings();
    const type = await prisma.financialRequestType.findUnique({ where: { id } });
    if (!type) return { error: "نوعٌ غير موجود" };

    const inUse = await prisma.financialRequest.count({ where: { typeId: id } });
    if (inUse > 0) {
      await prisma.financialRequestType.update({ where: { id }, data: { isActive: false } });
      revalidatePath(PAGE);
      return { deactivated: true };
    }

    await prisma.financialRequestType.delete({ where: { id } });
    revalidatePath(PAGE);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function reactivateFinancialType(id: string): Promise<Result> {
  try {
    await requireSettings();
    await prisma.financialRequestType.update({ where: { id }, data: { isActive: true } });
    revalidatePath(PAGE);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/**
 * إعادةُ الترتيب بتبديل رتبتين في معاملةٍ واحدة.
 *
 * والجارُ يُقرأ من القائمة المرتَّبة لا بحسابِ `order ± 1`: الرتبُ قد تتباعد
 * بعد حذفٍ، فالجوارُ موضعٌ في القائمة لا فرقٌ في الرقم.
 */
export async function moveFinancialType(id: string, direction: "up" | "down"): Promise<Result> {
  try {
    await requireSettings();
    const all = await prisma.financialRequestType.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, order: true },
    });
    const index = all.findIndex((t) => t.id === id);
    if (index < 0) return { error: "نوعٌ غير موجود" };

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= all.length) return {};

    const next = [...all];
    [next[index], next[target]] = [next[target], next[index]];

    // ترقيمٌ متتالٍ لا تبديلُ رقمين: رتبتان متساويتان — وهو ممكنٌ في صفوفٍ
    // بُذرت أو أُضيفت قبل أن يُرتَّب شيء — يجعل التبديلَ لا أثرَ له.
    await prisma.$transaction(
      next.map((t, i) =>
        prisma.financialRequestType.update({ where: { id: t.id }, data: { order: i + 1 } })
      )
    );
    revalidatePath(PAGE);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}
