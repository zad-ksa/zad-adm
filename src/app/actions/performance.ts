"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getPerformanceMetric(charityName: string, year: number) {
  try {
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

    revalidatePath(`/dashboard/charity/${encodeURIComponent(charityName)}/strategy/performance`);
    return { success: true, metric };
  } catch (error: any) {
    console.error("Error saving performance metric:", error);
    return { 
      success: false, 
      error: error?.message || String(error)
    };
  }
}
