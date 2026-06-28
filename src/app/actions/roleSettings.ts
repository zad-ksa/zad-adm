"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type NavTabStatus = "OPEN" | "HIDDEN" | "COMING_SOON";

export interface NavTabSetting {
  id: string;
  title: string;
  status: NavTabStatus;
  section: "main" | "sub";
}

const DEFAULT_NAV_TABS: NavTabSetting[] = [
  { id: "services", title: "الخدمات", status: "OPEN", section: "main" },
  { id: "governance", title: "الحوكمة", status: "OPEN", section: "main" },
  { id: "overview", title: "الرئيسية", status: "OPEN", section: "sub" },
  { id: "strategy", title: "الاستراتيجية", status: "OPEN", section: "sub" },
  { id: "programs", title: "البرامج والمشاريع", status: "OPEN", section: "sub" },
  { id: "finance", title: "المالية", status: "OPEN", section: "sub" },
  { id: "hr", title: "الموارد البشرية", status: "COMING_SOON", section: "sub" },
  { id: "tasks", title: "مهامي", status: "HIDDEN", section: "sub" },
];

export async function getRoleNavSettings(role: string): Promise<NavTabSetting[]> {
  try {
    const record = await prisma.roleNavSetting.findUnique({
      where: { role },
    });
    
    if (record && record.settings) {
      // Merge with defaults in case new tabs were added in code
      const savedSettings = record.settings as unknown as NavTabSetting[];
      const merged = savedSettings.filter(s => DEFAULT_NAV_TABS.some(d => d.id === s.id));
      
      // Add any missing new defaults
      for (const def of DEFAULT_NAV_TABS) {
        if (!merged.find(m => m.id === def.id)) {
          merged.push(def);
        }
      }
      return merged;
    }

    return [...DEFAULT_NAV_TABS];
  } catch (error) {
    console.error("Error fetching role nav settings:", error);
    return [...DEFAULT_NAV_TABS];
  }
}

export async function updateRoleNavSettings(role: string, settings: NavTabSetting[]) {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role);
  const hasPerm = session.permissions?.includes("manage_charity_settings") || session.permissions?.includes("developer_mode");

  if (!isAdmin && !hasPerm) {
    return { success: false, error: "Not authorized" };
  }

  try {
    await prisma.roleNavSetting.upsert({
      where: { role },
      update: {
        settings: settings as any,
      },
      create: {
        role,
        settings: settings as any,
      },
    });

    // Revalidate paths so sidebars update immediately
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Error updating role nav settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}
