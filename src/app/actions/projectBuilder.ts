"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guards";
import { logAudit } from "@/lib/auditLog";
import { normalizeProjectBuilderOptions, type ProjectBuilderOptions } from "@/lib/projectBuilder";

const OPTIONS_KEY = "PROJECT_BUILDER_OPTIONS";

// ── قيود المحتوى ومحاور الوثيقة المعيارية ───────────────────────────────────

/** لمستعملي الأداة: قيود المحتوى فقط، لرسم مربّعات الاختيار عند الإنشاء. */
export async function getProjectBuilderExclusions() {
  await requirePermission("use_project_builder");
  try {
    const record = await prisma.globalSetting.findUnique({ where: { key: OPTIONS_KEY } });
    const options = normalizeProjectBuilderOptions(record?.value);
    return { success: true as const, exclusions: options.exclusions };
  } catch (error: any) {
    return { success: false as const, error: error.message, exclusions: [] };
  }
}

/** للمتحكم: القيود والمحاور معاً، لمحرّر الإعدادات. */
export async function getProjectBuilderOptions(): Promise<ProjectBuilderOptions> {
  await requirePermission("manage_project_builder");
  try {
    const record = await prisma.globalSetting.findUnique({ where: { key: OPTIONS_KEY } });
    if (record?.value) return normalizeProjectBuilderOptions(record.value);
  } catch (error) {
    console.error("Error fetching project builder options:", error);
  }
  return { exclusions: [], sections: [] };
}

export async function updateProjectBuilderOptions(options: ProjectBuilderOptions) {
  let session;
  try {
    session = await requirePermission("manage_project_builder");
  } catch {
    return { success: false, error: "غير مصرح" };
  }

  const clean = normalizeProjectBuilderOptions(options) as unknown as Prisma.InputJsonValue;

  try {
    await prisma.globalSetting.upsert({
      where: { key: OPTIONS_KEY },
      update: { value: clean },
      create: { key: OPTIONS_KEY, value: clean },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "UPDATE",
      targetType: "GlobalSetting",
      targetId: OPTIONS_KEY,
    });

    revalidatePath("/main/project-builder/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── البرومبت العام، بتاريخ إصداراته ──────────────────────────────────────────

/** قائمة خفيفة بإصدارات البرومبت — بلا النصّ الكامل، للعرض في سجل التعديلات. */
export async function listProjectBuilderPromptVersions() {
  await requirePermission("manage_project_builder");
  try {
    const versions = await prisma.projectBuilderPromptVersion.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, createdByName: true, note: true, template: true },
    });
    return {
      success: true as const,
      versions: versions.map((v) => ({
        id: v.id,
        createdAt: v.createdAt,
        createdByName: v.createdByName,
        note: v.note,
        length: v.template.length,
      })),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message, versions: [] };
  }
}

/** النصّ الكامل لإصدار واحد — عند عرضه أو استعادته. */
export async function getProjectBuilderPromptVersionContent(id: string) {
  await requirePermission("manage_project_builder");
  try {
    const version = await prisma.projectBuilderPromptVersion.findUnique({ where: { id } });
    if (!version) return { success: false as const, error: "الإصدار غير موجود" };
    return { success: true as const, template: version.template };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

/**
 * يحفظ البرومبت — بإضافة إصدار جديد، لا بالكتابة فوق إصدار قائم. فيبقى كل
 * إصدار سابق قابلاً للاستعراض والاستعادة، ومربوطاً بمن حفظه ومتى.
 */
export async function saveProjectBuilderPrompt(template: string, note?: string) {
  let session;
  try {
    session = await requirePermission("manage_project_builder");
  } catch {
    return { success: false, error: "غير مصرح" };
  }

  const clean = template.trim();
  if (!clean) return { success: false, error: "البرومبت لا يمكن أن يكون فارغاً" };

  try {
    const version = await prisma.projectBuilderPromptVersion.create({
      data: { template: clean, createdById: session.id, createdByName: session.name, note: note?.trim() || null },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "CREATE",
      targetType: "ProjectBuilderPromptVersion",
      targetId: version.id,
    });

    revalidatePath("/main/project-builder/settings");
    return { success: true, version };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** يستعيد إصداراً قديماً — بإضافة إصدار جديد بمحتواه، لا بحذف ما بعده. */
export async function restoreProjectBuilderPromptVersion(id: string) {
  let session;
  try {
    session = await requirePermission("manage_project_builder");
  } catch {
    return { success: false, error: "غير مصرح" };
  }

  try {
    const old = await prisma.projectBuilderPromptVersion.findUnique({ where: { id } });
    if (!old) return { success: false, error: "الإصدار غير موجود" };

    const fmt = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(old.createdAt);
    const version = await prisma.projectBuilderPromptVersion.create({
      data: {
        template: old.template,
        createdById: session.id,
        createdByName: session.name,
        note: `استعادة إصدار بتاريخ ${fmt}`,
      },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "RESTORE",
      targetType: "ProjectBuilderPromptVersion",
      targetId: version.id,
      metadata: { restoredFrom: id },
    });

    revalidatePath("/main/project-builder/settings");
    return { success: true, version };
  } catch (error: any) {
    return { success: false, error: error.message };
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
