export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { resolveCharityPortal } from "@/lib/portalAccess";
import { charityPermissionLabel } from "@/lib/charityPermissions";

export const metadata: Metadata = { title: "لا تملك صلاحية الوصول" };

/**
 * Shown when a member of this charity opens a section they were not given.
 *
 * A real page rather than notFound(), for two reasons. The honest answer is
 * "you may not", not "there is nothing here" — the section plainly exists, and
 * their colleague is using it. And a 404 renders outside the portal layout, so
 * it arrived with no sidebar: whoever landed on it had no way to reach any
 * other tab and no way back except the browser's own button.
 *
 * Living inside /portal/[name] means the sidebar comes with it, so the reader's
 * next click is always available.
 *
 * Someone who is not a member of this charity at all still gets notFound() from
 * resolveCharityPortal — that distinction is deliberate: this page names a
 * section, and naming it to an outsider would confirm the charity exists.
 */
export default async function NoAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ need?: string }>;
}) {
  const { name } = await params;
  const { need } = await searchParams;

  // Membership is still required to see this page at all.
  const { charity, can } = await resolveCharityPortal(name);

  const base = `/portal/${encodeURIComponent(charity.name)}`;

  // Somewhere they CAN go, offered by name rather than as a bare "go back".
  const openTabs = [
    { href: `${base}/services`, label: "الخدمات", allowed: can("view_services") },
    { href: `${base}/governance`, label: "الحوكمة", allowed: can("view_governance") },
    {
      href: `${base}/design-requests`,
      label: "طلبات التصاميم",
      allowed: can("view_design_requests"),
    },
    { href: `${base}/hr`, label: "الموارد البشرية", allowed: true },
  ].filter((t) => t.allowed);

  return (
    <div dir="rtl" className="max-w-lg mx-auto py-16 text-center">
      <div
        className="mx-auto w-14 h-14 rounded-2xl grid place-items-center
                   bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
      >
        <Lock className="w-7 h-7" />
      </div>

      <h1 className="mt-5 text-lg font-black text-slate-900 dark:text-slate-100">
        لا تملك صلاحية هذا القسم
      </h1>

      <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
        {need
          ? `يتطلب هذا القسم صلاحية «${charityPermissionLabel(need)}»، وهي غير مضافة لحسابك في ${charity.name}.`
          : `هذا القسم غير متاح لحسابك في ${charity.name}.`}
        <br />
        لطلبها، راجع مدير الجمعية.
      </p>

      {openTabs.length > 0 && (
        <div className="mt-7">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2">
            الأقسام المتاحة لك
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {openTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="h-9 px-4 grid place-items-center rounded-xl text-[12px] font-bold
                           bg-slate-100 text-slate-600 hover:bg-slate-200
                           dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700
                           transition-colors"
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
