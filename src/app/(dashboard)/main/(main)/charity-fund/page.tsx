import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/console/layout";
import { Badge } from "@/components/console/ui";
import { requireDonorViewer } from "@/lib/donorScope";
import { loadSingletonDonor } from "../donors/donorData";
import DonorDetail from "../donors/DonorDetail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "صندوق دعم الجمعيات" };

/**
 * تبويبُ «صندوق دعم الجمعيات» — تحت التطوير، وفيه ما يعمل اليوم.
 *
 * فالصندوقُ جهةٌ واحدةٌ لها حساباتٌ ومنحٌ مسجَّلةٌ في الموقع، وصفحةٌ فارغةٌ كانت
 * ستحجبها عن أصحابها. فتُعرض بصفحة الجهة نفسها وشارةُ «تحت التطوير» تقول إن
 * للتبويب بقيّةً تُبنى.
 */
export default async function CharityFundPage() {
  const viewer = await requireDonorViewer();
  const detail = await loadSingletonDonor(viewer, "CHARITY_FUND");

  if (!detail) {
    return (
      <div className="space-y-6" dir="rtl">
        <PageHeader
          crumbs={[{ label: "تنمية الموارد المالية" }, { label: "صندوق دعم الجمعيات" }]}
          icon={<Landmark className="size-6" />}
          title="صندوق دعم الجمعيات"
          description={<Badge tone="gold">تحت التطوير</Badge>}
        />
        <EmptyState
          icon={<Landmark className="size-4" />}
          title="لا صفَّ للصندوق في الجهات المانحة"
          description="يُنشأ من صفحة الجهات المانحة أو بسكربت الاستيراد."
        />
      </div>
    );
  }

  return (
    <DonorDetail
      org={detail.row}
      kind={detail.kind}
      charities={viewer.charities}
      accounts={detail.accounts}
      grants={detail.grants}
      underDevelopment
    />
  );
}
