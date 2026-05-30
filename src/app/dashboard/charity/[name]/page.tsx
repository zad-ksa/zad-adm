import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | الملف التعريفي`,
  };
}

export default async function CharityOverview({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // Here we can fetch basic charity info. For now we will display a simple overview
  // Since we don't have a dedicated Charity model yet, we'll fetch from survey responses to get some metadata.
  const allResponses = await prisma.surveyResponse.findMany({
    orderBy: { createdAt: "desc" },
  });

  const responses = allResponses.filter(
    (res) => res.charityName.trim().toLowerCase() === decodedName.trim().toLowerCase()
  );

  const latestReadiness = responses.length > 0 ? responses[0] : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm relative overflow-hidden">
        {/* Decorative subtle background element */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-3xl border border-primary/20 shadow-inner">
              {decodedName.substring(0, 1)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-1 tracking-tight">{decodedName}</h1>
              <p className="text-slate-500 font-medium">الملف التعريفي للجمعية</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-slate-400">🏢</span>
                <div className="text-sm font-bold text-slate-500">اسم الجمعية</div>
              </div>
              <div className="text-xl font-bold text-slate-800">{decodedName}</div>
            </div>

            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-slate-400">📅</span>
                <div className="text-sm font-bold text-slate-500">تاريخ التأسيس</div>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {latestReadiness?.establishmentDate || <span className="text-slate-300 font-medium text-sm">غير متوفر</span>}
              </div>
            </div>

            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-slate-400">📄</span>
                <div className="text-sm font-bold text-slate-500">رقم التصريح</div>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {latestReadiness?.licenseNumber || <span className="text-slate-300 font-medium text-sm">غير متوفر</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm relative overflow-hidden">
        {/* Subtle patterned background for empty state */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
        
        <div className="relative text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 border border-slate-100 shadow-sm">
            🚀
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">المزيد من البيانات قريباً</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            يتم العمل حالياً على استكمال ربط ملف الجمعية بالبيانات المالية والإدارية الشاملة لتوفير رؤية متكاملة.
          </p>
        </div>
      </div>
    </div>
  );
}
