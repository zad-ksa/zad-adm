"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guards";

export type NavTabStatus = "OPEN" | "HIDDEN" | "COMING_SOON";

export interface NavTabSetting {
  id: string;
  title: string;
  status: NavTabStatus;
  section: "main" | "sub";
}

const DEFAULT_CHARITY_NAV_TABS: NavTabSetting[] = [
  { id: "services", title: "الخدمات", status: "OPEN", section: "main" },
];

export async function getCharityGlobalNavSettings(): Promise<NavTabSetting[]> {
  try {
    const record = await prisma.globalSetting.findUnique({
      where: { key: "CHARITY_PORTAL_NAV" },
    });
    
    if (record && record.value) {
      const savedSettings = record.value as unknown as NavTabSetting[];
      const merged = savedSettings.filter(s => DEFAULT_CHARITY_NAV_TABS.some(d => d.id === s.id));
      
      for (const def of DEFAULT_CHARITY_NAV_TABS) {
        if (!merged.find(m => m.id === def.id)) {
          merged.push(def);
        }
      }
      return merged;
    }
  } catch (error) {
    console.error("Error fetching global charity nav settings:", error);
  }
  return [...DEFAULT_CHARITY_NAV_TABS];
}

export async function updateCharityGlobalNavSettings(settings: NavTabSetting[]) {
  // Writes a setting that affects the navigation of every charity portal.
  // The read below stays open because portal layouts call it while rendering.
  try {
    await requirePermission("manage_charity_settings");
  } catch {
    return { success: false, error: "غير مصرح" };
  }

  try {
    await prisma.globalSetting.upsert({
      where: { key: "CHARITY_PORTAL_NAV" },
      update: { value: settings as any },
      create: { key: "CHARITY_PORTAL_NAV", value: settings as any },
    });
    
    // Revalidate paths so the UI updates
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating global settings:", error);
    return { success: false, error: "فشل حفظ الإعدادات المركزية" };
  }
}
