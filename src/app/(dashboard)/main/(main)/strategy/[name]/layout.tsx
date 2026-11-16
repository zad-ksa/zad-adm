import { ReactNode } from "react";
import { prisma } from "@/lib/db";
import StrategyHeader from "./StrategyHeader";
import StrategySurface from "./StrategySurface";

export default async function StrategyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // الكيان الداخلي («شركة زاد») لا يبدأ مساره بـ«الجمعيات» ولا يقود إلى
  // صفحة الخدمات، فهو مستثنًى من قوائمها.
  const entity = await prisma.charity.findUnique({
    where: { name: decodedName },
    select: { isInternal: true },
  });

  return (
    <div className="flex h-full flex-col">
      {/* والغلافُ في الترويسة نفسِها: صفحةٌ تكتب ترويستَها بنفسها تُسكِتها،
          فلا يبقى فراغُ هامشٍ فوق متنها. */}
      <StrategyHeader charityName={decodedName} isInternal={entity?.isInternal ?? false} />

      <StrategySurface>{children}</StrategySurface>
    </div>
  );
}
