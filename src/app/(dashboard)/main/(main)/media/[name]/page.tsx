import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/console/layout";
import { requireCharitySection } from "@/lib/sectionGuard";
import { getMediaScope } from "@/lib/mediaPlanAccess";
import { toISODate } from "@/lib/calendarGrid";
import MediaPlanClient from "./MediaPlanClient";
import CharityAccounts from "./CharityAccounts";
import CharitySwitcher from "./CharitySwitcher";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  return { title: `الخطة الإعلامية | ${decodeURIComponent(name)}` };
}

/**
 * تقويمُ الخطّة الإعلاميّة لجمعيةٍ واحدة.
 *
 * وحارسان لا واحد: `requireCharitySection` تفحص الصلاحيةَ والإسنادَ وشمولَ خدمة
 * «الإعلامية» للجمعية، و`findMediaCharity` تُعيد الجمعيةَ من النطاق نفسِه الذي
 * تحرس به الأفعال — فلا يفترق ما يُعرض عمّا يُجاز.
 */
export default async function MediaPlanPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const charityName = decodeURIComponent(name);

  const session = await getSession();
  if (!session?.id) redirect("/login");
  await requireCharitySection("manage_media_plan", charityName);

  // النطاقُ مرّةً واحدة: منه الجمعيةُ المطلوبة، ومنه قائمةُ التنقّل بين جمعيات الموظَّف.
  const scope = await getMediaScope(session);
  const charity = scope.canManage ? scope.charities.find((c) => c.name === charityName) : undefined;
  if (!charity) redirect("/main");

  // شهرُ اليوم: ستّةُ أسابيعَ حوله هي ما ترسمه الشبكة، فيُجلب مداها وحدَه
  // ويُعاد الجلبُ من الشاشة عند كل انتقال.
  const today = new Date();
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const from = new Date(first.getTime() - (first.getUTCDay() + 7) * 86_400_000);
  const to = new Date(from.getTime() + 55 * 86_400_000);

  const [posts, platforms, accounts] = await Promise.all([
    prisma.mediaPost.findMany({
      where: { charityId: charity.id, scheduledOn: { gte: from, lte: to } },
      orderBy: [{ scheduledOn: "asc" }, { scheduledAt: "asc" }],
      select: {
        id: true,
        scheduledOn: true,
        scheduledAt: true,
        content: true,
        platforms: true,
        imageUrl: true,
        imagePublicId: true,
        linkUrl: true,
        status: true,
        createdByName: true,
        finalizedBy: true,
        finalizedSide: true,
      },
    }),
    prisma.mediaPlatform.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, key: true, name: true, iconKey: true, logoUrl: true, color: true, isActive: true },
    }),
    prisma.charityMediaAccount.findMany({
      where: { charityId: charity.id },
      select: { platformKey: true, url: true },
    }),
  ]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <PageHeader
        icon={<Megaphone className="size-5 text-primary" />}
        title="الخطة الإعلامية"
        description={charity.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {scope.charities.length > 1 && (
              <CharitySwitcher current={charity.name} charities={scope.charities.map((c) => c.name)} />
            )}
            <CharityAccounts
              key={charity.id}
              charityId={charity.id}
              charityName={charity.name}
              platforms={platforms}
              initialAccounts={accounts}
            />
          </div>
        }
      />
      <MediaPlanClient
        key={charity.id}
        charityId={charity.id}
        charityName={charity.name}
        today={toISODate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())))}
        initialPosts={posts.map((p) => ({ ...p, scheduledOn: toISODate(p.scheduledOn) }))}
        platforms={platforms}
      />
    </div>
  );
}
