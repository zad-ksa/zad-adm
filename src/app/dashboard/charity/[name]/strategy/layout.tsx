import { ReactNode } from "react";
import StrategyTabs from "./StrategyTabs";

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
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">الاستراتيجية</h1>
        <p className="text-slate-500">البيانات الاستراتيجية، الأداء، ونتائج التحليلات الخاصة بالجمعية.</p>
      </div>

      <StrategyTabs charityName={decodedName} />

      <div className="flex-1 bg-white rounded-b-3xl rounded-tl-3xl p-6 md:p-8 shadow-sm border border-slate-200">
        {children}
      </div>
    </div>
  );
}
