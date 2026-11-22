import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Building2, Gem, Landmark, Scale, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/console/layout";
import { NavCard, Note, card } from "@/components/console/ui";
import { prisma } from "@/lib/db";
import { requirePortalPermission } from "@/lib/portalAccess";
import {
  CHARITY_SIZES,
  GUIDE_SIZE_COOKIE,
  guideTotals,
  isGuideSize,
  type GuideSizeId,
} from "@/lib/governanceGuide";
import { governanceManuals } from "@/data/governanceManual";

export const metadata: Metadata = { title: "دليل الحوكمة" };

/** أيقونةُ الحجم — وهي في الدليل من قبلُ، فلم تُفرض على بطاقةٍ لم تحملها. */
const SIZE_ICON: Record<GuideSizeId, typeof Building2> = {
  MICRO: Building2,
  SMALL: Building2,
  MEDIUM: Landmark,
  LARGE: TrendingUp,
  MEGA: Gem,
};

/**
 * دليلُ الحوكمة — بابُه: أيُّ حجمٍ تُقاس به الجمعية.
 *
 * **والحجمُ يُقرأ من ملفِّ الجمعية أوّلاً**: زادٌ تسجّله في `Charity.size`،
 * وهو الخبرُ الصحيح. فإن لم يُسجَّل قُرئ اختيارٌ سابقٌ من كعكةٍ في المتصفّح،
 * فإن لم يكن عُرضت الأحجام.
 *
 * **وكانت تُقرأ من `localStorage` ومن كعكةٍ معاً**: الأولى بعد رسم الصفحة،
 * فتُرسم شاشةُ الأحجام ثمّ تُقفز عنها — ومصدران لخبرٍ واحدٍ يختلفان. فبقيت
 * الكعكةُ وحدَها: تُقرأ على الخادم، فلا ترتدّ الصفحةُ أمام العين.
 */
export default async function GovernancePage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  /** `change=1` — «تغيير الحجم»: تُعرض الأحجامُ ولو كان محفوظاً. */
  searchParams: Promise<{ change?: string }>;
}) {
  const { name } = await params;
  const { change } = await searchParams;
  const access = await requirePortalPermission(name, "view_governance");
  const base = `/portal/${encodeURIComponent(access.charity.name)}/governance`;

  if (!change) {
    const saved = await savedSize(access.charity.id, access.charity.name);
    if (saved) redirect(`${base}/standards?size=${saved}`);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        icon={<Scale className="size-6" />}
        title="دليل الحوكمة"
        description="معايير الحوكمة ومؤشراتها والشواهد المطلوبة في كل مؤشر، كما يصنفها المركز الوطني لتنمية القطاع غير الربحي."
      />

      <Note tone="warn">
        <span className="font-semibold">درجة الحوكمة شرط للدعم.</span> عدم تحقيق درجة الاجتياز قد
        يعرض الجمعية لإيقاف الدعم الحكومي وتجميد الحسابات البنكية، فحدث بياناتك في منصة المركز أولا
        بأول.
      </Note>

      <section className={`${card.static} p-5`}>
        <h2 className="text-title font-semibold text-slate-900 dark:text-slate-100">ما الحوكمة؟</h2>
        <p className="mt-1.5 max-w-3xl text-body leading-6 text-slate-500 dark:text-slate-400">
          نظام يحدد من يتخذ القرار وكيف يتخذه، ويوزع الأدوار والمسؤوليات بوضوح بين الجمعية العمومية
          ومجلس الإدارة والإدارة التنفيذية — لتبلغ الجمعية أهدافها بشفافية ومسؤولية.
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-section font-semibold tracking-tight">اختر حجم الجمعية</h2>
          <p className="mt-0.5 text-body text-slate-500 dark:text-slate-400">
            الحجم يحدد المعايير المطلوبة منك. والحد إيراد السنة.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CHARITY_SIZES.map((size) => {
            const Icon = SIZE_ICON[size.id];
            const totals = guideTotals(governanceManuals[size.id] ?? []);
            return (
              <NavCard
                key={size.id}
                href={`${base}/standards?size=${size.id}`}
                icon={<Icon className="size-5" />}
                title={size.title}
                description={size.revenue}
                meta={`${totals.standards} معايير · ${totals.indicators} مؤشرا`}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

/**
 * الحجمُ المحفوظُ لهذه الجمعية: ملفُّها أوّلاً ثمّ كعكةُ المتصفّح.
 *
 * ومحروسٌ: `size` عمودٌ قد لا يكون في قاعدةٍ لم تُهاجَر بعد، ودليلٌ كاملٌ لا
 * يسقط لعمودٍ ناقص — تُعرض الأحجامُ ويُختار منها.
 */
async function savedSize(charityId: string, charityName: string): Promise<GuideSizeId | null> {
  try {
    const charity = await prisma.charity.findUnique({
      where: { id: charityId },
      select: { size: true },
    });
    const size = charity?.size;
    if (isGuideSize(size)) return size;
  } catch {
    // ويُمضى إلى الكعكة.
  }

  const jar = await cookies();
  const picked = jar.get(`${GUIDE_SIZE_COOKIE}_${encodeURIComponent(charityName)}`)?.value;
  return isGuideSize(picked) ? picked : null;
}
