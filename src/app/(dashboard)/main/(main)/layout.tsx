import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "./DashboardLayoutClient";
import { Metadata } from "next";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "لوحة التحكم | زاد التنموية",
};

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // DashboardLayoutClient wrapper is now handled by the shared layout in src/app/(dashboard)/layout.tsx
  return <>{children}</>;
}
