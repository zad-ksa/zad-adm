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
      <div className="bg-white rounded-2xl p-8 border border-slate-200">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">الملف التعريفي للجمعية</h1>
          <p className="text-slate-500 mb-8 text-sm">نظرة عامة على البيانات الأساسية لـ {decodedName}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-400 mb-2">اسم الجمعية</div>
              <div className="text-lg font-bold text-slate-800">{decodedName}</div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-400 mb-2">تاريخ التأسيس</div>
              <div className="text-lg font-bold text-slate-800">
                {latestReadiness?.establishmentDate || "غير متوفر"}
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-400 mb-2">رقم التصريح</div>
              <div className="text-lg font-bold text-slate-800">
                {latestReadiness?.licenseNumber || "غير متوفر"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">المزيد من البيانات قريباً</h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm">
            يتم العمل حالياً على استكمال ربط ملف الجمعية بالبيانات المالية والإدارية الشاملة.
          </p>
        </div>
      </div>
    </div>
  );
}
