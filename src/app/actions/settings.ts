"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { DEFAULT_ROLE_LABELS } from "@/lib/constants";

import { isAdmin } from "@/lib/permissions";

async function assertAdmin() {
  const session = await getSession();
  if (!session || !(isAdmin(session.role) || session.permissions?.includes("developer_mode"))) {
    throw new Error("غير مصرح");
  }
  return session;
}

// ── TimelineConfig ──────────────────────────────────────────────────────────

export async function getTimelineConfigs() {
  const rows = await prisma.timelineConfig.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.timelineType] = r.displayName;
  return map;
}

export async function updateTimelineDisplayName(timelineType: string, displayName: string) {
  await assertAdmin();
  await prisma.timelineConfig.upsert({
    where: { timelineType },
    update: { displayName },
    create: { timelineType, displayName },
  });
  revalidatePath("/main/services-overview");
  revalidatePath("/charity/[name]/services", "page");
  revalidatePath("/charity/[name]/strategy", "page");
  revalidatePath("/charity/[name]/governance", "page");
  revalidatePath("/charity/[name]/finance", "page");
  return { success: true };
}

// ── DefaultStage ────────────────────────────────────────────────────────────

export async function getDefaultStages(timelineType: string) {
  return prisma.defaultStage.findMany({
    where: { timelineType },
    orderBy: { order: "asc" },
  });
}

export async function addDefaultStage(timelineType: string, name: string, description?: string) {
  await assertAdmin();
  const last = await prisma.defaultStage.findFirst({
    where: { timelineType },
    orderBy: { order: "desc" },
  });
  return prisma.defaultStage.create({
    data: { timelineType, name, description: description || null, order: (last?.order ?? 0) + 1 },
  });
}

export async function updateDefaultStage(id: string, name: string, description?: string) {
  await assertAdmin();
  return prisma.defaultStage.update({
    where: { id },
    data: { name, description: description || null },
  });
}

export async function deleteDefaultStage(id: string) {
  await assertAdmin();
  return prisma.defaultStage.delete({ where: { id } });
}

export async function reorderDefaultStages(timelineType: string, orderedIds: string[]) {
  await assertAdmin();
  await Promise.all(
    orderedIds.map((id, idx) =>
      prisma.defaultStage.update({ where: { id }, data: { order: idx + 1 } })
    )
  );
  return { success: true };
}

// ── Role Labels ─────────────────────────────────────────────────────────────

export async function getRoleLabels(): Promise<Record<string, string>> {
  try {
    const roles: { key: string; displayName: string }[] = await (prisma as any).roleDefinition.findMany({
      select: { key: true, displayName: true }
    });

    if (roles.length > 0) {
      return roles.reduce((acc: Record<string, string>, curr: { key: string; displayName: string }) => {
        acc[curr.key] = curr.displayName;
        return acc;
      }, {} as Record<string, string>);
    }
    
    return DEFAULT_ROLE_LABELS;
  } catch (error) {
    console.error("Error fetching role labels:", error);
    return DEFAULT_ROLE_LABELS;
  }
}
