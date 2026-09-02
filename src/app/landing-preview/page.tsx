import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getLandingConfig } from "@/app/actions/landing";
import LandingPreviewClient from "./LandingPreviewClient";

export const metadata: Metadata = {
  title: "معاينة الواجهة الرئيسية",
  robots: { index: false, follow: false },
};

// معاينة داخلية للمحرّر فقط — تُفتح داخل iframe في /main/landing-settings.
export default async function LandingPreviewPage() {
  const session = await getSession();
  const canManage =
    !!session &&
    session.userType !== "CHARITY_USER" &&
    (isAdmin(session.role) ||
      session.permissions?.includes("manage_landing") ||
      session.permissions?.includes("developer_mode"));

  if (!canManage) redirect("/");

  const config = await getLandingConfig();
  return <LandingPreviewClient initialConfig={config} />;
}
