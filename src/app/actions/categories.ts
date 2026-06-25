"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const DEFAULT_CATEGORIES = [
  "الاستراتيجية",
  "التقنية",
  "تنمية الموارد",
  "الإعلامية",
  "تكليف",
  "استقطاب",
];

export async function getCategories(): Promise<string[]> {
  let cats = await prisma.achievementCategory.findMany({
    orderBy: { createdAt: "asc" },
  });

  // First-time seed if table is empty
  if (cats.length === 0) {
    await prisma.achievementCategory.createMany({
      data: DEFAULT_CATEGORIES.map((name) => ({ name })),
      skipDuplicates: true,
    });
    cats = await prisma.achievementCategory.findMany({
      orderBy: { createdAt: "asc" },
    });
  }

  return cats.map((c) => c.name);
}

export async function addCategory(name: string): Promise<{ success?: string; error?: string; categories?: string[] }> {
  const session = await getSession();
  if (!session) return { error: "غير مصرح" };

  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role);
  if (!isAdmin) return { error: "هذه الصلاحية للإدارة التنفيذية فقط" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "اسم القسم لا يمكن أن يكون فارغاً" };

  try {
    await prisma.achievementCategory.create({ data: { name: trimmed } });
    const categories = await getCategories();
    return { success: "تم إضافة القسم", categories };
  } catch {
    return { error: "القسم موجود بالفعل" };
  }
}

export async function deleteCategory(name: string): Promise<{ success?: string; error?: string; categories?: string[] }> {
  const session = await getSession();
  if (!session) return { error: "غير مصرح" };

  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role);
  if (!isAdmin) return { error: "هذه الصلاحية للإدارة التنفيذية فقط" };

  await prisma.achievementCategory.deleteMany({ where: { name } });
  const categories = await getCategories();
  return { success: "تم حذف القسم", categories };
}
