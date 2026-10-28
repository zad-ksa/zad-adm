import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { PageHeader, EmptyState } from "@/components/console/layout";
import { Badge } from "@/components/console/ui";
import { Hammer, Rss } from "lucide-react";

/**
 * آخر المستجدات — صفحةٌ محجوزةٌ بصلاحيتها، وفارغةٌ حتى يُبنى محتواها.
 *
 * والبوابةُ أوّلاً لا أخيراً: الصفحةُ تُحجَز من يومها لا يوم تمتلئ، فلا يُفتح
 * بابٌ ثم يُغلَق بعد أن دخل منه أحد. والتحقّقُ في الخادم لا بإخفاء وسمٍ في
 * القائمة: إخفاءُ الرابط ليس منعاً.
 */
export default async function LatestUpdatesPage() {
  const session = await getSession();
  if (!session?.id) redirect("/login");
  if (!hasPermission(session.role, session.permissions || [], "view_latest_updates")) {
    redirect("/main");
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <PageHeader
        icon={<Rss className="w-6 h-6" />}
        title="آخر المستجدات"
        description="الصفحة تحت التطوير"
        actions={<Badge tone="gold">تحت التطوير</Badge>}
      />

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <EmptyState
          icon={<Hammer className="w-5 h-5" />}
          title="هذه الصفحة تحت التطوير"
          description="لا محتوى بعد — سيُضاف هنا ما يستجدّ أوّلاً بأوّل."
        />
      </div>
    </div>
  );
}
