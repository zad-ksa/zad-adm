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
      <div className="mb-6 print:hidden transition-colors">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 transition-colors">الاستراتيجية</h1>
        <p className="text-slate-500 dark:text-slate-400 transition-colors">البيانات الاستراتيجية، الأداء، ونتائج التحليلات الخاصة بالجمعية.</p>
      </div>

      <div className="print:hidden">
        <StrategyTabs charityName={decodedName} />
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-b-3xl rounded-tl-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700 print:shadow-none print:border-none print:p-0 print:m-0 transition-colors">
        {children}
      </div>
    </div>
  );
}
