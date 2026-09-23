import { governanceManuals, CharitySize } from "@/data/governanceManual";
import { Scale, FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/console/layout";

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
    <div className="min-h-full bg-[#FAFAFA] dark:bg-[#0A0A0A] p-4 md:p-8 selection:bg-primary/20 selection:text-primary rounded-xl" dir="rtl">
      
      <div className="max-w-5xl mx-auto mb-12">
        <PageHeader
          crumbs={[
            { label: "الحوكمة", href: "/main/governance?change_size=true" },
            { label: "المعايير والممارسات المعتمدة" },
          ]}
          icon={<Scale className="w-6 h-6" />}
          title="المعايير والممارسات المعتمدة"
          description={`معايير وشواهد ${sizeLabels[sizeParam]} — المعايير الأساسية، والممارسات الدقيقة، والشواهد المطلوبة لإثبات الامتثال.`}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto space-y-12">
        {standards.map((std, stdIdx) => (
          <div key={std.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${stdIdx * 100}ms` }}>
            
            {/* Standard Header */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <span className="text-primary font-semibold">{stdIdx + 1}</span>
              </div>
              <div className="pt-1">
                <h2 className="text-section font-semibold text-slate-900 dark:text-white mb-2">{std.title}</h2>
                <p className="text-caption text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">{std.description}</p>
              </div>
            </div>

            {/* Practices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-0 md:pr-14">
              {std.practices.map((practice, practiceIdx) => (
                <div 
                  key={practice.id}
                  className="bg-white dark:bg-slate-900 rounded-xl p-6 ring-1 ring-slate-200 dark:ring-slate-800/80 shadow-[0_1px_2px_rgb(15_23_42/0.04)] hover:ring-primary/30 dark:hover:ring-primary/40 transition-all duration-300 flex flex-col gap-4 hover:border-primary/30"
                >
                  <h3 className="text-title font-semibold text-slate-800 dark:text-slate-100 flex items-start gap-2.5">
                    <span className="flex items-center justify-center bg-primary/10 text-primary text-caption font-semibold px-2 py-1 rounded-lg shrink-0 mt-0.5">
                      {stdIdx + 1}-{practiceIdx + 1}
                    </span>
                    <span className="leading-snug">{practice.title}</span>
                  </h3>
                  
                  {practice.description && (
                    <p className="text-caption text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {practice.description}
                    </p>
                  )}

                  <div className="space-y-4 mt-2">
                    {practice.questions.map((q, idx) => (
                      <div key={idx} className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800/60 last:border-0 last:pb-0">
                        <p className="text-caption font-medium text-slate-700 dark:text-slate-300 leading-relaxed flex gap-2">
                          <span className="text-primary/70 dark:text-primary/60 font-semibold tabular-nums shrink-0 mt-0.5">{idx + 1}.</span>
                          {q.question}
                        </p>
                        <div className="flex items-start gap-2 pr-4">
                          <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <p className="text-caption text-emerald-700 dark:text-emerald-400/90 font-medium leading-relaxed">
                            <span className="font-semibold ml-1 opacity-80">الشاهد:</span> 
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
