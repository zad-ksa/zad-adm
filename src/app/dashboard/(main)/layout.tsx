import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "./DashboardLayoutClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة التحكم | زاد التنموية",
};
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  
  if (!session) {
    redirect("/");
  }

  return (
    <DashboardLayoutClient session={session}>
      {children}
    </DashboardLayoutClient>
  );
}
