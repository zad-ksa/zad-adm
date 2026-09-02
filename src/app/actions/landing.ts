"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guards";
import { logAudit } from "@/lib/auditLog";
import {
  DEFAULT_LANDING_CONFIG,
  normalizeLandingConfig,
  type LandingConfig,
} from "@/lib/landing";

const LANDING_KEY = "LANDING_PAGE";

/**
 * قراءة عامة — تُستدعى من الصفحة الرئيسية العامة (src/app/page.tsx) بلا حارس.
 * أي خطأ يعيد الافتراضات كي لا تسقط الصفحة العامة بسبب إعداد تالف أو قاعدة معطّلة.
 */
export async function getLandingConfig(): Promise<LandingConfig> {
  try {
    const record = await prisma.globalSetting.findUnique({
      where: { key: LANDING_KEY },
    });
    if (record?.value) {
      return normalizeLandingConfig(record.value);
    }
  } catch (error) {
    console.error("Error fetching landing config:", error);
  }
  return DEFAULT_LANDING_CONFIG;
}

export async function updateLandingConfig(config: LandingConfig) {
  let session;
  try {
    session = await requirePermission("manage_landing");
  } catch {
    return { success: false, error: "غير مصرح" };
  }

  // يُطبَّع قبل الحفظ فلا يدخل شكلٌ غير متوقّع إلى القاعدة.
  const clean = normalizeLandingConfig(config) as unknown as Prisma.InputJsonValue;

  try {
    await prisma.globalSetting.upsert({
      where: { key: LANDING_KEY },
      update: { value: clean },
      create: { key: LANDING_KEY, value: clean },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "UPDATE",
      targetType: "GlobalSetting",
      targetId: LANDING_KEY,
    });

    revalidatePath("/");
    revalidatePath("/main/landing-settings/preview");

    return { success: true };
  } catch (error) {
    console.error("Error updating landing config:", error);
    return { success: false, error: "فشل حفظ إعدادات الواجهة الرئيسية" };
  }
}
