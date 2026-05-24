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

export default async function CharityPerformancePage({ params, searchParams }: { params: Promise<{ name: string }>, searchParams: Promise<{ year?: string, quarter?: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  
  const searchParamsObj = await searchParams;
  const year = searchParamsObj?.year ? parseInt(searchParamsObj.year) : new Date().getFullYear();
  const quarter = searchParamsObj?.quarter || "Q1";

  const metric = await getPerformanceMetric(decodedName, year);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span>📈</span> إدارة مقياس الأداء
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
