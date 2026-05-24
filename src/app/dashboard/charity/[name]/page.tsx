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
      <div className="bg-[#212529] rounded-3xl p-8 shadow-sm border border-[#32383e] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full -ml-20 -mt-20 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">الملف التعريفي للجمعية</h1>
          <p className="text-slate-400 mb-8">نظرة عامة على البيانات الأساسية لـ {decodedName}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#1a1d21] p-6 rounded-2xl border border-[#32383e]">
              <div className="text-sm font-semibold text-slate-400 mb-2">اسم الجمعية</div>
              <div className="text-xl font-bold text-white">{decodedName}</div>
            </div>

            <div className="bg-[#1a1d21] p-6 rounded-2xl border border-[#32383e]">
              <div className="text-sm font-semibold text-slate-400 mb-2">تاريخ التأسيس</div>
              <div className="text-xl font-bold text-white">
                {latestReadiness?.establishmentDate || "غير متوفر"}
              </div>
            </div>

            <div className="bg-[#1a1d21] p-6 rounded-2xl border border-[#32383e]">
              <div className="text-sm font-semibold text-slate-400 mb-2">رقم التصريح</div>
              <div className="text-xl font-bold text-white">
                {latestReadiness?.licenseNumber || "غير متوفر"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#212529] rounded-3xl p-8 shadow-sm border border-[#32383e]">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-xl font-bold text-white mb-2">المزيد من البيانات قريباً</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            يتم العمل حالياً على استكمال ربط ملف الجمعية بالبيانات المالية والإدارية الشاملة.
          </p>
        </div>
      </div>
    </div>
  );
}
