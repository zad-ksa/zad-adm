import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import { getCharities } from "@/app/actions/charity";
import Link from "next/link";


const getCachedDashboardData = async () => {
    const [
      charities,
      allSurveys,
      allHexSurveys,
      allPrograms,
      dbNewsItems
    ] = await Promise.all([
      prisma.charity.findMany({ 
        select: { id: true, name: true, createdAt: true, domain: true, grants: true, logoUrl: true },
        orderBy: { createdAt: "desc" } 
      }),
      prisma.surveyResponse.findMany({ select: { id: true, charityName: true } }),
      prisma.hexagonalResponse.findMany({ select: { id: true, charityName: true } }),
      prisma.program.findMany({ select: { id: true, charityId: true, beneficiaries: true } }),
      prisma.news.findMany({ take: 5, orderBy: { createdAt: "desc" } })
    ]);

    // In-memory aggregations (much faster than unindexed DB groupBy)
    const surveyResponsesGrouped: any[] = [];
    const hexagonalResponsesGrouped: any[] = [];
    const programsGrouped: any[] = [];
    
    // Group surveys
    const surveyCountsMap = new Map<string, number>();
    allSurveys.forEach(s => {
      const name = s.charityName;
      surveyCountsMap.set(name, (surveyCountsMap.get(name) || 0) + 1);
    });
    surveyCountsMap.forEach((count, name) => surveyResponsesGrouped.push({ charityName: name, _count: { id: count } }));

    // Group hex surveys
    const hexCountsMap = new Map<string, number>();
    allHexSurveys.forEach(s => {
      const name = s.charityName;
      hexCountsMap.set(name, (hexCountsMap.get(name) || 0) + 1);
    });
    hexCountsMap.forEach((count, name) => hexagonalResponsesGrouped.push({ charityName: name, _count: { id: count } }));

    // Group programs
    const progMap = new Map<string, { count: number, ben: number }>();
    let totalProgramsCount = 0;
    let totalBeneficiariesSum = 0;

    allPrograms.forEach(p => {
      totalProgramsCount++;
      totalBeneficiariesSum += p.beneficiaries || 0;

      if (p.charityId) {
        if (!progMap.has(p.charityId)) {
          progMap.set(p.charityId, { count: 0, ben: 0 });
        }
        const data = progMap.get(p.charityId)!;
        data.count++;
        data.ben += p.beneficiaries || 0;
      }
    });

    progMap.forEach((data, charityId) => {
      programsGrouped.push({
        charityId,
        _count: { id: data.count },
        _sum: { beneficiaries: data.ben }
      });
    });

    const programsAgg = {
      _count: { id: totalProgramsCount },
      _sum: { beneficiaries: totalBeneficiariesSum }
    };

    return { charities, surveyResponsesGrouped, hexagonalResponsesGrouped, programsGrouped, programsAgg, dbNewsItems };
  };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "الرئيسية | زاد التنموية",
  description: "لوحة التحكم الرئيسية لزاد التنموية",
};

export default async function MainDashboard() {
  // جلب جميع البيانات من قاعدة البيانات بالتوازي باستخدام التجميع (Aggregations) مع التخزين المؤقت الإجباري
  const {
    charities,
    surveyResponsesGrouped,
    hexagonalResponsesGrouped,
    programsGrouped,
    programsAgg,
    dbNewsItems
  } = await getCachedDashboardData();

  // Calculate surveys per charity FAST using grouped data
  const surveyCounts = new Map<string, { readiness: number, hexagonal: number }>();

  surveyResponsesGrouped.forEach(r => {
    const name = r.charityName.trim();
    if (!surveyCounts.has(name)) surveyCounts.set(name, { readiness: 0, hexagonal: 0 });
    surveyCounts.get(name)!.readiness += r._count.id;
  });

  hexagonalResponsesGrouped.forEach(h => {
    const name = h.charityName.trim();
    if (!surveyCounts.has(name)) surveyCounts.set(name, { readiness: 0, hexagonal: 0 });
    surveyCounts.get(name)!.hexagonal += h._count.id;
  });

  const surveysList = Array.from(surveyCounts.entries()).map(([name, counts]) => ({
    name,
    readiness: counts.readiness,
    hexagonal: counts.hexagonal,
    total: counts.readiness + counts.hexagonal
  })).sort((a, b) => b.total - a.total);
  
  const totalSurveys = surveyResponsesGrouped.reduce((sum, g) => sum + g._count.id, 0) + 
                       hexagonalResponsesGrouped.reduce((sum, g) => sum + g._count.id, 0);
  
  // Calculate DB programs and beneficiaries per charity FAST using grouped data
  const dbCharityProgramsCount = new Map<string, number>();
  const dbCharityBeneficiariesSum = new Map<string, number>();

  programsGrouped.forEach((prog) => {
    if (prog.charityId) {
      dbCharityProgramsCount.set(prog.charityId, prog._count.id);
      dbCharityBeneficiariesSum.set(prog.charityId, prog._sum.beneficiaries || 0);
    }
  });

  const dbTotalPrograms = programsAgg._count.id;
  const dbTotalBeneficiaries = programsAgg._sum.beneficiaries || 0;

  // Display stats based on real data only (no fallbacks)
  const displayBeneficiaries = dbTotalBeneficiaries;
  const displayPrograms = dbTotalPrograms;
  const displayGrants = charities.reduce((sum, c) => sum + (c.grants || 0), 0);

  // Map charities and calculate metrics
  const charitiesData = charities.map((charity) => {
    const dbProgsCount = dbCharityProgramsCount.get(charity.id) || 0;
    const dbBenSum = dbCharityBeneficiariesSum.get(charity.id) || 0;

    const displayGrants = charity.grants || 0;
    const displayPrograms = dbProgsCount;
    const displayBeneficiaries = dbBenSum;

    return {
      ...charity,
      grants: displayGrants,
      programs: displayPrograms,
      beneficiaries: displayBeneficiaries
    };
  });

  // تم جلب الأخبار مسبقاً في Promise.all لضمان السرعة

  const formattedDbNews = dbNewsItems.map((news) => ({
    id: news.id,
    charityName: news.charityName,
    title: news.title,
    category: news.category,
    description: news.description || "",
    createdAt: news.createdAt,
    date: new Date(news.createdAt).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }));

  // Show latest 5 news items from the database
  const newsItems = formattedDbNews.slice(0, 5);

  return (
    <main className="flex-1 min-w-0 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">نظرة عامة</h1>
        <p className="text-slate-600">ملخص بيانات الشركة والجمعيات المتعاقد معها</p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
        {/* Card 1: الجمعيات المتعاقد معها */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-3 sm:gap-4 hover:border-primary/20 hover:shadow-md transition-all duration-300">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">الجمعيات المتعاقد معها</p>
            <h3 className="text-2xl font-bold text-slate-800">{charities.length}</h3>
          </div>
        </div>

        {/* Card 2: المنح */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-3 sm:gap-4 hover:border-emerald-500/20 hover:shadow-md transition-all duration-300">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">المنح</p>
            <h3 className="text-2xl font-bold text-slate-800">{displayGrants.toLocaleString()} ريال</h3>
          </div>
        </div>

        {/* Card 3: عدد البرامج */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-3 sm:gap-4 hover:border-violet-500/20 hover:shadow-md transition-all duration-300">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 shrink-0">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">عدد البرامج</p>
            <h3 className="text-2xl font-bold text-slate-800">{displayPrograms.toLocaleString()}</h3>
          </div>
        </div>

        {/* Card 4: عدد المستفيدين */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-3 sm:gap-4 hover:border-indigo-500/20 hover:shadow-md transition-all duration-300">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">عدد المستفيدين</p>
            <h3 className="text-2xl font-bold text-slate-800">{displayBeneficiaries.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Two Column Section: Charities & News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charities Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <span className="w-2.5 h-6 bg-primary rounded-full"></span>
            الجمعيات المتعاقد معها
          </h2>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {charitiesData.map((charity) => (
              <Link
                key={charity.id}
                href={`/dashboard/charity/${encodeURIComponent(charity.name)}`}
                className="relative overflow-hidden rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-primary/30 transition-all duration-500 group flex flex-col justify-between"
              >
                {/* Blurred Background Logo */}
                {charity.logoUrl && (
                  <div className="absolute inset-0 z-0 pointer-events-none">
                    <img 
                      src={charity.logoUrl} 
                      alt="" 
                      className="w-full h-full object-cover opacity-50 blur-md scale-110 group-hover:scale-125 group-hover:opacity-60 transition-all duration-700 ease-out" 
                    />
                  </div>
                )}
                {/* Glassmorphism Overlay */}
                <div className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-500 ${charity.logoUrl ? "bg-white/60 backdrop-blur-[8px] group-hover:bg-white/50" : "bg-white"}`}></div>

                {/* Card Content */}
                <div className="relative z-10 p-3 sm:p-4 flex flex-col justify-between h-full">
                  <div>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-200/40">
                      {charity.logoUrl ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200/60 bg-white/80 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                          <img src={charity.logoUrl} alt={charity.name} className="w-full h-full object-contain p-1 drop-shadow-sm" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-lg border border-primary/20 shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                          {charity.name.charAt(0)}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <h3 className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors duration-300 truncate" title={charity.name}>
                          {charity.name}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate drop-shadow-sm">
                          {charity.domain || "تنمية مجتمعية"}
                        </p>
                      </div>
                    </div>

                    {/* Details List */}
                    <div className="space-y-2">
                      {/* Stats 1: المنح */}
                      <div className="flex items-center justify-between text-[11px] sm:text-xs">
                        <span className="text-slate-600 font-bold flex items-center gap-1.5 drop-shadow-sm">
                          <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          المنح:
                        </span>
                        <span className="font-bold text-emerald-800 bg-emerald-500/10 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] shrink-0 border border-emerald-500/20 shadow-sm">
                          {charity.grants.toLocaleString()} ريال
                        </span>
                      </div>

                      {/* Stats 2: البرامج */}
                      <div className="flex items-center justify-between text-[11px] sm:text-xs">
                        <span className="text-slate-600 font-bold flex items-center gap-1.5 drop-shadow-sm">
                          <svg className="w-3.5 h-3.5 text-violet-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                          </svg>
                          البرامج:
                        </span>
                        <span className="font-bold text-violet-800 bg-violet-500/10 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] shrink-0 border border-violet-500/20 shadow-sm">
                          {charity.programs} برامج
                        </span>
                      </div>

                      {/* Stats 3: المستفيدين */}
                      <div className="flex items-center justify-between text-[11px] sm:text-xs">
                        <span className="text-slate-600 font-bold flex items-center gap-1.5 drop-shadow-sm">
                          <svg className="w-3.5 h-3.5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          المستفيدين:
                        </span>
                        <span className="font-bold text-indigo-800 bg-indigo-500/10 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] shrink-0 border border-indigo-500/20 shadow-sm">
                          {charity.beneficiaries.toLocaleString()} مستفيد
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Link Footer */}
                  <div className="mt-3 pt-2 border-t border-slate-200/40 flex items-center justify-end text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-[-4px] transition-all duration-300">
                    <span className="bg-white/50 px-2 py-1 rounded-md">عرض الملف</span>
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {charitiesData.length === 0 && (
            <div className="bg-white rounded-2xl p-16 text-center text-slate-500 border border-slate-100 shadow-sm">
              <p className="font-medium">لا توجد جمعيات متعاقد معها حالياً.</p>
            </div>
          )}
        </div>

        {/* News Column - 1/3 width */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <span className="w-2.5 h-6 bg-amber-500 rounded-full"></span>
              آخر الأخبار والإنجازات
            </h2>
            <Link
              href="/dashboard/news"
              className="text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-all duration-300 flex items-center gap-1 shrink-0"
            >
              عرض الكل
              <svg className="w-3.5 h-3.5 transition-transform duration-300 transform hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm divide-y divide-slate-100">
            {newsItems.map((item, idx) => (
              <div key={item.id} className={`group ${idx > 0 ? "pt-5" : ""} ${idx < newsItems.length - 1 ? "pb-5" : ""}`}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {item.charityName.split(",").map((cName) => (
                    <span key={cName} className="inline-block text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                      {cName.trim()}
                    </span>
                  ))}
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    item.category === "الاستراتيجية" ? "text-violet-700 bg-violet-50" :
                    item.category === "التقنية" ? "text-blue-700 bg-blue-50" :
                    item.category === "تنمية الموارد" ? "text-emerald-700 bg-emerald-50" :
                    item.category === "تكليف" ? "text-rose-700 bg-rose-50" :
                    item.category === "استقطاب" ? "text-teal-700 bg-teal-50" :
                    "text-amber-700 bg-amber-50" // الإعلامية
                  }`}>
                    {item.category}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1.5 group-hover:text-primary transition-colors duration-300">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3">
                  {item.description}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {item.date}
                </div>
              </div>
            ))}

            {newsItems.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p className="text-xs font-semibold">لا توجد أخبار أو إنجازات حالياً.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
