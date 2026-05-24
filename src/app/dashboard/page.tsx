import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Link from "next/link";
import CopyLinkButton from "@/components/CopyLinkButton";
import type { Metadata } from "next";
import CompanySidebar from "./CompanySidebar";
import { getCharities, bootstrapCharities } from "@/app/actions/charity";
import ApproveCharityButton from "./ApproveCharityButton";

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

  // Determine pending/unregistered charities
  const registeredNames = new Set(charities.map(c => c.name.trim().toLowerCase()));
  
  const pendingResponses = responses.filter(r => !registeredNames.has(r.charityName.trim().toLowerCase()));
  const pendingHexs = hexagonalResponses.filter(h => !registeredNames.has(h.charityName.trim().toLowerCase()));

  const pendingCharitiesMap = new Map<string, {
    name: string;
    readinessCount: number;
    hexagonalCount: number;
    establishmentDate?: string;
    licenseNumber?: string;
    latestDate: Date;
  }>();

  pendingResponses.forEach(r => {
    const name = r.charityName.trim();
    const key = name.toLowerCase();
    if (!pendingCharitiesMap.has(key)) {
      pendingCharitiesMap.set(key, {
        name,
        readinessCount: 0,
        hexagonalCount: 0,
        establishmentDate: r.establishmentDate || undefined,
        licenseNumber: r.licenseNumber || undefined,
        latestDate: new Date(r.createdAt),
      });
    }
    const item = pendingCharitiesMap.get(key)!;
    item.readinessCount++;
    if (r.establishmentDate && !item.establishmentDate) {
      item.establishmentDate = r.establishmentDate;
    }
    if (r.licenseNumber && !item.licenseNumber) {
      item.licenseNumber = r.licenseNumber;
    }
    if (new Date(r.createdAt) > item.latestDate) {
      item.latestDate = new Date(r.createdAt);
    }
  });

  pendingHexs.forEach(h => {
    const name = h.charityName.trim();
    const key = name.toLowerCase();
    if (!pendingCharitiesMap.has(key)) {
      pendingCharitiesMap.set(key, {
        name,
        readinessCount: 0,
        hexagonalCount: 0,
        latestDate: new Date(h.createdAt),
      });
    }
    const item = pendingCharitiesMap.get(key)!;
    item.hexagonalCount++;
    if (new Date(h.createdAt) > item.latestDate) {
      item.latestDate = new Date(h.createdAt);
    }
  });

  const pendingCharitiesList = Array.from(pendingCharitiesMap.values());
  pendingCharitiesList.sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());

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

  let overallAverage = 0;
  const charitiesWithScore = charityStats.filter(c => c.readinessCount > 0);
  if (charitiesWithScore.length > 0) {
      overallAverage = Math.round(charitiesWithScore.reduce((acc, curr) => acc + curr.averagePercentage, 0) / charitiesWithScore.length);
  }
  const totalSurveys = responses.length + hexagonalResponses.length;

  return (
    <div className="min-h-screen bg-[#1a1d21] flex flex-col text-slate-200" dir="rtl">
      <Header title="لوحة التحكم" isDark={true} />
      
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto px-4 py-8 gap-8">
        {/* Company Sidebar Component */}
        <CompanySidebar charities={charities.map(c => ({ id: c.id, name: c.name }))} />

        <main className="flex-1 min-w-0">
          <div className="mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">لوحة تحكم زاد التنموية</h1>
              <p className="text-slate-400">نظرة عامة على الجمعيات وإحصائيات الاستبيانات</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <CopyLinkButton />
              <CopyLinkButton path="/hexagonal" label="رابط التحليل السداسي" />
            </div>
          </div>

          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#212529] p-6 rounded-2xl border border-[#32383e] shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <p className="text-slate-400 text-sm font-semibold mb-1">إجمالي الجمعيات</p>
                  <h3 className="text-3xl font-bold text-white">{charities.length}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary-300 text-2xl shadow-inner border border-primary/20">
                  🏢
                </div>
              </div>
              <div className="text-xs text-slate-500 relative z-10"><span className="text-primary-400">مسجلة</span> في النظام</div>
            </div>

            <div className="bg-[#212529] p-6 rounded-2xl border border-[#32383e] shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <p className="text-slate-400 text-sm font-semibold mb-1">إجمالي الاستبيانات</p>
                  <h3 className="text-3xl font-bold text-white">{totalSurveys}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary-foreground text-2xl shadow-inner border border-secondary/20">
                  📄
                </div>
              </div>
              <div className="text-xs text-slate-500 relative z-10">جاهزية وتحليل سداسي</div>
            </div>

            <div className="bg-[#212529] p-6 rounded-2xl border border-[#32383e] shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <p className="text-slate-400 text-sm font-semibold mb-1">الاستبيانات المعلقة</p>
                  <h3 className="text-3xl font-bold text-white">{pendingCharitiesList.length}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 text-2xl shadow-inner border border-amber-500/20">
                  ⏳
                </div>
              </div>
              <div className="text-xs text-slate-500 relative z-10">بانتظار الاعتماد</div>
            </div>

            <div className="bg-[#212529] p-6 rounded-2xl border border-[#32383e] shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <p className="text-slate-400 text-sm font-semibold mb-1">متوسط الجاهزية</p>
                  <h3 className="text-3xl font-bold text-white">{overallAverage}%</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 text-2xl shadow-inner border border-green-500/20">
                  📈
                </div>
              </div>
              <div className="text-xs text-slate-500 relative z-10">لجميع الجمعيات المقيمة</div>
            </div>
          </div>

          {/* Pending Submissions Section */}
          {pendingCharitiesList.length > 0 && (
            <div className="mb-8 bg-amber-900/20 rounded-3xl p-6 border border-amber-700/30 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 bg-amber-500 h-full"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 text-xl font-bold shadow-sm border border-amber-500/20">
                    ⚠️
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-amber-500">استبيانات معلقة من جمعيات غير مسجلة</h2>
                    <p className="text-xs text-amber-400/80 mt-0.5">هناك استبيانات مرسلة من جمعيات غير مضافة لقائمة الجمعيات المتعاقد معها. يمكنك تفعيلها لإدراجها تلقائياً.</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#1a1d21] rounded-2xl border border-amber-700/30 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse whitespace-nowrap text-xs">
                    <thead>
                      <tr className="bg-[#212529] border-b border-[#32383e] text-slate-300 font-bold">
                        <th className="p-4 font-bold text-right">اسم الجمعية المعلقة</th>
                        <th className="p-4 text-center font-bold">مقياس الجاهزية</th>
                        <th className="p-4 text-center font-bold">التحليل السداسي</th>
                        <th className="p-4 font-bold">تاريخ التأسيس</th>
                        <th className="p-4 font-bold">رقم الترخيص</th>
                        <th className="p-4 font-bold">آخر نشاط</th>
                        <th className="p-4 text-center font-bold">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#32383e] text-slate-300">
                      {pendingCharitiesList.map((pending) => (
                        <tr key={pending.name} className="hover:bg-amber-500/5 transition-colors">
                          <td className="p-4 font-bold text-white text-sm">{pending.name}</td>
                          <td className="p-4 text-center font-bold">
                            {pending.readinessCount > 0 ? (
                              <span className="inline-block bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full">
                                {pending.readinessCount} استبيان
                              </span>
                            ) : (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4 text-center font-bold">
                            {pending.hexagonalCount > 0 ? (
                              <span className="inline-block bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full">
                                {pending.hexagonalCount} استبيان
                              </span>
                            ) : (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-400">{pending.establishmentDate || "-"}</td>
                          <td className="p-4 text-slate-400">{pending.licenseNumber || "-"}</td>
                          <td className="p-4 text-slate-500">
                            {new Date(pending.latestDate).toLocaleDateString("ar-SA", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="p-4 text-center flex justify-center items-center">
                            <ApproveCharityButton
                              name={pending.name}
                              establishmentDate={pending.establishmentDate}
                              licenseNumber={pending.licenseNumber}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#212529] rounded-3xl shadow-sm border border-[#32383e] overflow-hidden">
            <div className="p-5 border-b border-[#32383e] flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">الجمعيات المتعاقد معها</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#1a1d21] border-b border-[#32383e] text-slate-400 text-sm">
                    <th className="p-5 font-semibold">اسم الجمعية</th>
                    <th className="p-5 font-semibold text-center">الاستبيانات</th>
                    <th className="p-5 font-semibold text-center">التحليل السداسي</th>
                    <th className="p-5 font-semibold">تاريخ التأسيس</th>
                    <th className="p-5 font-semibold">رقم التصريح</th>
                    <th className="p-5 font-semibold">آخر نشاط</th>
                    <th className="p-5 font-semibold text-center">متوسط الجاهزية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#32383e]">
                  {charityStats.map((charity) => (
                    <tr key={charity.id} className="hover:bg-[#1a1d21]/50 transition-colors">
                      <td className="p-5 font-bold text-primary-400 hover:text-primary-300 hover:underline">
                        <Link href={`/dashboard/charity/${encodeURIComponent(charity.name)}`}>
                          {charity.name}
                        </Link>
                      </td>
                      <td className="p-5 text-slate-300 text-center font-bold">
                        {charity.readinessCount > 0 ? (
                          <span className="inline-block bg-primary/20 border border-primary/30 text-primary-300 px-3 py-1 rounded-full text-xs">
                            {charity.readinessCount}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-5 text-slate-300 text-center font-bold">
                        {charity.hexagonalCount > 0 ? (
                          <span className="inline-block bg-secondary/20 border border-secondary/30 text-secondary-foreground px-3 py-1 rounded-full text-xs">
                            {charity.hexagonalCount}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-5 text-slate-400">{charity.establishmentDate || "-"}</td>
                      <td className="p-5 text-slate-400">{charity.licenseNumber || "-"}</td>
                      <td className="p-5 text-slate-500 text-sm">
                        {new Date(charity.latestDate).toLocaleDateString("ar-SA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="p-5 text-center">
                        {charity.readinessCount > 0 ? (
                          <div className="flex items-center justify-center">
                            <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center justify-center border
                              ${
                                charity.averagePercentage >= 80 ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                charity.averagePercentage >= 60 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                charity.averagePercentage >= 40 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                                "bg-red-500/20 text-red-400 border-red-500/30"
                              }
                            `}>
                              {charity.averagePercentage}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">لا يوجد مقياس</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {charityStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500">
                        <div className="text-4xl mb-4">🏢</div>
                        <h3 className="text-lg font-bold text-slate-300 mb-2">لا توجد جمعيات مضافة</h3>
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
