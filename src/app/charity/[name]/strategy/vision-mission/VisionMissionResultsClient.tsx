"use client";

import { useState, useMemo } from "react";
import { Users, Eye, Target, BookOpen, User, Calendar, MessageSquare, Award, Clock, X, FileText, CheckCircle } from "lucide-react";

type ResponseItem = {
  id: string;
  charityId: string;
  charityName: string;
  respondentName: string;
  respondentTitle: string;
  answers: any; // Contains { categories, vision, mission }
  createdAt: any;
};

export default function VisionMissionResultsClient({ responses }: { responses: ResponseItem[] }) {
  const [activeTab, setActiveTab] = useState<"categories" | "vision" | "mission" | "respondents">("categories");
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null);

  // 1. Statistics for Q7 Vision (Ambition Level)
  const visionQ7Stats = useMemo(() => {
    const counts: Record<string, number> = {
      "التميّز في نطاق الحي/المدينة": 0,
      "الريادة على مستوى المنطقة": 0,
      "حضور مؤثّر على المستوى الوطني": 0,
      "امتداد يتجاوز حدود الوطن": 0,
    };
    responses.forEach((r) => {
      const val = r.answers?.vision?.q7;
      if (val && counts[val] !== undefined) {
        counts[val]++;
      }
    });
    return counts;
  }, [responses]);

  // 2. Statistics for Q11 Vision (Internal Culture)
  const visionQ11Stats = useMemo(() => {
    const counts: Record<string, number> = {
      "الفخر": 0,
      "الانتماء": 0,
      "الإلهام": 0,
      "الأمان": 0,
      "النمو والتطور": 0,
    };
    const otherValues: { text: string; respondent: string }[] = [];

    responses.forEach((r) => {
      const selected = r.answers?.vision?.q11 || [];
      selected.forEach((opt: string) => {
        if (counts[opt] !== undefined) {
          counts[opt]++;
        }
      });
      const other = r.answers?.vision?.q11_other;
      if (other && other.trim() !== "") {
        otherValues.push({ text: other, respondent: `${r.respondentName} (${r.respondentTitle})` });
      }
    });
    return { counts, otherValues };
  }, [responses]);

  // 3. Statistics for Q6 Mission (Geographical Scope)
  const missionQ6Stats = useMemo(() => {
    const counts: Record<string, number> = {
      "حي/مدينة": 0,
      "منطقة": 0,
      "على مستوى الوطن": 0,
      "خارج الوطن": 0,
    };
    responses.forEach((r) => {
      const val = r.answers?.mission?.q6;
      if (val && counts[val] !== undefined) {
        counts[val]++;
      }
    });
    return counts;
  }, [responses]);

  const tabs = [
    { id: "categories", label: "الفئات والأثر", icon: <Users className="w-4 h-4" /> },
    { id: "vision", label: "رؤية الجمعية", icon: <Target className="w-4 h-4" /> },
    { id: "mission", label: "رسالة الجمعية", icon: <BookOpen className="w-4 h-4" /> },
    { id: "respondents", label: `المشاركون (${responses.length})`, icon: <User className="w-4 h-4" /> },
  ] as const;

  // Helper to render progress bar
  const renderStatBar = (label: string, count: number, total: number, colorClass: string) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-slate-700 dark:text-slate-350">{label}</span>
          <span className="text-slate-500">{count} مشارك ({pct}%)</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
          <div className={`${colorClass} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Print Button (Hidden on Print) */}
      <div className="flex justify-end print:hidden mb-4">
        <button
          onClick={() => window.print()}
          className="bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary/95 transition-all text-xs flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <FileText className="w-4 h-4" />
          طباعة التقرير
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex gap-2 border-b border-slate-100 dark:border-slate-700 pb-px print:hidden overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer
              ${activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-slate-400 dark:text-slate-550 hover:text-slate-750 hover:border-slate-200"
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* -------------------- TAB 1: CATEGORIES & IMPACT -------------------- */}
      {activeTab === "categories" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {responses.map((res) => {
              const cats = res.answers?.categories || [];
              const validCats = cats.filter((c: any) => c && c.name && c.name.trim() !== "");
              if (validCats.length === 0) return null;

              return (
                <div key={res.id} className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{res.respondentName}</h4>
                      <p className="text-xs text-slate-400 font-medium">{res.respondentTitle}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {validCats.map((cat: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-primary">{cat.name}</span>
                          <span className="text-slate-450 dark:text-slate-500 font-mono text-[10px]">فئة #{idx+1}</span>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400"><strong className="text-slate-700 dark:text-slate-300">الوصف: </strong>{cat.description}</p>
                        )}
                        {cat.impact && (
                          <p className="text-xs text-slate-500 dark:text-slate-400"><strong className="text-slate-700 dark:text-slate-300">الأثر المطلوب: </strong>{cat.impact}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: CHARITY VISION -------------------- */}
      {activeTab === "vision" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Charts / Statistical summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100 dark:border-slate-700 pb-6">
            
            {/* Ambition levels */}
            <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-4">
              <h4 className="font-bold text-amber-600 dark:text-amber-500 text-sm flex items-center gap-2">
                <Award className="w-4 h-4" /> إحصائيات مستوى الطموح لحجم الأثر
              </h4>
              <div className="space-y-4">
                {Object.keys(visionQ7Stats).map((label) => 
                  renderStatBar(label, visionQ7Stats[label], responses.length, "bg-amber-500")
                )}
              </div>
            </div>

            {/* Internal environment culture */}
            <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-4">
              <h4 className="font-bold text-emerald-600 dark:text-emerald-500 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> إحصائيات الشعور المراد لدى العاملين والمتطوعين
              </h4>
              <div className="space-y-4">
                {Object.keys(visionQ11Stats.counts).map((label) => 
                  renderStatBar(label, visionQ11Stats.counts[label], responses.length, "bg-emerald-500")
                )}
              </div>
              {visionQ11Stats.otherValues.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">إجابات إضافية (أخرى):</span>
                  <div className="max-h-24 overflow-y-auto space-y-1.5 custom-scrollbar text-[11px]">
                    {visionQ11Stats.otherValues.map((v, i) => (
                      <p key={i} className="text-slate-500 dark:text-slate-400">
                        <strong className="text-slate-750">{v.text}</strong> — <span className="text-slate-400 font-medium">{v.respondent}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Qualitative questions grouped list */}
          <div className="space-y-8">
            {[
              { id: "q2", title: "صورة المستقبل في 2030" },
              { id: "q3", title: "بماذا تشتهر الجمعية وما يميزها مستقبلاً" },
              { id: "q4", title: "أهم أثر في مجال تخصص القيم" },
              { id: "q5", title: "أهم ثلاثة أشياء نتمنى تقديمها للمستفيدين" },
              { id: "q6", title: "التغيير الحقيقي المأمول في حياة المستفيد" },
              { id: "q8", title: "ماذا يتمنى أن يقول الناس عن الجمعية بعد سنوات" },
              { id: "q9", title: "القيم أو المبادئ التي لا يمكن التنازل عنها" },
              { id: "q10", title: "الأمور التي تتمنى أن ترفضها الجمعية" },
              { id: "q12", title: "أمنية ختامية لمستقبل الجمعية" },
            ].map((qGroup) => {
              return (
                <div key={qGroup.id} className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2 border-r-4 border-amber-500 pr-2">
                    {qGroup.title}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {responses.map((res) => {
                      const answer = qGroup.id === "q5" 
                        ? res.answers?.vision?.q5_points 
                        : res.answers?.vision?.[qGroup.id];
                      
                      if (!answer || (typeof answer === "string" && answer.trim() === "")) return null;

                      return (
                        <div key={res.id} className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs space-y-2 flex flex-col justify-between">
                          <div className="text-slate-650 dark:text-slate-350 leading-relaxed font-medium">
                            {qGroup.id === "q5" && Array.isArray(answer) ? (
                              <ul className="list-disc list-inside space-y-1">
                                {answer.map((pt: string, idx: number) => pt && <li key={idx}>{pt}</li>)}
                              </ul>
                            ) : (
                              <span>"{answer}"</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-2">
                            <span className="text-[10px]">{res.respondentName} ({res.respondentTitle})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* -------------------- TAB 3: CHARITY MISSION -------------------- */}
      {activeTab === "mission" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Charts / Statistical summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100 dark:border-slate-700 pb-6">
            
            {/* Geographical scope */}
            <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-4 md:col-span-2">
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-2">
                <Target className="w-4 h-4" /> النطاق الجغرافي الذي تخدمه الجمعية
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Object.keys(missionQ6Stats).map((label) => 
                  renderStatBar(label, missionQ6Stats[label], responses.length, "bg-indigo-500")
                )}
              </div>
            </div>

          </div>

          {/* Mission suggested wordings */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 border-r-4 border-primary pr-2">
              الصياغات المقترحة لرسالة الجمعية
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {responses.map((res) => {
                const wording = res.answers?.mission?.q7;
                if (!wording || wording.trim() === "") return null;

                return (
                  <div key={res.id} className="p-6 bg-primary/[2%] border border-primary/10 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[2%] rounded-full blur-xl -translate-y-6 translate-x-6 pointer-events-none"></div>
                    <div className="relative z-10">
                      <p className="text-slate-700 dark:text-slate-200 text-sm font-bold leading-relaxed mb-4">
                        « {wording} »
                      </p>
                    </div>
                    <div className="text-xs text-slate-450 dark:text-slate-500 font-bold border-t border-slate-100 dark:border-slate-800/80 pt-3 flex justify-between items-center relative z-10">
                      <span>{res.respondentName}</span>
                      <span>{res.respondentTitle}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Qualitative questions grouped list */}
          <div className="space-y-8 mt-12">
            {[
              { id: "q1", title: "لماذا تأسست الجمعية؟ غرض الوجود" },
              { id: "q2", title: "المستفيدون الرئيسيون" },
              { id: "q3", title: "الخدمات والبرامج الأساسية" },
              { id: "q4", title: "النتائج المحددة المطلوب تحقيقها للمستفيد" },
              { id: "q5", title: "ما يميز الجمعية عن المنافسين" },
            ].map((qGroup) => {
              return (
                <div key={qGroup.id} className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2 border-r-4 border-indigo-500 pr-2">
                    {qGroup.title}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {responses.map((res) => {
                      const answer = res.answers?.mission?.[qGroup.id];
                      
                      if (!answer || answer.trim() === "") return null;

                      return (
                        <div key={res.id} className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs space-y-2 flex flex-col justify-between">
                          <div className="text-slate-650 dark:text-slate-350 leading-relaxed font-medium">
                            "{answer}"
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-2">
                            <span className="text-[10px]">{res.respondentName} ({res.respondentTitle})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* -------------------- TAB 4: RESPONDENTS LIST -------------------- */}
      {activeTab === "respondents" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="overflow-x-auto custom-scrollbar border border-slate-150 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold text-xs border-b border-slate-150 dark:border-slate-850">
                <tr>
                  <th className="px-6 py-4">الاسم</th>
                  <th className="px-6 py-4">المسمى الوظيفي / الصفة</th>
                  <th className="px-6 py-4">تاريخ التقديم</th>
                  <th className="px-6 py-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-800/50">
                {responses.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{res.respondentName}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">{res.respondentTitle}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                      {new Intl.DateTimeFormat('ar-SA', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }).format(new Date(res.createdAt))}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedResponse(res)}
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        عرض الإجابات
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- INDIVIDUAL RESPONSE MODAL -------------------- */}
      {selectedResponse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedResponse.respondentName}</h3>
                  <p className="text-xs text-slate-400 font-medium">{selectedResponse.respondentTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedResponse(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full p-1.5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-8">
              
              {/* Category Impact */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 border-r-4 border-primary pr-2">
                  المحور الأول: الفئات والأثر
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedResponse.answers?.categories?.filter((c: any) => c && c.name && c.name.trim() !== "").map((cat: any, idx: number) => (
                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl space-y-2">
                      <span className="text-xs font-bold text-primary block">{cat.name}</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400"><strong className="text-slate-655 dark:text-slate-300">الوصف:</strong> {cat.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400"><strong className="text-slate-655 dark:text-slate-300">الأثر:</strong> {cat.impact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vision section */}
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 border-r-4 border-amber-500 pr-2">
                  المحور الثاني: رؤية الجمعية
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "q2", title: "1. صورة المستقبل في 2030" },
                    { key: "q3", title: "2. بماذا تشتهر الجمعية مستقبلاً" },
                    { key: "q4", title: "3. أثر التخصص بالقيم" },
                    { key: "q5_points", title: "4. أهم 3 أشياء للمستفيدين" },
                    { key: "q6", title: "5. التغيير المأمول في حياة المستفيد" },
                    { key: "q7", title: "6. مستوى الطموح المستقبلي" },
                    { key: "q8", title: "7. ماذا يتمنى أن يقول الناس" },
                    { key: "q9", title: "8. مبادئ لا تراجع عنها" },
                    { key: "q10", title: "9. أمور ترفضها الجمعية" },
                    { key: "q11", title: "10. شعور العاملين والمتطوعين" },
                    { key: "q12", title: "11. أمنية ختامية لمستقبل الجمعية" },
                  ].map((q) => {
                    const ans = q.key === "q5_points"
                      ? selectedResponse.answers?.vision?.q5_points
                      : q.key === "q11"
                        ? [...(selectedResponse.answers?.vision?.q11 || []), selectedResponse.answers?.vision?.q11_other].filter(Boolean)
                        : selectedResponse.answers?.vision?.[q.key];

                    return (
                      <div key={q.key} className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl text-xs space-y-1">
                        <strong className="text-slate-450 dark:text-slate-500 font-bold block mb-1">{q.title}</strong>
                        {Array.isArray(ans) ? (
                          <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                            {ans.map((pt, i) => pt && <li key={i}>{pt}</li>)}
                          </ul>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-350 leading-relaxed font-medium">{ans || "—"}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mission section */}
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 border-r-4 border-indigo-500 pr-2">
                  المحور الثالث: رسالة الجمعية
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "q1", title: "12. لماذا تأسست الجمعية؟" },
                    { key: "q2", title: "13. من نخدم؟" },
                    { key: "q3", title: "14. ماذا نقدم (مجال العمل)؟" },
                    { key: "q4", title: "15. النتائج المرجوة للمستفيد" },
                    { key: "q5", title: "16. ما يميزنا" },
                    { key: "q6", title: "17. النطاق الجغرافي" },
                    { key: "q7", title: "18. الصياغة المقترحة لرسالة الجمعية" },
                  ].map((q) => {
                    const ans = selectedResponse.answers?.mission?.[q.key];
                    const isWording = q.key === "q7";

                    return (
                      <div key={q.key} className={`p-3.5 bg-slate-50 dark:bg-slate-900 border rounded-2xl text-xs space-y-1 ${isWording ? "md:col-span-2 border-primary/20 bg-primary/[2%]" : "border-slate-150 dark:border-slate-800"}`}>
                        <strong className="text-slate-450 dark:text-slate-500 font-bold block mb-1">{q.title}</strong>
                        <span className={`leading-relaxed font-medium ${isWording ? "text-slate-850 dark:text-slate-100 font-bold text-sm block" : "text-slate-700 dark:text-slate-350"}`}>
                          {isWording ? `« ${ans || "—"} »` : (ans || "—")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setSelectedResponse(null)}
                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 px-6 rounded-xl text-xs transition-colors cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
