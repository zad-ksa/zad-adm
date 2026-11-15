import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/console/layout";
import { Note } from "@/components/console/ui";
import { resolveCharityPortal } from "@/lib/portalAccess";
import { hasCharityPermission } from "@/lib/charityPermissions";
import { charityHasService } from "@/lib/charityServices";
import { isMediaPlanEnabled } from "@/lib/mediaPlanToggle";
import { MEDIA_FIELDS_MISSING, hasPostDetailColumns } from "@/lib/mediaPostFields";
import { MEDIA_SERVICE } from "@/lib/mediaPlanAccess";
import { toISODate } from "@/lib/calendarGrid";
import PortalMediaClient from "./PortalMediaClient";

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
 * الخطّةُ الإعلاميّةُ في بوّابة الجمعية — نفسُ تقويم زاد، بيدٍ أخرى.
 *
 * فمسؤولُ الإعلام في الجمعية يرى ما وضعه زادٌ لشهره، ويعتمد المنشورَ أو يُعدِّله.
 * واعتمادُه نهائيٌّ: لا يُفتح بعده إلا من زادٍ وبسببٍ يُعرض عليه.
 *
 * وحارسان لا واحد: `requirePortalPermission` تفحص العضويّةَ وصلاحيةَ التبويب،
 * وشمولُ خدمة «الإعلامية» للجمعية شرطٌ ثالثٌ كما عند زاد — والأفعالُ تُعيد
 * الفحوصَ الثلاثةَ كلَّها عند كلِّ نداء.
 */
export default async function PortalMediaPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  const session = await getSession();
  if (!session || session.userType !== "CHARITY_USER") redirect("/");

  // والاطّلاعُ بلا صلاحيّة: تقويمُ جمعيتِهم يراه كلُّ عضوٍ فيها. والاعتمادُ
  // والتعديلُ بـ«تحرير الخطة الإعلامية» — تفحصه الأفعالُ كذلك، فإخفاءُ زرٍّ ليس
  // حراسة.
  const { charity, effective } = await resolveCharityPortal(name);
  const canEdit = hasCharityPermission(effective, "edit_media_plan");

  const header = (
    <PageHeader
      icon={<Megaphone className="size-5 text-primary" />}
      title="الخطة الإعلامية"
      description="خطة النشر الشهرية لجمعيتكم"
    />
  );

  // والمفتاحُ أوّلاً: تبويبٌ مُطفأٌ من زادٍ لا يُفتح بكتابة رابطه. ويُقال سببُه
  // صريحاً — صفحةٌ فارغةٌ تُقرأ عطباً.
  if (!(await isMediaPlanEnabled(charity.id))) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
        {header}
        <Note tone="warn">
          لم تفعل الخطة الاعلامية لجمعيتكم بعد. تفعل من زاد حين تصير جاهزة للعرض.
        </Note>
      </div>
    );
  }

  if (!(await hasPostDetailColumns())) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
        {header}
        <Note tone="warn">{MEDIA_FIELDS_MISSING}</Note>
      </div>
    );
  }

  // الخدمةُ شرطٌ، ويُقال صريحاً لا يُترك صفحةً فارغة: التبويبُ يُنال بتفويض
  // الخدمة، فإن رُفعت عن الجمعية بقي التفويضُ في صفِّ العضو حتى يُحرَّر.
  if (!(await charityHasService(charity.id, MEDIA_SERVICE))) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
        {header}
        <Note tone="warn">
          خدمة «{MEDIA_SERVICE}» غير مشمولة لجمعيتكم في زاد، فلا خطة اعلامية تعرض هنا. راجعوا
          مسؤول حسابكم في زاد.
        </Note>
      </div>
    );
  }

  // شهرُ اليوم: ستّةُ أسابيعَ حوله هي ما ترسمه الشبكة، فيُجلب مداها وحدَه
  // ويُعاد الجلبُ من الشاشة عند كل انتقال.
  const today = new Date();
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const from = new Date(first.getTime() - (first.getUTCDay() + 7) * 86_400_000);
  const to = new Date(from.getTime() + 55 * 86_400_000);

  const [posts, platforms] = await Promise.all([
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
    // والمنصّاتُ تُقرأ كاملةً — المعطَّلةُ منها تحمل اسمَ ما اختاره زادٌ في
    // منشورٍ قديم، فبلا صفِّها يُعرض المفتاحُ عُرياناً مكان الاسم.
    prisma.mediaPlatform.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, key: true, name: true, iconKey: true, logoUrl: true, color: true, isActive: true },
    }),
  ]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {header}
      <PortalMediaClient
        charityId={charity.id}
        charityName={charity.name}
        today={toISODate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())))}
        initialPosts={posts.map((p) => ({ ...p, scheduledOn: toISODate(p.scheduledOn) }))}
        platforms={platforms}
        canEdit={canEdit}
      />
    </div>
  );
}
