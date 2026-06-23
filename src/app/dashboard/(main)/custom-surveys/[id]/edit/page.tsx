"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, ArrowRight, Settings, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

interface Question {
  id: string;
  text: string;
  type: string;
  isRequired: boolean;
  allowAttachment: boolean;
  requireAttachmentIfYes?: boolean;
  options?: { id: string; text: string }[];
}

interface Section {
  id: string;
  title: string;
  questions: Question[];
}

interface Survey {
  id: string;
  title: string;
  introText: string;
  isActive: boolean;
  sections: Section[];
}

export default function EditSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const isInitialMount = useRef(true);

  useEffect(() => {
    fetchSurvey();
  }, []);

  const fetchSurvey = async () => {
    try {
      const res = await fetch(`/api/custom-surveys/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setSurvey(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!survey) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/custom-surveys/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: survey.title,
          introText: survey.introText,
          isActive: survey.isActive,
          sections: survey.sections
        })
      });
      if (res.ok) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  };

  useEffect(() => {
    if (!survey) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus("saving");
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/custom-surveys/${resolvedParams.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: survey.title,
            introText: survey.introText,
            isActive: survey.isActive,
            sections: survey.sections
          })
        });
        if (res.ok) {
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch (err) {
        console.error(err);
        setSaveStatus("error");
      }
    }, 1000); // 1-second debounce

    return () => clearTimeout(delayDebounceFn);
  }, [survey, resolvedParams.id]);

  const addSection = (sIndex?: number) => {
    if (!survey) return;
    const newSections = [...survey.sections];
    const newSection = { id: Math.random().toString(), title: "قسم جديد", questions: [] };
    if (typeof sIndex === "number") {
      newSections.splice(sIndex + 1, 0, newSection);
    } else {
      newSections.push(newSection);
    }
    setSurvey({ ...survey, sections: newSections });
  };

  const updateSectionTitle = (sIndex: number, title: string) => {
    if (!survey) return;
    const newSections = [...survey.sections];
    newSections[sIndex].title = title;
    setSurvey({ ...survey, sections: newSections });
  };

  const deleteSection = (sIndex: number) => {
    if (!survey) return;
    const newSections = survey.sections.filter((_, i) => i !== sIndex);
    setSurvey({ ...survey, sections: newSections });
  };

  const addQuestion = (sIndex: number) => {
    if (!survey) return;
    const newSections = [...survey.sections];
    newSections[sIndex].questions.push({
      id: Math.random().toString(),
      text: "",
      type: "TEXT",
      isRequired: true,
      allowAttachment: false,
      requireAttachmentIfYes: false,
      options: []
    });
    setSurvey({ ...survey, sections: newSections });
  };

  const updateQuestion = (sIndex: number, qIndex: number, updates: Partial<Question>) => {
    if (!survey) return;
    const newSections = [...survey.sections];
    newSections[sIndex].questions[qIndex] = { ...newSections[sIndex].questions[qIndex], ...updates };
    setSurvey({ ...survey, sections: newSections });
  };

  const deleteQuestion = (sIndex: number, qIndex: number) => {
    if (!survey) return;
    const newSections = [...survey.sections];
    newSections[sIndex].questions = newSections[sIndex].questions.filter((_, i) => i !== qIndex);
    setSurvey({ ...survey, sections: newSections });
  };

  if (isLoading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!survey) return <div className="p-8 text-center">الاستبيان غير موجود</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto pb-32">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/custom-surveys" className="text-slate-400 hover:text-slate-800 transition-colors">
            <ArrowRight className="w-6 h-6" />
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-2xl font-bold text-slate-800">تعديل الاستبيان المخصص</h1>
            
            {/* مؤشر الحفظ التلقائي */}
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  جاري الحفظ تلقائياً...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" />
                  تم حفظ جميع التغييرات
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                  <AlertCircle className="w-3.5 h-3.5" />
                  فشل الحفظ تلقائياً
                </span>
              )}
              {saveStatus === "idle" && (
                <span className="text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full font-medium">
                  جاهز للتعديل
                </span>
              )}
            </div>
          </div>
        </div>

        {saveStatus === "error" ? (
          <button
            onClick={handleSave}
            className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100 cursor-pointer"
          >
            <AlertCircle className="w-5 h-5" />
            فشل الحفظ - حاول مجدداً
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving" || saveStatus === "saved" || saveStatus === "idle"}
            className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg ${
              saveStatus === "saving"
                ? "bg-amber-100 text-amber-700 border border-amber-200 cursor-not-allowed"
                : saveStatus === "saved" || saveStatus === "idle"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary/90 cursor-pointer"
            }`}
          >
            {saveStatus === "saving" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {saveStatus === "saving"
              ? "جاري الحفظ..."
              : saveStatus === "saved" || saveStatus === "idle"
                ? "تم حفظ التعديلات"
                : "حفظ الآن"}
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8 space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">عنوان الاستبيان</label>
          <input
            type="text"
            value={survey.title}
            onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-lg outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">النص الترحيبي (المقدمة)</label>
          <textarea
            value={survey.introText}
            onChange={(e) => setSurvey({ ...survey, introText: e.target.value })}
            rows={4}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all resize-none"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">أقسام الاستبيان</h2>
        </div>

        {survey.sections.map((section, sIndex) => (
          <div key={section.id} className="space-y-4">
            <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-4">
              <span className="bg-slate-200 text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                {sIndex + 1}
              </span>
              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSectionTitle(sIndex, e.target.value)}
                placeholder="عنوان القسم..."
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 font-bold outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => deleteSection(sIndex)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="حذف القسم"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {section.questions.map((question, qIndex) => (
                <div key={question.id} className="flex gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:border-primary/30 transition-colors">
                  <div className="text-slate-400 font-bold mt-2">{qIndex + 1}.</div>
                  <div className="flex-1 space-y-4">
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={question.text}
                        onChange={(e) => updateQuestion(sIndex, qIndex, { text: e.target.value })}
                        placeholder="نص السؤال..."
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-primary/50"
                      />
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(sIndex, qIndex, { type: e.target.value })}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-primary/50 text-sm font-bold text-slate-700"
                      >
                        <option value="TEXT">نصي</option>
                        <option value="YES_NO">نعم / لا</option>
                        <option value="OPTIONS">خيارات متعددة</option>
                        <option value="HIJRI_DATE">تاريخ هجري</option>
                      </select>
                    </div>
                    {question.type === "OPTIONS" && (
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
                        <div className="text-sm font-bold text-slate-700">خيارات الإجابة:</div>
                        {(question.options || []).map((opt, oIndex) => (
                          <div key={opt.id} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const newOptions = [...(question.options || [])];
                                newOptions[oIndex].text = e.target.value;
                                updateQuestion(sIndex, qIndex, { options: newOptions });
                              }}
                              placeholder="النص..."
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-sm outline-none focus:border-primary/50"
                            />
                            <button
                              onClick={() => {
                                const newOptions = (question.options || []).filter((_, i) => i !== oIndex);
                                updateQuestion(sIndex, qIndex, { options: newOptions });
                              }}
                              className="text-red-500 hover:text-red-600 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newOptions = [...(question.options || []), { id: Math.random().toString(), text: "" }];
                            updateQuestion(sIndex, qIndex, { options: newOptions });
                          }}
                          className="text-primary hover:text-primary/80 text-sm font-bold flex items-center gap-1 mt-2"
                        >
                          <Plus className="w-4 h-4" /> إضافة خيار
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={question.isRequired}
                          onChange={(e) => updateQuestion(sIndex, qIndex, { isRequired: e.target.checked })}
                          className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                        />
                        <span className="text-sm font-bold text-slate-600">سؤال إجباري</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={question.allowAttachment}
                          onChange={(e) => updateQuestion(sIndex, qIndex, { allowAttachment: e.target.checked })}
                          className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                        />
                        <span className="text-sm font-bold text-slate-600">السماح برفع مرفق (صورة/PDF/مستند)</span>
                      </label>
                      {question.type === "YES_NO" && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={question.requireAttachmentIfYes}
                            onChange={(e) => updateQuestion(sIndex, qIndex, { requireAttachmentIfYes: e.target.checked })}
                            className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                          />
                          <span className="text-sm font-bold text-slate-600">إجبار الرفع إذا اختار "نعم"</span>
                        </label>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteQuestion(sIndex, qIndex)}
                    className="self-start p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => addQuestion(sIndex)}
                className="w-full border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-primary/5 text-slate-500 hover:text-primary rounded-xl py-4 flex items-center justify-center gap-2 font-bold transition-all text-sm"
              >
                <Plus className="w-4 h-4" /> إضافة سؤال جديد
              </button>
            </div>
          </div>
          
          {/* زر إضافة قسم جديد تحت كل صندوق قسم */}
          <div className="flex justify-center py-2">
            <button
              onClick={() => addSection(sIndex)}
              className="bg-slate-100 text-slate-700 hover:bg-primary hover:text-white border border-slate-200 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> إضافة قسم جديد بعد هذا القسم
            </button>
          </div>
        </div>
      ))}

        {survey.sections.length === 0 && (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl text-slate-500 flex flex-col items-center gap-4">
            <span>لا توجد أقسام حالياً.</span>
            <button
              onClick={() => addSection()}
              className="bg-primary text-white hover:bg-primary/90 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> إضافة أول قسم للبدء
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
