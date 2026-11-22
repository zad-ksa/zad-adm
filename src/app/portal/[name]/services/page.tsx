export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/console/layout";
import ServicesGuideButton from "@/components/ServicesGuideButton";
import { prisma } from "@/lib/db";
import { getTimelineConfigs } from "@/app/actions/settings";
import { resolveCharityPortal } from "@/lib/portalAccess";
import { seesCharityServicesTab, visibleCharityServices } from "@/lib/charityPermissions";
import ServicesClient from "./ServicesClient";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} | الخدمات` };
}

const CORE = ["STRATEGY", "GOVERNANCE", "FINANCE"] as const;

export default async function ServicesPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  // Membership AND permission, both re-checked here: the layout only proves the
  // visitor belongs to this charity, not that they may see this tab.
  //
  // والتبويبُ مشتقٌّ لا صلاحيّةً باسمه: يُفتح لمن له صلاحيّةٌ في خدمةٍ ما، ويُسرد
  // له **ما له فيه صلاحيّةٌ وحدَه**. وكان يُفتح بتفويض أيِّ خدمةٍ ثمّ يعرض خدماتِ
  // الجمعية التسعَ جميعاً — فيرى مفوَّضُ الإعلاميّةِ مخططاتِ المالية والحوكمة.
  const access = await resolveCharityPortal(name);
  if (!seesCharityServicesTab(access.isOfficial, access.effective)) {
    redirect(`/portal/${encodeURIComponent(access.charity.name)}/no-access`);
  }

  const serviceRows = await prisma.service.findMany({
    where: { charityId: access.charity.id },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: { steps: { orderBy: { order: "asc" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // الترشيحُ بالقاعدة نفسِها التي يقرؤها الشريطُ (`visibleCharityServices`).
  const visible = new Set(
    visibleCharityServices({
      isOfficialAccount: access.isOfficial,
      effective: access.effective,
      charityServices: serviceRows.map((s) => s.name),
    })
  );
  const allowed = serviceRows.filter((s) => visible.has(s.name));

  // وأسماءُ الأقسام الثلاثة تُقرأ من إعدادات زاد لا من صفِّ الخدمة: هي
  // تسميةُ المخطط عند زادٍ، تُغيَّر مرّةً فتُقرأ في كلِّ جمعية.
  const timelineNames = await getTimelineConfigs();
  const core = CORE.map((dept) => {
    const service = allowed.find((s) => s.department === dept);
    return service ? { ...service, name: timelineNames[dept] || service.name } : null;
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  const services = [
    ...core,
    ...allowed.filter((s) => !CORE.includes((s.department ?? "") as (typeof CORE)[number])),
  ];

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        icon={<Briefcase className="size-6" />}
        title="الخدمات"
        description="مراحل خدمات جمعيتك، وأين بلغت كل واحدة منها اليوم."
        actions={
          <ServicesGuideButton
            sections={services.map((s) => ({
              title: s.name,
              isComingSoon: s.isComingSoon,
              stages: s.stages,
            }))}
          />
        }
      />

      <ServicesClient
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          isComingSoon: s.isComingSoon,
          stages: s.stages,
        }))}
      />
    </div>
  );
}
