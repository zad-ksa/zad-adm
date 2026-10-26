import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { requireCharitySection } from "@/lib/sectionGuard";
import { NavCard } from "@/components/console/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - بناء التوجه الاستراتيجي | زاد التنموية` };
}

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  await requireCharitySection("manage_strategy", decodedName);
  const base = `/main/strategy/${encodeURIComponent(decodedName)}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NavCard
        href={`${base}/direction/vision-mission`}
        icon={<Compass className="size-5" />}
        title="استبيان الرؤية والرسالة والأثر"
        description="ردود الاستبيان وما استُخلص منه من رؤيةٍ ورسالةٍ وقيم."
      />
    </div>
  );
}
