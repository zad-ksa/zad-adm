"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guards";
import { logAudit } from "@/lib/auditLog";
import {
  DEFAULT_PROJECT_BUILDER_SYSTEM_PROMPT,
  normalizeProjectBuilderConfig,
  type ProjectBuilderConfig,
} from "@/lib/projectBuilder";

const CONFIG_KEY = "PROJECT_BUILDER_CONFIG";

// ── البرومبت العام ────────────────────────────────────────────────────────────

/** للمتحكم وحده: يقرأ القالب الخام ليحرّره. مستعملو الأداة لا يرونه إطلاقاً. */
export async function getProjectBuilderConfig(): Promise<ProjectBuilderConfig> {
  await requirePermission("manage_project_builder");
  try {
    const record = await prisma.globalSetting.findUnique({ where: { key: CONFIG_KEY } });
    if (record?.value) return normalizeProjectBuilderConfig(record.value);
  } catch (error) {
    console.error("Error fetching project builder config:", error);
  }
  return { systemPromptTemplate: DEFAULT_PROJECT_BUILDER_SYSTEM_PROMPT };
}

export async function updateProjectBuilderConfig(config: ProjectBuilderConfig) {
  let session;
  try {
    session = await requirePermission("manage_project_builder");
  } catch {
    return { success: false, error: "غير مصرح" };
  }

  const clean = normalizeProjectBuilderConfig(config) as unknown as Prisma.InputJsonValue;

  try {
    await prisma.globalSetting.upsert({
      where: { key: CONFIG_KEY },
      update: { value: clean },
      create: { key: CONFIG_KEY, value: clean },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "UPDATE",
      targetType: "GlobalSetting",
      targetId: CONFIG_KEY,
    });

    revalidatePath("/main/project-builder/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating project builder config:", error);
    return { success: false, error: "فشل حفظ إعدادات الأداة" };
  }
}

// ── الجمعيات وملفّاتها الثابتة ────────────────────────────────────────────────

/** كل الجمعيات، لمنتقي الأداة — تتحدّث تلقائياً مع كل جمعية تُضاف أو تُحذف. */
export async function getProjectBuilderCharities() {
  await requirePermission("use_project_builder");
  try {
    const charities = await prisma.charity.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { success: true as const, charities };
  } catch (error: any) {
    return { success: false as const, error: error.message, charities: [] };
  }
}

/** المعلومات الثابتة لجمعية واحدة — تُستعمل لتعبئة النموذج تلقائياً عند اختيارها. */
export async function getProjectBuilderCharityProfile(charityId: string) {
  await requirePermission("use_project_builder");
  try {
    const profile = await prisma.projectBuilderCharityProfile.findUnique({ where: { charityId } });
    return { success: true as const, profile };
  } catch (error: any) {
    return { success: false as const, error: error.message, profile: null };
  }
}

/** للمتحكم: كل الجمعيات مع حالة ملفّها — ليرى مَن أُعدّت له البيانات ومَن لا. */
export async function listProjectBuilderCharityProfiles() {
  await requirePermission("manage_project_builder");
  try {
    const charities = await prisma.charity.findMany({
      select: { id: true, name: true, projectBuilderProfile: true },
      orderBy: { name: "asc" },
    });
    return { success: true as const, charities };
  } catch (error: any) {
    return { success: false as const, error: error.message, charities: [] };
  }
}

export async function upsertProjectBuilderCharityProfile(
  charityId: string,
  data: { vision: string; mission: string; strategicGoals: string; field: string; city: string }
) {
  let session;
  try {
    session = await requirePermission("manage_project_builder");
  } catch {
    return { success: false, error: "غير مصرح" };
  }

  try {
    const profile = await prisma.projectBuilderCharityProfile.upsert({
      where: { charityId },
      update: { ...data, updatedById: session.id },
      create: { charityId, ...data, updatedById: session.id },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "UPDATE",
      targetType: "ProjectBuilderCharityProfile",
      targetId: charityId,
    });

    revalidatePath("/main/project-builder/settings");
    return { success: true, profile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProjectBuilderCharityProfile(charityId: string) {
  let session;
  try {
    session = await requirePermission("manage_project_builder");
  } catch {
    return { success: false, error: "غير مصرح" };
  }

  try {
    await prisma.projectBuilderCharityProfile.deleteMany({ where: { charityId } });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "DELETE",
      targetType: "ProjectBuilderCharityProfile",
      targetId: charityId,
    });

    revalidatePath("/main/project-builder/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
