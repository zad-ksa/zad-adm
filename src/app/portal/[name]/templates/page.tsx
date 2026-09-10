export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import { resolveCharityPortal } from "@/lib/portalAccess";
import { listKnowledgeFolder } from "@/app/actions/knowledgeTree";
import TemplatesLibraryClient from "./TemplatesLibraryClient";

export const metadata: Metadata = { title: "مكتبة النماذج" };

/**
 * The shared templates library, read-only for charities.
 *
 * `resolveCharityPortal` rather than `requirePortalPermission`: membership is
 * the whole requirement. The library is reference material every charity is
 * meant to have, and putting it behind a permission that every membership would
 * then be granted adds a checkbox to keep in step without changing who sees
 * what.
 *
 * Read-only is enforced on the server, not by hiding buttons: the four
 * mutations in knowledgeTree.ts keep a guard that rejects every CHARITY_USER
 * account outright, so there is no request this screen could be persuaded to
 * send that would change anything.
 */
export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  await resolveCharityPortal(name);

  const listing = await listKnowledgeFolder(null);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
          <FolderOpen className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
            مكتبة النماذج
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            نماذج ومستندات جاهزة من فريق زاد — للتحميل
          </p>
        </div>
      </div>

      <TemplatesLibraryClient
        initialRows={listing.ok ? listing.rows : []}
        initialPath={listing.ok ? listing.path : []}
      />
    </div>
  );
}
