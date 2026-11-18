import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import PopupsClient, { type PopupRow } from "./PopupsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "إشعارات البوابة | زاد التنموية" };

/**
 * إشعاراتُ بوّابات الجمعيات الانبثاقيّة — تُكتب هنا وتُعرض هناك.
 *
 * وحارسُها `manage_charities`: هي صلاحيّةُ من يُخاطب الجمعيات أصلاً، ولم
 * تُنشأ لها صلاحيّةٌ ثالثةٌ تُمنح وتُنسى.
 *
 * **ويُقرأ الجدولُ محروساً**: `prisma/sql/portal-popups.sql` قد لا يكون
 * طُبِّق بعد، فتُعرض الصفحةُ فارغةً ويقول أوّلُ حفظٍ السببَ باسم الملف — وهو
 * أهونُ من شاشةِ خطأ.
 */
export default async function PortalPopupsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (!hasPermission(session.role || "", session.permissions || [], "manage_charities")) {
    redirect("/main/admin");
  }

  const charities = await prisma.charity.findMany({
    where: { isInternal: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const popups: PopupRow[] = await prisma.portalPopup
    .findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        body: true,
        pageKey: true,
        charityIds: true,
        repeatMode: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
        createdBy: { select: { name: true } },
        _count: { select: { seen: true } },
      },
    })
    .then((rows) =>
      rows.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        pageKey: p.pageKey,
        charityIds: p.charityIds,
        repeatMode: p.repeatMode,
        isActive: p.isActive,
        startsAt: p.startsAt ? p.startsAt.toISOString().slice(0, 10) : null,
        endsAt: p.endsAt ? p.endsAt.toISOString().slice(0, 10) : null,
        authorName: p.createdBy?.name ?? null,
        seenCount: p._count.seen,
      }))
    )
    .catch((error) => {
      console.error("portal popups page", error);
      return [];
    });

  return <PopupsClient popups={popups} charities={charities} />;
}
