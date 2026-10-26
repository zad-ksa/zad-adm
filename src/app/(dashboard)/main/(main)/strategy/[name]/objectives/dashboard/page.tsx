import type { Metadata } from "next";
import { HardHat } from "lucide-react";
import { requireCharitySection } from "@/lib/sectionGuard";
import { EmptyState } from "@/components/console/layout";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - لوحة معلومات الأهداف | زاد التنموية` };
}

/**
 * لوحة معلومات الأهداف — تُبنى في المرحلة السادسة من docs/خطة-نظام-التخطيط-الاستراتيجي.md
 *
 * وهي صفحةٌ صريحةٌ لا رابطٌ مكسور: المربّع الذي يقود إليها موجودٌ من المرحلة
 * الثالثة، فالأولى أن يصل إلى بيانٍ لا إلى صفحة ٤٠٤.
 */
export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  await requireCharitySection("manage_strategy", decodeURIComponent(name));

  return (
    <EmptyState
      icon={<HardHat className="size-6" />}
      title="هذه الصفحة قيد الإنشاء"
      description="نتيجة الأداء العام، وتوزيع حالات المؤشرات للعام وللأرباع الأربعة."
    />
  );
}
