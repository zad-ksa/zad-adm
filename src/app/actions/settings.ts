"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";

const ADMIN_ROLES = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"];

async function assertAdmin() {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) throw new Error("غير مصرح");
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
  revalidatePath("/dashboard/services-overview");
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
