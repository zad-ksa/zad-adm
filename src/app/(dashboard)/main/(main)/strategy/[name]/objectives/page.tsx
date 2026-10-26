import type { Metadata } from "next";
import { BookOpen, LineChart, Gauge } from "lucide-react";
import { requireCharitySection } from "@/lib/sectionGuard";
import { NavCard } from "@/components/console/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - دليل الأهداف والمؤشرات | زاد التنموية` };
}

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  await requireCharitySection("manage_strategy", decodedName);
  const base = `/main/strategy/${encodeURIComponent(decodedName)}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NavCard
        href={`${base}/objectives/guide`}
        icon={<BookOpen className="size-5" />}
        title="دليل الأهداف والمؤشرات"
        description="الوثيقة المعتمدة: الأبعاد والأهداف والمؤشرات وتعريفاتها."
      />
      <NavCard
        href={`${base}/objectives/tracking`}
        icon={<LineChart className="size-5" />}
        title="متابعة الأداء"
        description="مستهدفات الأرباع ومتحققها، وأداء الهدف والمحور والجمعية."
      />
      <NavCard
        href={`${base}/objectives/dashboard`}
        icon={<Gauge className="size-5" />}
        title="لوحة المعلومات"
        description="نتيجة الأداء العام وتوزيع حالات المؤشرات."
      />
    </div>
  );
}
