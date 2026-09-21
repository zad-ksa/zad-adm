import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/console/layout";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import type { Metadata } from "next";
import { FolderTree } from "lucide-react";
import TemplateLibraryClient from "./TemplateLibraryClient";

export const metadata: Metadata = {
  title: "مكتبة النماذج | زاد التنموية",
};

export const dynamic = "force-dynamic";

export default async function TemplateLibraryPage() {
  const session = await getSession();

  // Gated on the permission the sidebar uses, so the tab and the page can never
  // disagree — the mismatch that took the meetings page down for an accountant.
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_knowledge_tree")) {
    redirect("/main");
  }

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        icon={<FolderTree className="w-6 h-6" />}
        title="مكتبة النماذج"
        description="مساحة مشتركة — ما تضيفه هنا يراه كل من يملك الصلاحية، والجمعيات تراه للتحميل فقط"
      />

      <TemplateLibraryClient />
    </div>
  );
}
