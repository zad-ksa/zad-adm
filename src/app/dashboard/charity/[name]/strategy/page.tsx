import { prisma } from "@/lib/db";
import Link from "next/link";
import { surveyData } from "@/data/surveyData";
import ReadinessResultsClient from "./ReadinessResultsClient";
import type { Metadata } from "next";
import { Award, AlertTriangle, Sparkles, ShieldAlert, Key, Rocket } from "@/components/Icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} - الاستراتيجية | زاد التنموية`,
  };
}

// Custom SVG Icons
const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-slate-300 mx-auto mb-4">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const ChartLineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const FileEditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-slate-300 mx-auto mb-4">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);

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

export default async function StrategySurveysPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // Fetch all responses and filter in JS to prevent trailing space mismatches
  const allResponses = await prisma.surveyResponse.findMany({
    orderBy: { createdAt: "desc" },
  });

  const allHexResponses = await prisma.hexagonalResponse.findMany({
    orderBy: { createdAt: "desc" },
  });

  const responses = allResponses.filter(
    (res) => res.charityName.trim().toLowerCase() === decodedName.trim().toLowerCase()
  );

  const hexagonalResponses = allHexResponses.filter(
    (res) => res.charityName.trim().toLowerCase() === decodedName.trim().toLowerCase()
  );

  const hasReadiness = responses.length > 0;
  const hasHexagonal = hexagonalResponses.length > 0;

  if (!hasReadiness && !hasHexagonal) {
    return (
      <div className="text-center py-20 text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
        <ChartBarIcon />
        <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد بيانات متاحة</h3>
        <p className="font-medium text-slate-500">لم يتم العثور على أية نتائج استبيانات لهذه الجمعية حتى الآن.</p>
      </div>
    );
  }



  return (
    <div className="space-y-12">
      {/* Section 1: Readiness Survey Results */}
      <div>
        <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
            <ChartLineIcon />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            نتائج استبيان الجاهزية للتخطيط الاستراتيجي
          </h2>
        </div>

        {hasReadiness ? (
          <ReadinessResultsClient responses={responses} />
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-100 shadow-sm">
            <FileEditIcon />
            <p className="font-bold">لم يقم أي مشارك بتعبئة استبيان الجاهزية للتخطيط الاستراتيجي لهذه الجمعية بعد.</p>
          </div>
        )}
      </div>

      {/* Section 2: Hexagonal Analysis Reports */}
      <div className="pt-8">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-4">
          <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary font-bold">
            <ClipboardIcon />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            تقارير التحليل السداسي للجمعية
          </h2>
        </div>

        {hasHexagonal ? (
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
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-100 shadow-sm">
            <ClipboardLargeIcon />
            <p className="font-bold">لم يقم أي مشارك بتعبئة تقرير التحليل السداسي لهذه الجمعية بعد.</p>
          </div>
        )}
      </div>
    </div>
  );
}
