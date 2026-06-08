import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";
import SurveyLinkManager from "@/components/SurveyLinkManager";
import { Award, AlertTriangle, Sparkles, ShieldAlert, Key, Rocket } from "@/components/Icons";
import { unstable_cache } from "next/cache";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} - التحليل السداسي | زاد التنموية`,
  };
}

const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-secondary">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const ClipboardLargeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-slate-300 mx-auto mb-4">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const HexagonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-secondary">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
  </svg>
);

export default async function HexagonalSurveysPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const getCachedHexResponses = unstable_cache(
    async (charityName: string) => {
      return await prisma.hexagonalResponse.findMany({
        where: { charityName: { equals: charityName, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
      });
    },
    ['hexagonal-responses'],
    { revalidate: 300, tags: ['hexagonal'] }
  );

  const hexagonalResponses = await getCachedHexResponses(decodedName);

  const hasHexagonal = hexagonalResponses.length > 0;



  // Aggregate responses
  const aggregated = {
    strengths: [] as { text: string; author: string }[],
    weaknesses: [] as { text: string; author: string }[],
    opportunities: [] as { text: string; author: string }[],
    threats: [] as { text: string; author: string }[],
    success: [] as { text: string; author: string }[],
    comp: [] as { text: string; author: string }[],
  };

  hexagonalResponses.forEach(res => {
    const answers = res.answers as Record<string, string[]>;
    const addItems = (items: string[] | undefined, target: { text: string; author: string }[]) => {
      if (items && Array.isArray(items)) {
        items.forEach(item => {
          if (item.trim()) {
            target.push({ text: item, author: res.authorizedTitle });
          }
        });
      }
    };

    addItems(answers.q1, aggregated.strengths);
    addItems(answers.q2, aggregated.weaknesses);
    addItems(answers.q3, aggregated.opportunities);
    addItems(answers.q4, aggregated.threats);
    addItems(answers.q5, aggregated.success);
    addItems(answers.q6, aggregated.comp);
  });

  return (
    <div className="space-y-12">
      <SurveyLinkManager charityName={decodedName} surveyType="HEXAGONAL" />

      {!hasHexagonal ? (
        <div className="text-center py-20 text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
          <ClipboardLargeIcon />
          <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد بيانات متاحة</h3>
          <p className="font-medium text-slate-500">لم يقم أي مشارك بتعبئة تقرير التحليل السداسي لهذه الجمعية بعد.</p>
        </div>
      ) : (
        <>
          {/* Section 1: Aggregated Results */}
      <div>
        <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-4">
          <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary font-bold">
            <HexagonIcon />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              نتائج التحليل السداسي المجمعة
            </h2>
            <p className="text-slate-500 text-sm mt-1">تجميع لكافة المدخلات من جميع المشاركين ({hexagonalResponses.length} مشارك)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800">نقاط القوة</h3>
              <span className="mr-auto bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{aggregated.strengths.length}</span>
            </div>
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {aggregated.strengths.length > 0 ? aggregated.strengths.map((item, idx) => (
                <li key={idx} className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
                  {item.text}
                  <span className="block text-[10px] text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">من: {item.author}</span>
                </li>
              )) : <li className="text-sm text-slate-400 italic text-center py-4">لا توجد مدخلات</li>}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="p-2 bg-rose-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="font-bold text-slate-800">نقاط الضعف</h3>
              <span className="mr-auto bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{aggregated.weaknesses.length}</span>
            </div>
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {aggregated.weaknesses.length > 0 ? aggregated.weaknesses.map((item, idx) => (
                <li key={idx} className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
                  {item.text}
                  <span className="block text-[10px] text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">من: {item.author}</span>
                </li>
              )) : <li className="text-sm text-slate-400 italic text-center py-4">لا توجد مدخلات</li>}
            </ul>
          </div>

          {/* Opportunities */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="p-2 bg-sky-50 rounded-lg">
                <Sparkles className="w-6 h-6 text-sky-500" />
              </div>
              <h3 className="font-bold text-slate-800">الفرص</h3>
              <span className="mr-auto bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{aggregated.opportunities.length}</span>
            </div>
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {aggregated.opportunities.length > 0 ? aggregated.opportunities.map((item, idx) => (
                <li key={idx} className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
                  {item.text}
                  <span className="block text-[10px] text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">من: {item.author}</span>
                </li>
              )) : <li className="text-sm text-slate-400 italic text-center py-4">لا توجد مدخلات</li>}
            </ul>
          </div>

          {/* Threats */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <ShieldAlert className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-bold text-slate-800">المخاطر المهددة</h3>
              <span className="mr-auto bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{aggregated.threats.length}</span>
            </div>
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {aggregated.threats.length > 0 ? aggregated.threats.map((item, idx) => (
                <li key={idx} className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
                  {item.text}
                  <span className="block text-[10px] text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">من: {item.author}</span>
                </li>
              )) : <li className="text-sm text-slate-400 italic text-center py-4">لا توجد مدخلات</li>}
            </ul>
          </div>

          {/* Success Factors */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Key className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-bold text-slate-800">مقومات النجاح</h3>
              <span className="mr-auto bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{aggregated.success.length}</span>
            </div>
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {aggregated.success.length > 0 ? aggregated.success.map((item, idx) => (
                <li key={idx} className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
                  {item.text}
                  <span className="block text-[10px] text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">من: {item.author}</span>
                </li>
              )) : <li className="text-sm text-slate-400 italic text-center py-4">لا توجد مدخلات</li>}
            </ul>
          </div>

          {/* Competitiveness */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="p-2 bg-violet-50 rounded-lg">
                <Rocket className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="font-bold text-slate-800">الميزة التنافسية</h3>
              <span className="mr-auto bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{aggregated.comp.length}</span>
            </div>
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {aggregated.comp.length > 0 ? aggregated.comp.map((item, idx) => (
                <li key={idx} className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
                  {item.text}
                  <span className="block text-[10px] text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">من: {item.author}</span>
                </li>
              )) : <li className="text-sm text-slate-400 italic text-center py-4">لا توجد مدخلات</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Section 2: Individual Participants */}
      <div className="pt-8">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-4">
          <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary font-bold">
            <ClipboardIcon />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            استبيانات الموظفين
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hexagonalResponses.map((res) => {
            const answers = res.answers as Record<string, string[]>;
            const strengthsCount = answers.q1?.length || 0;
            const weaknessesCount = answers.q2?.length || 0;
            const oppCount = answers.q3?.length || 0;
            const threatCount = answers.q4?.length || 0;
            const successCount = answers.q5?.length || 0;
            const compCount = answers.q6?.length || 0;

            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-secondary/50 shadow-sm hover:shadow transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-6 border-b border-slate-50 pb-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider bg-secondary/10 text-secondary font-bold px-3 py-1 rounded-full">
                        التحليل السداسي
                      </span>
                      <h3 className="font-bold text-slate-800 text-sm mt-3 group-hover:text-secondary transition-colors">
                        <span className="text-slate-400 font-normal mr-1">بواسطة:</span> {res.authorizedTitle}
                      </h3>

                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-[11px] text-slate-500 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                      <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-700">{strengthsCount} <span className="text-[9px] text-slate-400 font-normal">قوة</span></span>
                    </div>
                    <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span className="font-bold text-slate-700">{weaknessesCount} <span className="text-[9px] text-slate-400 font-normal">ضعف</span></span>
                    </div>
                    <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                      <Sparkles className="w-5 h-5 text-sky-500 shrink-0" />
                      <span className="font-bold text-slate-700">{oppCount} <span className="text-[9px] text-slate-400 font-normal">فرص</span></span>
                    </div>
                    <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                      <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                      <span className="font-bold text-slate-700">{threatCount} <span className="text-[9px] text-slate-400 font-normal">مخاطر</span></span>
                    </div>
                    <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                      <Key className="w-5 h-5 text-yellow-600 shrink-0" />
                      <span className="font-bold text-slate-700">{successCount} <span className="text-[9px] text-slate-400 font-normal">نجاح</span></span>
                    </div>
                    <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                      <Rocket className="w-5 h-5 text-violet-600 shrink-0" />
                      <span className="font-bold text-slate-700">{compCount} <span className="text-[9px] text-slate-400 font-normal">تميز</span></span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/dashboard/hexagonal/${res.id}`}
                  className="w-full text-center py-3 bg-secondary/5 hover:bg-secondary text-secondary hover:text-white font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2"
                >
                  عرض بنود التحليل السداسي
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
