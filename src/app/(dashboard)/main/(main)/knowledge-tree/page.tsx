import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import type { Metadata } from "next";
import { FolderTree } from "lucide-react";
import KnowledgeTreeClient from "./KnowledgeTreeClient";

export const metadata: Metadata = {
  title: "شجرة المعرفة | زاد التنموية",
};

export const dynamic = "force-dynamic";

export default async function KnowledgeTreePage() {
  const session = await getSession();

  // Gated on the permission the sidebar uses, so the tab and the page can never
  // disagree — the mismatch that took the meetings page down for an accountant.
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_knowledge_tree")) {
    redirect("/main");
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
          <FolderTree className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">شجرة المعرفة</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            مساحة مشتركة — ما تضيفه هنا يراه كل من يملك الصلاحية
          </p>
        </div>
      </div>

      <KnowledgeTreeClient />
    </div>
  );
}
