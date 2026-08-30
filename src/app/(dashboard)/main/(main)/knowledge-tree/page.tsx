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
    <div className="space-y-6" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 left-0 w-48 h-48 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="relative z-10 text-center py-4">
          <div className="w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
            <FolderTree className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">شجرة المعرفة</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            مساحة مشتركة لتنظيم ملفات المركز في مجلدات ومجلدات فرعية. ما تضيفه هنا يراه كل من يملك
            الصلاحية.
          </p>
        </div>
      </div>

      {/* The browser fetches one folder at a time from the client, so the page
          itself has nothing to load — only the guard above matters here. */}
      <KnowledgeTreeClient />
    </div>
  );
}
