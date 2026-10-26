import type { Metadata } from "next";
import { ClipboardList, Hexagon } from "lucide-react";
import { requireCharitySection } from "@/lib/sectionGuard";
import { NavCard } from "@/components/console/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - التحليل الاستراتيجي | زاد التنموية` };
}

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  await requireCharitySection("manage_strategy", decodedName);
  const base = `/main/strategy/${encodeURIComponent(decodedName)}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NavCard
        href={`${base}/analysis/readiness`}
        icon={<ClipboardList className="size-5" />}
        title="استبيان الجاهزية"
        description="جاهزية الجمعية للتخطيط الاستراتيجي ومتوسط درجاتها."
      />
      <NavCard
        href={`${base}/analysis/hexagonal`}
        icon={<Hexagon className="size-5" />}
        title="التحليل السداسي"
        description="القوة والضعف والفرص والتهديدات كما رآها المشاركون."
      />
    </div>
  );
}
