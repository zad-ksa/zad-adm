import { getPerformanceMetric } from "@/app/actions/performance";
import PerformanceTable from "@/components/PerformanceTable";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} - مقياس الأداء | زاد التنموية`,
  };
}

const MetricIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary">
    <path d="M3 3v18h18" />
    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
  </svg>
);

export default async function CharityPerformancePage({ params, searchParams }: { params: Promise<{ name: string }>, searchParams: Promise<{ year?: string, quarter?: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  
  const searchParamsObj = await searchParams;
  const year = searchParamsObj?.year ? parseInt(searchParamsObj.year) : new Date().getFullYear();
  const quarter = searchParamsObj?.quarter || "Q1";

  const metric = await getPerformanceMetric(decodedName, year);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
          <MetricIcon />
        </div>
        إدارة مقياس الأداء
      </h2>
      <p className="text-slate-500 mb-8">
        إدارة وتحديث مؤشرات الأداء والأهداف للربع {quarter} من عام {year}.
      </p>
      
      <PerformanceTable 
        charityName={decodedName} 
        year={year} 
        quarter={quarter}
        initialData={metric?.data as any || null} 
      />
    </div>
  );
}
