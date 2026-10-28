import type { Metadata } from "next";
import { Globe } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/console/layout";
import { Badge } from "@/components/console/ui";
import { requireDonorViewer } from "@/lib/donorScope";
import { loadSingletonDonor } from "../donors/donorData";
import DonorDetail from "../donors/DonorDetail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "منصة إحسان" };

/**
 * تبويبُ «منصة إحسان» — تحت التطوير، وفيه ما يعمل اليوم.
 *
 * فالمنصّةُ جهةٌ واحدةٌ لها حساباتٌ ومنحٌ مسجَّلةٌ في الموقع، وصفحةٌ فارغةٌ كانت
 * ستحجبها عن أصحابها. فتُعرض بصفحة الجهة نفسها وشارةُ «تحت التطوير» تقول إن
 * للتبويب بقيّةً تُبنى.
 */
export default async function EhsanPage() {
  const viewer = await requireDonorViewer();
  const detail = await loadSingletonDonor(viewer, "EHSAN");

  if (!detail) {
    return (
      <div className="space-y-6" dir="rtl">
        <PageHeader
          crumbs={[{ label: "تنمية الموارد المالية" }, { label: "منصة إحسان" }]}
          icon={<Globe className="size-6" />}
          title="منصة إحسان"
          description={<Badge tone="gold">تحت التطوير</Badge>}
        />
        <EmptyState
          icon={<Globe className="size-4" />}
          title="لا صفَّ للمنصّة في الجهات المانحة"
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
