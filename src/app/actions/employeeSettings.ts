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

export async function getAllEmployees() {
  const session = await getSession();
  if (!session) return [];

  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: {
        name: 'asc'
      }
    });
    return employees;
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
}

export async function getEmployeeNavSettings(employeeId: string): Promise<NavTabSetting[]> {
  if (!employeeId) return [...DEFAULT_NAV_TABS];
  try {
    const record = await prisma.employeeNavSetting.findUnique({
      where: { employeeId },
    });
    
    if (record && record.settings) {
      const savedSettings = record.settings as unknown as NavTabSetting[];
      const merged = savedSettings.filter(s => DEFAULT_NAV_TABS.some(d => d.id === s.id));
      
      for (const def of DEFAULT_NAV_TABS) {
        if (!merged.find(m => m.id === def.id)) {
          merged.push(def);
        }
      }
      return merged;
    }

    return [...DEFAULT_NAV_TABS];
  } catch (error) {
    console.error("Error fetching employee nav settings:", error);
    return [...DEFAULT_NAV_TABS];
  }
}

export async function updateEmployeeNavSettings(employeeId: string, settings: NavTabSetting[]) {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role);
  const hasPerm = session.permissions?.includes("manage_charity_settings") || session.permissions?.includes("developer_mode");

  if (!isAdmin && !hasPerm) {
    return { success: false, error: "Not authorized" };
  }

  try {
    await prisma.employeeNavSetting.upsert({
      where: { employeeId },
      update: {
        settings: settings as any,
      },
      create: {
        employeeId,
        settings: settings as any,
      },
    });

    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Error updating employee nav settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function broadcastToCharityClients(settings: NavTabSetting[], targetEmployeeIds?: string[]) {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role);
  const hasPerm = session.permissions?.includes("manage_charity_settings") || session.permissions?.includes("developer_mode");

  if (!isAdmin && !hasPerm) {
    return { success: false, error: "Not authorized" };
  }

  try {
    const clients = await prisma.employee.findMany({
      where: { 
        role: "CHARITY_CLIENT",
        ...(targetEmployeeIds && { id: { in: targetEmployeeIds } })
      },
      select: { id: true },
    });

    if (clients.length === 0) return { success: true };

    // Use transaction to upsert all
    await prisma.$transaction(
      clients.map((client) =>
        prisma.employeeNavSetting.upsert({
          where: { employeeId: client.id },
          update: { settings: settings as any },
          create: { employeeId: client.id, settings: settings as any },
        })
      )
    );

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error broadcasting to charity clients:", error);
    return { success: false, error: "Failed to broadcast settings" };
  }
}

export async function broadcastToEmployees(settings: NavTabSetting[], targetEmployeeIds?: string[]) {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role);
  const hasPerm = session.permissions?.includes("manage_charity_settings") || session.permissions?.includes("developer_mode");

  if (!isAdmin && !hasPerm) {
    return { success: false, error: "Not authorized" };
  }

  try {
    const employees = await prisma.employee.findMany({
      where: { 
        role: { not: "CHARITY_CLIENT" },
        ...(targetEmployeeIds && { id: { in: targetEmployeeIds } })
      },
      select: { id: true },
    });

    if (employees.length === 0) return { success: true };

    await prisma.$transaction(
      employees.map((emp) =>
        prisma.employeeNavSetting.upsert({
          where: { employeeId: emp.id },
          update: { settings: settings as any },
          create: { employeeId: emp.id, settings: settings as any },
        })
      )
    );

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error broadcasting to employees:", error);
    return { success: false, error: "Failed to broadcast settings" };
  }
}
