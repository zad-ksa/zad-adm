import { getPerformanceMetric } from "@/app/actions/performance";
import Header from "@/components/Header";
import PerformanceTable from "@/components/PerformanceTable";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CharityPerformancePage({ params, searchParams }: { params: { name: string }, searchParams: { year?: string, quarter?: string } }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  
  const searchParamsObj = await searchParams;
  const year = searchParamsObj?.year ? parseInt(searchParamsObj.year) : new Date().getFullYear();
  const quarter = searchParamsObj?.quarter || "Q1";

  const metric = await getPerformanceMetric(decodedName, year);

  return (
    <div className="min-h-screen bg-slate-50 pb-12 text-right" dir="rtl">
      <Header title={`مقياس الأداء - ${decodedName}`} />
      
      <main className="max-w-[1400px] mx-auto px-4 py-8">
        <Link href={`/dashboard/charity/${encodeURIComponent(decodedName)}`} className="inline-flex items-center text-primary hover:underline font-bold mb-8 transition-colors">
          <span className="ml-2">← العودة لملف الجمعية</span>
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">مقياس الأداء</h1>
            <p className="text-slate-500 mb-6">إدارة وتحديث مؤشرات الأداء للجمعية</p>
            
            <PerformanceTable 
              charityName={decodedName} 
              year={year} 
              quarter={quarter}
              initialData={metric?.data as any || null} 
            />
        </div>
      </main>
    </div>
  );
}
