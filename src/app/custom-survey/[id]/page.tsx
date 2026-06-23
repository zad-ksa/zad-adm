"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import ProgressBar from "@/components/ProgressBar";
import DatePicker from "react-multi-date-picker";
import arabic from "react-date-object/calendars/arabic";
import arabic_ar from "react-date-object/locales/arabic_ar";
import "react-multi-date-picker/styles/colors/teal.css";

const custom_arabic_ar = { ...arabic_ar };
custom_arabic_ar.months = [
  ["محرم", "محرم"],
  ["صفر", "صفر"],
  ["ربيع الأول", "ربيع الأول"],
  ["ربيع الآخر", "ربيع الآخر"],
  ["جمادى الأولى", "جمادى الأولى"],
  ["جمادى الآخرة", "جمادى الآخرة"],
  ["رجب", "رجب"],
  ["شعبان", "شعبان"],
  ["رمضان", "رمضان"],
  ["شوال", "شوال"],
  ["ذي القعدة", "ذي القعدة"],
  ["ذي الحجة", "ذي الحجة"]
];


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

export default function CustomSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // States
  const [hasAcceptedWelcome, setHasAcceptedWelcome] = useState(false);
  const [charityName, setCharityName] = useState("");
  
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Record<string, string>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    fetchSurvey();
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const nameParam = urlParams.get("charity") || urlParams.get("name") || "مشارك عام";
      setCharityName(nameParam);
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!survey || !survey.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">عذراً</h1>
          <p className="text-slate-500">هذا الاستبيان غير متاح حالياً أو تم إيقافه.</p>
        </div>
      </div>
    );
  }

  const currentSection = survey.sections[currentSectionIndex];
  const isLastSection = currentSectionIndex === survey.sections.length - 1;

  // Validation
  const allCurrentRequiredAnswered = currentSection?.questions.every(q => {
    if (q.type === "YES_NO" && q.requireAttachmentIfYes && answers[q.id] === "yes" && !attachments[q.id]) {
      return false; // Requires attachment if "yes"
    }
    if (!q.isRequired) return true;
    return !!answers[q.id] || !!attachments[q.id];
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFiles(prev => ({ ...prev, [questionId]: true }));
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setAttachments(prev => ({ ...prev, [questionId]: data.url }));
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("فشل رفع الملف. يرجى المحاولة مرة أخرى.");
    } finally {
      setUploadingFiles(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleNext = async () => {
    if (!allCurrentRequiredAnswered) return;

    if (isLastSection) {
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/custom-surveys/${resolvedParams.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            charityName,
            answers,
            attachments
          })
        });

        if (res.ok) {
          setIsSuccess(true);
        } else {
          alert("حدث خطأ أثناء إرسال البيانات.");
        }
      } catch (err) {
        console.error(err);
        alert("حدث خطأ في الاتصال.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentSectionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-md w-full text-center shadow-lg animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">تم الإرسال بنجاح!</h1>
          <p className="text-slate-500 mb-8">نشكركم على المشاركة في هذا الاستبيان وإتمام المطلوب.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-12">
        {!hasAcceptedWelcome ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm animate-in fade-in duration-500">
            <div className="w-48 h-48 mx-auto mb-6">
              <img src="/assets/logos/لوجو زاد-01.svg" alt="زاد التنموية" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black text-center text-primary mb-6">{survey.title}</h1>
            <div className="text-slate-600 leading-relaxed text-center mb-10 text-lg">
              {survey.introText.split('\n').map((line, i) => (
                <p key={i} className="mb-2">{line}</p>
              ))}
            </div>
            <button
              onClick={() => setHasAcceptedWelcome(true)}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary/95 transition-all shadow-lg"
            >
              البدء الآن
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <ProgressBar current={currentSectionIndex + 1} total={survey.sections.length} />

            <div className="mb-8 mt-6 bg-primary text-white p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold mb-2">{currentSection.title}</h2>
              <p className="text-primary-foreground/80 text-sm">يرجى إتمام جميع الأسئلة المطلوبة</p>
            </div>

            <div className="space-y-6">
              {currentSection.questions.map((question, index) => (
                <div key={question.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800 mb-1">
                        {question.text}
                        {question.isRequired && <span className="text-red-500 mr-1">*</span>}
                      </h3>
                      
                      <div className="mt-4">
                        {question.type === "OPTIONS" ? (
                          <div className="space-y-3">
                            {(question.options || []).map(opt => (
                              <label key={opt.id} className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                <input
                                  type="radio"
                                  name={question.id}
                                  value={opt.id}
                                  checked={answers[question.id] === opt.id}
                                  onChange={() => setAnswers(prev => ({ ...prev, [question.id]: opt.id }))}
                                  className="w-5 h-5 text-primary focus:ring-primary/20 cursor-pointer"
                                />
                                <span className="text-slate-700 font-medium">{opt.text}</span>
                              </label>
                            ))}
                          </div>
                        ) : question.type === "MULTI_OPTIONS" ? (
                          <div className="space-y-3">
                            {(question.options || []).map(opt => {
                              const currentSelected = answers[question.id] ? answers[question.id].split(",") : [];
                              const isChecked = currentSelected.includes(opt.id);
                              const handleToggle = () => {
                                let newSelected;
                                if (isChecked) {
                                  newSelected = currentSelected.filter(id => id !== opt.id);
                                } else {
                                  newSelected = [...currentSelected, opt.id];
                                }
                                setAnswers(prev => ({ ...prev, [question.id]: newSelected.join(",") }));
                              };
                              return (
                                <label key={opt.id} className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                  <input
                                    type="checkbox"
                                    name={question.id}
                                    value={opt.id}
                                    checked={isChecked}
                                    onChange={handleToggle}
                                    className="w-5 h-5 rounded text-primary focus:ring-primary/20 cursor-pointer"
                                  />
                                  <span className="text-slate-700 font-medium">{opt.text}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : question.type === "YES_NO" ? (
                          <div className="flex gap-4">
                            <label className={`flex-1 text-center py-3 rounded-xl border-2 cursor-pointer transition-all ${answers[question.id] === 'yes' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                              <input type="radio" name={question.id} value="yes" className="hidden" onChange={() => setAnswers(prev => ({ ...prev, [question.id]: 'yes' }))} />
                              <span className="font-bold">نعم</span>
                            </label>
                            <label className={`flex-1 text-center py-3 rounded-xl border-2 cursor-pointer transition-all ${answers[question.id] === 'no' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                              <input type="radio" name={question.id} value="no" className="hidden" onChange={() => setAnswers(prev => ({ ...prev, [question.id]: 'no' }))} />
                              <span className="font-bold">لا</span>
                            </label>
                          </div>
                        ) : question.type === "HIJRI_DATE" ? (
                          <div className="w-full relative">
                            <DatePicker
                              value={answers[question.id] || ""}
                              onChange={(date: any) => setAnswers(prev => ({ ...prev, [question.id]: date?.format?.("YYYY/MM/DD") || "" }))}
                              calendar={arabic}
                              locale={custom_arabic_ar}
                              className="teal"
                              calendarPosition="bottom-right"
                              containerClassName="w-full"
                              inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-primary focus:bg-white transition-all text-slate-800"
                              placeholder="اختر التاريخ الهجري..."
                            />
                          </div>
                        ) : question.type === "FILE" ? (
                          <div className="w-full">
                            <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all ${
                              attachments[question.id] 
                                ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700' 
                                : 'border-slate-300 hover:border-primary/50 hover:bg-primary/5 text-slate-500 hover:text-primary'
                            }`}>
                              {uploadingFiles[question.id] ? (
                                <div className="flex flex-col items-center gap-2 text-primary font-bold">
                                  <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                                  <span>جاري رفع الملف...</span>
                                </div>
                              ) : attachments[question.id] ? (
                                <div className="flex flex-col items-center gap-2">
                                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                  <span className="font-bold text-emerald-700">تم رفع الملف بنجاح</span>
                                  <span className="text-xs text-slate-400 font-medium text-center">انقر هنا لتغيير الملف المرفوع</span>
                                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, question.id)} />
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <UploadCloud className="w-10 h-10 text-slate-400 animate-bounce duration-1000" />
                                  <span className="font-bold text-slate-700">انقر هنا لرفع الملف المطلوب</span>
                                  <span className="text-xs text-slate-400">يدعم الصور والمستندات (PDF, Word)</span>
                                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, question.id)} />
                                </div>
                              )}
                            </label>
                          </div>
                        ) : (
                          <textarea
                            value={answers[question.id] || ""}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                            placeholder="اكتب إجابتك هنا..."
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary/50 focus:bg-white transition-all resize-none"
                          />
                        )}
                      </div>

                      {question.allowAttachment && question.type !== "FILE" && (
                        question.type !== "YES_NO" || 
                        !question.requireAttachmentIfYes || 
                        answers[question.id] === "yes"
                      ) && (
                        <div className="mt-4">
                          <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
                            attachments[question.id] 
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                              : 'border-slate-300 hover:border-primary/50 hover:bg-primary/5 text-slate-500 hover:text-primary'
                          }`}>
                            {uploadingFiles[question.id] ? (
                              <div className="flex items-center gap-2 text-primary font-bold">
                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> جاري الرفع...
                              </div>
                            ) : attachments[question.id] ? (
                              <>
                                <CheckCircle2 className="w-5 h-5" /> تم رفع المرفق بنجاح (انقر لتغييره)
                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, question.id)} />
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-5 h-5" /> إرفاق ملف (صورة، PDF، Word)
                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, question.id)} />
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-between items-center pb-12">
              <button
                onClick={handlePrev}
                disabled={currentSectionIndex === 0}
                className={`px-6 py-3 rounded-xl font-bold transition-colors ${
                  currentSectionIndex === 0 ? "opacity-0 pointer-events-none" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                المحور السابق
              </button>

              <button
                onClick={handleNext}
                disabled={!allCurrentRequiredAnswered || isSubmitting || Object.values(uploadingFiles).some(Boolean)}
                className={`px-8 py-3 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 ${
                  allCurrentRequiredAnswered && !isSubmitting ? "bg-primary hover:bg-primary/95" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {isSubmitting && <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
                {isLastSection ? "إنهاء وإرسال" : "المحور التالي"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
