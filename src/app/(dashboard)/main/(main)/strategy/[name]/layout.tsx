import { ReactNode } from "react";
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

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 print:hidden">
        <StrategyHeader charityName={decodedName} />
      </div>

      <StrategySurface>{children}</StrategySurface>
    </div>
  );
}
