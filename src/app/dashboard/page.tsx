import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import type { Metadata } from "next";
import { getCharities } from "@/app/actions/charity";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "الرئيسية | زاد التنموية",
  description: "لوحة التحكم الرئيسية لزاد التنموية",
};

export default async function MainDashboard() {
  const charities = await getCharities();
  
  const responses = await prisma.surveyResponse.findMany();
  const hexagonalResponses = await prisma.hexagonalResponse.findMany();

  // Calculate surveys per charity
  const surveyCounts = new Map<string, { readiness: number, hexagonal: number }>();
  
  responses.forEach(r => {
    const name = r.charityName.trim();
    if (!surveyCounts.has(name)) surveyCounts.set(name, { readiness: 0, hexagonal: 0 });
    surveyCounts.get(name)!.readiness++;
  });
  
  hexagonalResponses.forEach(h => {
    const name = h.charityName.trim();
    if (!surveyCounts.has(name)) surveyCounts.set(name, { readiness: 0, hexagonal: 0 });
    surveyCounts.get(name)!.hexagonal++;
  });

  const surveysList = Array.from(surveyCounts.entries()).map(([name, counts]) => ({
    name,
    readiness: counts.readiness,
    hexagonal: counts.hexagonal,
    total: counts.readiness + counts.hexagonal
  })).sort((a, b) => b.total - a.total);
  const totalSurveys = responses.length + hexagonalResponses.length;

  const navItems = [
    { label: "الرئيسية", href: "/dashboard", active: true },
    { label: "الجمعيات", href: "/dashboard/charities", active: false },
    { label: "الاستبيانات", href: "/dashboard/surveys", active: false }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      <Header title="بيانات الشركة" showSidebarToggle navItems={navItems} />
      
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto px-4 relative">
        <main className="flex-1 min-w-0 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">نظرة عامة</h1>
            <p className="text-slate-600">ملخص بيانات الشركة والجمعيات المتعاقد معها</p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">الجمعيات المتعاقد معها</p>
                <h3 className="text-2xl font-bold text-slate-800">{charities.length}</h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 opacity-75">
              <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">الجمعيات المستهدفة</p>
                <h3 className="text-2xl font-bold text-slate-800 text-sm mt-1">سيتم الإضافة قريباً</h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary-foreground shrink-0">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">إجمالي الاستبيانات</p>
                <h3 className="text-2xl font-bold text-slate-800">{totalSurveys}</h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 opacity-75">
              <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">مبالغ التعاقدات</p>
                <h3 className="text-2xl font-bold text-slate-800 text-sm mt-1">سيتم الإضافة قريباً</h3>
              </div>
            </div>
          </div>

          {/* Surveys Table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">عدد الاستبيانات المعبأة</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm tracking-wide">
                    <th className="p-5 font-bold uppercase">اسم الجمعية</th>
                    <th className="p-5 font-bold uppercase text-center">مقياس الجاهزية</th>
                    <th className="p-5 font-bold uppercase text-center">التحليل السداسي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {surveysList.map((survey) => (
                    <tr key={survey.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-bold text-slate-800">{survey.name}</td>
                      <td className="p-5 text-center font-bold">
                        {survey.readiness > 0 ? (
                          <span className="inline-block bg-primary/5 text-primary px-4 py-1.5 rounded-lg text-xs font-bold border border-primary/10">
                            {survey.readiness}
                          </span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-5 text-center font-bold">
                        {survey.hexagonal > 0 ? (
                          <span className="inline-block bg-secondary/10 text-secondary-foreground px-4 py-1.5 rounded-lg text-xs font-bold border border-secondary/20">
                            {survey.hexagonal}
                          </span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                    </tr>
                  ))}
                  {surveysList.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-16 text-center text-slate-500">
                        <p className="font-medium">لا توجد استبيانات معبأة حالياً.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
