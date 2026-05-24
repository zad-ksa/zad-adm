import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Link from "next/link";
import CopyLinkButton from "@/components/CopyLinkButton";
import type { Metadata } from "next";
import CompanySidebar from "./CompanySidebar";
import { getCharities, bootstrapCharities } from "@/app/actions/charity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "لوحة التحكم | زاد التنموية",
  description: "لوحة التحكم لاستبيانات زاد التنموية",
};

export default async function Dashboard() {
  let charities = await getCharities();
  
  // Auto-bootstrap charities if table is empty but we have survey data
  if (charities.length === 0) {
    await bootstrapCharities();
    charities = await getCharities();
  }

  const responses = await prisma.surveyResponse.findMany({
    orderBy: { createdAt: "desc" },
  });

  const hexagonalResponses = await prisma.hexagonalResponse.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Calculate stats for each charity
  const charityStats = charities.map(charity => {
    const charityResponses = responses.filter(r => r.charityName.trim() === charity.name.trim());
    const charityHexs = hexagonalResponses.filter(h => h.charityName.trim() === charity.name.trim());

    let averagePercentage = 0;
    if (charityResponses.length > 0) {
      const total = charityResponses.reduce((acc, curr) => acc + curr.scorePercentage, 0);
      averagePercentage = Math.round(total / charityResponses.length);
    }

    const dates = [
      ...charityResponses.map(r => new Date(r.createdAt)),
      ...charityHexs.map(h => new Date(h.createdAt))
    ];
    
    const latestDate = dates.length > 0 
      ? new Date(Math.max(...dates.map(d => d.getTime())))
      : new Date(charity.createdAt);

    return {
      ...charity,
      readinessCount: charityResponses.length,
      hexagonalCount: charityHexs.length,
      averagePercentage,
      latestDate
    };
  });

  // Sort by latest activity
  charityStats.sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      <Header title="لوحة التحكم" />
      
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto px-4 py-8 gap-8">
        {/* Company Sidebar Component */}
        <CompanySidebar charities={charities.map(c => ({ id: c.id, name: c.name }))} />

        <main className="flex-1 min-w-0">
          <div className="mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">لوحة تحكم زاد التنموية</h1>
              <p className="text-slate-600">قائمة بالجمعيات التي المتعاقد معها وإحصائيات الاستبيانات</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <CopyLinkButton />
              <CopyLinkButton path="/hexagonal" label="رابط التحليل السداسي" />
              <div className="bg-white px-5 py-2.5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center gap-2 text-sm">
                <span className="font-semibold text-slate-700">إجمالي الجمعيات: </span>
                <span className="text-primary font-extrabold text-lg">{charities.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                    <th className="p-5 font-semibold">اسم الجمعية</th>
                    <th className="p-5 font-semibold text-center">الاستبيانات</th>
                    <th className="p-5 font-semibold text-center">التحليل السداسي</th>
                    <th className="p-5 font-semibold">تاريخ التأسيس</th>
                    <th className="p-5 font-semibold">رقم التصريح</th>
                    <th className="p-5 font-semibold">آخر نشاط</th>
                    <th className="p-5 font-semibold text-center">متوسط الجاهزية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {charityStats.map((charity) => (
                    <tr key={charity.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 font-bold text-primary hover:underline">
                        <Link href={`/dashboard/charity/${encodeURIComponent(charity.name)}`}>
                          {charity.name}
                        </Link>
                      </td>
                      <td className="p-5 text-slate-600 text-center font-bold">
                        {charity.readinessCount > 0 ? (
                          <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs">
                            {charity.readinessCount}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-5 text-slate-600 text-center font-bold">
                        {charity.hexagonalCount > 0 ? (
                          <span className="inline-block bg-secondary/15 text-secondary-foreground px-3 py-1 rounded-full text-xs">
                            {charity.hexagonalCount}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-5 text-slate-600">{charity.establishmentDate || "-"}</td>
                      <td className="p-5 text-slate-600">{charity.licenseNumber || "-"}</td>
                      <td className="p-5 text-slate-600 text-sm">
                        {new Date(charity.latestDate).toLocaleDateString("ar-SA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="p-5 text-center">
                        {charity.readinessCount > 0 ? (
                          <div className="flex items-center justify-center">
                            <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center justify-center
                              ${
                                charity.averagePercentage >= 80 ? "bg-green-100 text-green-700" :
                                charity.averagePercentage >= 60 ? "bg-blue-100 text-blue-700" :
                                charity.averagePercentage >= 40 ? "bg-orange-100 text-orange-700" :
                                "bg-red-100 text-red-700"
                              }
                            `}>
                              {charity.averagePercentage}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">لا يوجد مقياس</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {charityStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500">
                        <div className="text-4xl mb-4">🏢</div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">لا توجد جمعيات مضافة</h3>
                        <p>استخدم زر "إضافة جمعية جديدة" من القائمة الجانبية للبدء.</p>
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
