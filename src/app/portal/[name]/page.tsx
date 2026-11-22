import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  FolderOpen,
  Home,
  Palette,
  Scale,
  UserPlus,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/console/layout";
import { NavCard } from "@/components/console/ui";
import { resolveCharityPortal } from "@/lib/portalAccess";
import { seesCharityServicesTab } from "@/lib/charityPermissions";
import { loadPortalHome } from "@/lib/portalHomeData";
import { CHARITY_ATTENDANCE_ENABLED } from "@/lib/featureFlags";
import { NoServices, ServicesStrip, WaitingOnYou, WeekAhead, ZadContacts } from "./HomeSections";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: decodeURIComponent(name) };
}

/**
 * رئيسيةُ بوّابة الجمعية.
 *
 * **وكانت تحويلاً لا صفحة**: من يفتح البوّابةَ يُقذف إلى أوّل تبويبٍ يملكه،
 * فالمطلوبُ منه موزَّعٌ على ستّة تبويبات ولا موضعَ يجمعه — وبعضُه يَفوت:
 * تسليمٌ يُعتمد تلقائياً بعد مهلته، وجهةٌ مانحةٌ تُغلق.
 *
 * **وترتيبُ الكتل ترتيبُ السؤال**: ما المطلوب منّي؟ ثمّ أين وصلنا؟ ثمّ ما
 * الذي أفعله؟ ثمّ ما مواعيد الأسبوع؟ ثمّ بمن أتّصل؟
 *
 * **وكلُّ كتلةٍ تظهر لمن يملك فعلَها**: عضوٌ بصلاحيّةٍ واحدةٍ يرى رئيسيّةً
 * قصيرةً صادقة، لا جداراً من «لا صلاحية».
 */
export default async function PortalHomePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const access = await resolveCharityPortal(name);
  const base = `/portal/${encodeURIComponent(access.charity.name)}`;
  const home = await loadPortalHome(access);

  const canDesign = access.can("view_design_requests");
  const canFundraising = access.can("view_fundraising");
  const canStaff = access.can("manage_charity_users");
  const seesServices = seesCharityServicesTab(access.isOfficial, access.effective);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        icon={<Home className="size-6" />}
        title={access.charity.name}
        description="بوابتك مع زاد: ما ينتظر ردك، وأين وصلت خدماتك، وما يقع هذا الأسبوع."
      />

      <WaitingOnYou tasks={home.tasks} />

      {seesServices &&
        (home.services.length > 0 ? (
          <ServicesStrip services={home.services} base={base} />
        ) : (
          <NoServices base={base} />
        ))}

      {/* والأفعالُ لا الأقسام: الشريطُ الجانبيُّ يسرد التسعةَ أقساماً، فشبكةٌ
          تكرّرها هنا زينةٌ لا تُختصر بها خطوة. وهذه ما **تفعله** الجمعية. */}
      <section className="space-y-3">
        <h2 className="text-section font-semibold tracking-tight">ابدأ من هنا</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {canDesign && (
            <NavCard
              href={`${base}/design-requests`}
              icon={<Palette className="size-5" />}
              title="طلب تصميم"
              description="ارفع طلبك، ويراجعه فريق زاد خلال يوم عمل."
            />
          )}
          {canFundraising && (
            <NavCard
              href={`${base}/fundraising`}
              icon={<Wallet className="size-5" />}
              title="الجهات المانحة"
              description="اقترح مشاريعك في مجالات المنح، وتابع ما رفع."
            />
          )}
          {access.can("view_governance") && (
            <NavCard
              href={`${base}/governance`}
              icon={<Scale className="size-5" />}
              title="دليل الحوكمة"
              description="معايير حجم جمعيتك ومؤشراتها والشواهد المطلوبة."
            />
          )}
          {CHARITY_ATTENDANCE_ENABLED && (
            <NavCard
              href={`${base}/hr/attendance`}
              icon={<CalendarCheck className="size-5" />}
              title="تسجيل الحضور"
              description="حضورك وانصرافك من موقع العمل المعتمد."
            />
          )}
          {canStaff && (
            <NavCard
              href={`${base}/hr`}
              icon={<UserPlus className="size-5" />}
              title="الموظفون"
              description="أضف عضوا، وفوض له ما يخصه من الخدمات."
            />
          )}
          <NavCard
            href={`${base}/templates`}
            icon={<FolderOpen className="size-5" />}
            title="مكتبة النماذج"
            description="نماذج جاهزة تشاركها زاد مع الجمعيات."
          />
        </div>
      </section>

      <WeekAhead items={home.agenda} nowMs={home.nowMs} />

      <ZadContacts contacts={home.contacts} />

      <p className="text-meta text-slate-400">
        لم تجد ما تبحث عنه؟{" "}
        <Link href={`${base}/profile`} className="text-primary hover:underline dark:text-teal-300">
          ملف الحساب
        </Link>{" "}
        وبقية الأقسام في الشريط الجانبي.
      </p>
    </div>
  );
}
