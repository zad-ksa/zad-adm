import type { Metadata } from "next";
import { ListChecks, Gauge } from "lucide-react";
import { requireCharitySection } from "@/lib/sectionGuard";
import { NavCard } from "@/components/console/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - الخطة التشغيلية | زاد التنموية` };
}

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  await requireCharitySection("manage_strategy", decodedName);
  const base = `/main/strategy/${encodeURIComponent(decodedName)}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NavCard
        href={`${base}/operational/initiatives`}
        icon={<ListChecks className="size-5" />}
        title="كشاف المبادرات"
        description="المبادرات ومدّتها ومديرها وموازنتها ونسبة إنجازها."
      />
      <NavCard
        href={`${base}/operational/dashboard`}
        icon={<Gauge className="size-5" />}
        title="لوحة المعلومات"
        description="حالات المبادرات ومؤشرات الإدارات ونسب الصرف."
      />
    </div>
  );
}
