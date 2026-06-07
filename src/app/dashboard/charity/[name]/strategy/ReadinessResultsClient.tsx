"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { surveyData } from "@/data/surveyData";

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);

const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
);

export default function ReadinessResultsClient({ responses }: { responses: any[] }) {
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());

  const toggleExclude = (id: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (id: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const includedResponses = useMemo(() => responses.filter(r => !excludedIds.has(r.id)), [responses, excludedIds]);
  const participantCount = includedResponses.length;

  const getPercentageColorClass = (percentage: number) => {
    if (percentage >= 80) return "bg-[#00b050]/10 text-[#00b050]";
    if (percentage >= 60) return "bg-[#92d050]/10 text-[#71a638]";
    if (percentage >= 40) return "bg-[#ffc000]/10 text-[#c29300]";
    return "bg-[#ff0000]/10 text-[#ff0000]";
  };

  const getPercentageBgClass = (percentage: number) => {
    if (percentage >= 80) return "bg-[#00b050]";
    if (percentage >= 60) return "bg-[#92d050]";
    if (percentage >= 40) return "bg-[#ffc000]";
    return "bg-[#ff0000]";
  };

  let overallAveragePercentage = 0;
  if (participantCount > 0) {
    const totalPercentageSum = includedResponses.reduce((acc, r) => acc + r.scorePercentage, 0);
    overallAveragePercentage = Math.round(totalPercentageSum / participantCount);
  }

  const sectionData = useMemo(() => {
    return surveyData.map((section, idx) => {
      let totalSecScore = 0;
      let maxSecScore = 0;
      
      const questionsData = section.questions.map((q) => {
        let qTotalScore = 0;
        let qMaxScore = Math.max(...q.options.map((o: any) => o.score));
        maxSecScore += qMaxScore;

        includedResponses.forEach((res) => {
          const answers = res.answers as Record<string, string>;
          const selectedOptionId = answers[q.id];
          const option = q.options.find((o: any) => o.id === selectedOptionId);
          if (option) {
            qTotalScore += option.score;
          }
        });

        const qTotalMax = qMaxScore * participantCount;
        const qAvgPercentage = qTotalMax > 0 ? Math.round((qTotalScore / qTotalMax) * 100) : 0;
        
        return {
          id: q.id,
          text: q.text,
          averagePercentage: qAvgPercentage,
        };
      });

      includedResponses.forEach((res) => {
        const answers = res.answers as Record<string, string>;
        section.questions.forEach((q) => {
          const selectedOptionId = answers[q.id];
          const option = q.options.find((o: any) => o.id === selectedOptionId);
          if (option) {
            totalSecScore += option.score;
          }
        });
      });

      const totalMaxSecScore = maxSecScore * participantCount;
      const averagePercentage = totalMaxSecScore > 0 ? Math.round((totalSecScore / totalMaxSecScore) * 100) : 0;

      return {
        index: idx + 1,
        title: section.title,
        averagePercentage,
        questions: questionsData,
      };
    });
  }, [includedResponses, participantCount]);

  if (responses.length === 0) {
    return null; // Handled by parent
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <div className="xl:col-span-2 space-y-6">
        <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
          <span className="w-2 h-6 rounded-full bg-primary inline-block"></span>
          تحليل متوسط الجاهزية للمحاور
        </h3>

        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm space-y-8">
          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/20 transition-colors">
            <div className="space-y-1">
              <span className="font-bold text-slate-800 text-base">المتوسط العام للجاهزية</span>
              <p className="text-xs text-slate-500 font-medium">بناءً على {participantCount} مشاركات مشمولة</p>
            </div>
            <div className={`px-5 py-2.5 rounded-xl text-xl font-bold shadow-sm ${getPercentageColorClass(overallAveragePercentage)}`}>
              {overallAveragePercentage}%
            </div>
          </div>

          <div className="space-y-5">
            {sectionData.map((sec) => (
              <div key={sec.index} className="space-y-2 group bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all hover:border-slate-200">
                <div 
                  className="flex justify-between items-center text-sm font-bold cursor-pointer"
                  onClick={() => toggleSection(sec.index)}
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-white border border-slate-100 shadow-sm text-slate-400 group-hover:text-primary transition-colors">
                      {openSections.has(sec.index) ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </div>
                    <span className="text-slate-700 group-hover:text-primary transition-colors">{sec.index}. {sec.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getPercentageColorClass(sec.averagePercentage)}`}>
                    {sec.averagePercentage}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${getPercentageBgClass(sec.averagePercentage)}`}
                    style={{ width: `${sec.averagePercentage}%` }}
                  />
                </div>

                {openSections.has(sec.index) && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                    {sec.questions.map((q, qIdx) => (
                      <div key={q.id} className="space-y-2 bg-white p-3 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-start text-xs font-medium gap-4">
                          <span className="text-slate-600 flex-1 leading-relaxed">{qIdx + 1}- {q.text}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${getPercentageColorClass(q.averagePercentage)}`}>
                            {q.averagePercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${getPercentageBgClass(q.averagePercentage)}`}
                            style={{ width: `${q.averagePercentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>


      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-6 rounded-full bg-slate-400 inline-block"></span>
            المشاركون
          </h3>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
            {participantCount} من {responses.length} مشمول
          </span>
        </div>
        
        <p className="text-xs text-slate-500 bg-blue-50 text-blue-700 p-3 rounded-xl border border-blue-100 mb-4">
          يمكنك تحديد أو إلغاء تحديد أي مشارك لتحديث الأرقام والنسب المئوية أعلاه فورياً.
        </p>

        <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
          {responses.map((res) => {
            const isExcluded = excludedIds.has(res.id);
            return (
              <div 
                key={res.id} 
                className={`bg-white rounded-xl p-4 border transition-all group ${isExcluded ? 'border-slate-200 opacity-60 bg-slate-50' : 'border-slate-100 hover:border-primary/50 shadow-sm hover:shadow'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!isExcluded} 
                      onChange={() => toggleExclude(res.id)}
                      className="mt-1 w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
                    />
                    <div>
                      <h4 className={`font-bold text-sm mb-1 ${isExcluded ? 'text-slate-500' : 'text-slate-800 group-hover:text-primary transition-colors'}`}>
                        {res.authorizedName}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium bg-slate-50 inline-block px-2 py-0.5 rounded">{res.authorizedTitle}</p>
                    </div>
                  </label>

                  <div className={`px-2 py-1 rounded-lg text-xs font-bold shadow-sm ${getPercentageColorClass(res.scorePercentage)}`}>
                    {res.scorePercentage}%
                  </div>
                </div>

                <div className="text-[11px] font-medium text-slate-400 flex justify-between items-center border-t border-slate-50 pt-3">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    {new Date(res.createdAt).toLocaleDateString("ar-SA", {
                      month: "short",
                      day: "numeric",
                      timeZone: "Asia/Riyadh"
                    })}
                  </span>
                  <Link
                    href={`/dashboard/${res.id}`}
                    className="text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                  >
                    التفاصيل
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
