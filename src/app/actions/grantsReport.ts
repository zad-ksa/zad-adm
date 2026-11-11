"use server";

import { prisma } from "@/lib/db";
import { requireDonorViewer } from "@/lib/donorScope";
import type { GrantReportRow } from "@/lib/grantsReport";

/**
 * صفوفُ تقرير المنح — تُقرأ من القاعدة في نطاق الرائي، لا تُؤخذ من المتصفّح.
 *
 * والشاشةُ تملك الصفوفَ المعروضةَ أصلاً، فلمَ رحلةٌ إلى الخادم؟ لسببين:
 *
 *   ١ **التقريرُ أوسعُ من الجدول**: المبلغُ المحصَّلُ وعددُ المستفيدين
 *     والأقساطُ وتاريخُ الإغلاق مكتوبةٌ في القاعدة ولا تُنقَل إلى الشاشة —
 *     ونقلُها في كلِّ فتحةٍ للصفحة ثمنٌ يُدفع لأجل زرٍّ يُضغط مرّةً في الشهر.
 *   ٢ **والنطاقُ يُعاد فحصُه**: المُصدِّرُ يُرسل معرِّفاتٍ، وهذه لا تقرأ إلا
 *     ما كان في جمعياته المسنَدة — فمعرِّفٌ من خارج نطاقه يسقط صامتاً ولا
 *     يُخرج صفّاً لا تُظهره له الصفحة.
 *
 * والترتيبُ ترتيبُ المعرِّفات كما أُرسلت: الملفُّ يخرج على الترتيب الذي يراه
 * صاحبُه على الشاشة، بفرزه ومُرشِّحاته، لا بترتيب القاعدة.
 */
export async function grantsReportRows(ids: string[]): Promise<{ rows?: GrantReportRow[]; error?: string }> {
  try {
    const viewer = await requireDonorViewer();
    if (viewer.charityIds.length === 0) return { rows: [] };

    const wanted = [...new Set(ids)].filter((id) => typeof id === "string" && id.length > 0);
    if (wanted.length === 0) return { rows: [] };

    const found = await prisma.grantApplication.findMany({
      where: { id: { in: wanted }, charityId: { in: viewer.charityIds } },
      select: {
        id: true,
        initiativeName: true,
        requestedAmount: true,
        status: true,
        collectedAmount: true,
        beneficiariesCount: true,
        installmentsCount: true,
        installmentsNotes: true,
        createdAt: true,
        closureDate: true,
        donorOrgId: true,
        entityName: true,
        charity: { select: { name: true } },
        donorOrg: { select: { name: true } },
      },
    });

    const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
    const byId = new Map(
      found.map((g) => [
        g.id,
        {
          charityName: g.charity.name,
          donorName: g.donorOrg?.name ?? g.entityName,
          donorMissing: !g.donorOrgId,
          initiativeName: g.initiativeName,
          requestedAmount: g.requestedAmount,
          status: g.status,
          collectedAmount: g.collectedAmount,
          beneficiariesCount: g.beneficiariesCount,
          installmentsCount: g.installmentsCount,
          installmentsNotes: g.installmentsNotes,
          createdAt: day(g.createdAt) ?? "",
          closureDate: day(g.closureDate),
        } satisfies GrantReportRow,
      ])
    );

    return { rows: wanted.map((id) => byId.get(id)).filter((row): row is GrantReportRow => !!row) };
  } catch (error) {
    console.error("Error building grants report:", error);
    return { error: "تعذّر تجهيز التقرير" };
  }
}
