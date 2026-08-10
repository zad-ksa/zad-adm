import { governanceManuals, CharitySize } from "@/data/governanceManual";
import { Scale, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function GeneralGovernanceStandardsPage({ 
  searchParams
}: { 
  searchParams: Promise<{ size?: string }>
}) {
  const { size } = await searchParams;
  const sizeParam = (size?.toUpperCase() || "SMALL") as CharitySize;
  
  // Validate size
  if (!governanceManuals[sizeParam]) {
    redirect(`/main/governance`);
  }

  const standards = governanceManuals[sizeParam] || [];

  const sizeLabels: Record<CharitySize, string> = {
    MICRO: "الجمعيات متناهية الصغر",
    SMALL: "الجمعيات الصغيرة",
    MEDIUM: "الجمعيات المتوسطة",
    LARGE: "الجمعيات الكبيرة",
    MEGA: "الجمعيات متناهية الكبر"
  };

  return (
    <div className="min-h-full bg-[#FAFAFA] dark:bg-[#0A0A0A] p-4 md:p-8 selection:bg-primary/20 selection:text-primary rounded-3xl" dir="rtl">
      
      {/* Navigation Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <Link 
          href={`/main/governance?change_size=true`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary transition-colors bg-white dark:bg-slate-900 px-4 py-2 rounded-xl ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm"
        >
          <ChevronRight className="w-4 h-4" />
          العودة لدليل الحوكمة
        </Link>
      </div>

      {/* Header Section */}
      <div className="mb-12 max-w-5xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 text-primary">
          <Scale className="w-4 h-4" />
          <span className="text-xs font-semibold tracking-widest uppercase">
            معايير وشواهد {sizeLabels[sizeParam]}
          </span>
        </div>
        
        <h1 
          className="font-bold text-slate-900 dark:text-white tracking-tight"
          style={{ fontSize: "clamp(2rem, 3vw, 2.5rem)", lineHeight: 1.2 }}
        >
          المعايير والممارسات المعتمدة
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed text-sm md:text-base">
          توضح هذه الصفحة المعايير الأساسية، والممارسات الدقيقة، والشواهد المطلوبة لإثبات الامتثال.
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto space-y-12">
        {standards.map((std, stdIdx) => (
          <div key={std.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${stdIdx * 100}ms` }}>
            
            {/* Standard Header */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <span className="text-primary font-bold">{stdIdx + 1}</span>
              </div>
              <div className="pt-1">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">{std.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">{std.description}</p>
              </div>
            </div>

            {/* Practices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-0 md:pr-14">
              {std.practices.map((practice, practiceIdx) => (
                <div 
                  key={practice.id}
                  className="bg-white dark:bg-[#111] rounded-3xl p-6 ring-1 ring-slate-200 dark:ring-slate-800/80 shadow-sm hover:shadow-md hover:ring-primary/30 dark:hover:ring-primary/40 transition-all duration-300 flex flex-col gap-4"
                >
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-start gap-2.5">
                    <span className="flex items-center justify-center bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-lg shrink-0 mt-0.5">
                      {stdIdx + 1}-{practiceIdx + 1}
                    </span>
                    <span className="leading-snug">{practice.title}</span>
                  </h3>
                  
                  {practice.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {practice.description}
                    </p>
                  )}

                  <div className="space-y-4 mt-2">
                    {practice.questions.map((q, idx) => (
                      <div key={idx} className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800/60 last:border-0 last:pb-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed flex gap-2">
                          <span className="text-primary/70 dark:text-primary/60 font-bold tabular-nums shrink-0 mt-0.5">{idx + 1}.</span>
                          {q.question}
                        </p>
                        <div className="flex items-start gap-2 pr-4">
                          <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-emerald-700 dark:text-emerald-400/90 font-medium leading-relaxed">
                            <span className="font-bold ml-1 opacity-80">الشاهد:</span> 
                            {q.proof}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ))}
            </div>
            
          </div>
        ))}
      </div>
      
    </div>
  );
}
