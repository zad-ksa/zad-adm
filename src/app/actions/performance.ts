"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { assertCharityAccess } from "@/lib/access";

// Both actions are only reached from the strategy screens under
// (dashboard)/main, so access is scoped to employees assigned to the charity.
async function assertAccessByCharityName(charityName: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const charity = await prisma.charity.findUnique({
    where: { name: charityName },
    select: { id: true },
  });
  if (charity) await assertCharityAccess(session.id, session.role, charity.id);
  return session;
}

export async function getPerformanceMetric(charityName: string, year: number) {
  try {
    await assertAccessByCharityName(charityName);

    const metric = await prisma.performanceMetric.findUnique({
      where: {
        charityName_year: {
          charityName,
          year,
        },
      },
    });
    
    return metric;
  } catch (error) {
    console.error("Error fetching performance metric:", error);
    return null;
  }
}

export async function savePerformanceMetric(charityName: string, year: number, data: any) {
  try {
    await assertAccessByCharityName(charityName);

    const metric = await prisma.performanceMetric.upsert({
      where: {
        charityName_year: {
          charityName,
          year,
        },
      },
      update: {
        data,
      },
      create: {
        charityName,
        year,
        data,
      },
    });

    revalidatePath(`/portal/${encodeURIComponent(charityName)}/strategy/performance`);
    return { success: true, metric };
  } catch (error: any) {
    console.error("Error saving performance metric:", error);
    return { 
      success: false, 
      error: error?.message || String(error)
    };
  }
}
