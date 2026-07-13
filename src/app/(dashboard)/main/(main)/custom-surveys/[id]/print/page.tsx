"use client";

import { useState, useEffect, use } from "react";
import { Printer, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Question {
  id: string;
  text: string;
  type: string;
  isRequired: boolean;
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
  sections: Section[];
}

export default function PrintSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 gap-4">
        <p className="text-xl font-bold text-slate-600 dark:text-slate-400">الاستبيان غير موجود</p>
        <Link href="/main/custom-surveys" className="text-primary hover:underline flex items-center gap-2 font-bold">
          <ArrowRight className="w-4 h-4" /> العودة للقائمة
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 print:bg-white text-slate-900 dark:text-slate-100 print:text-black">
      {/* شريط التحكم العلوي (يختفي عند الطباعة) */}
      <div className="print:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/main/custom-surveys/${resolvedParams.id}/edit`} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-2 font-bold text-sm">
              <ArrowRight className="w-4 h-4" /> عودة للتعديل
            </Link>
          </div>
          <button
            onClick={handlePrint}
            className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Printer className="w-5 h-5" />
            طباعة الآن
          </button>
        </div>
      </div>

      {/* ورقة الطباعة */}
      <div className="max-w-4xl mx-auto bg-white print:shadow-none shadow-xl print:m-0 my-8 p-8 md:p-12 print:p-2 print:w-full">
        {/* ترويسة الاستبيان */}
        <div className="border-b-2 border-slate-800 pb-3 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl print:text-xl font-black text-slate-900 mb-1">{survey.title}</h1>
            <p className="text-xs font-bold text-slate-500">منصة زاد التنموية</p>
          </div>
          <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center border border-dashed border-slate-300 print:border-solid text-[10px] text-slate-400 text-center leading-tight">
            شعار
          </div>
        </div>

        {/* المقدمة */}
        {survey.introText && (
          <div className="bg-slate-50 print:bg-transparent p-4 print:p-2 rounded-lg mb-6 text-justify leading-relaxed text-slate-700 text-sm font-medium">
            {survey.introText}
          </div>
        )}

        {/* الأقسام والأسئلة */}
        <div className="space-y-6">
          {survey.sections.map((section, sIndex) => (
            <div key={section.id} className="break-inside-avoid-page">
              <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-1">
                <span className="w-6 h-6 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-sm print:border print:border-black print:bg-white print:text-black">
                  {sIndex + 1}
                </span>
                <h2 className="text-lg print:text-base font-bold text-slate-800">{section.title}</h2>
              </div>

              <div className="space-y-4 pl-8 pr-2">
                {section.questions.map((question, qIndex) => (
                  <div key={question.id} className="break-inside-avoid mb-4">
                    <div className="flex gap-2 mb-2">
                      <span className="font-bold text-slate-400 print:text-slate-600 text-sm">{qIndex + 1}.</span>
                      <h3 className="font-bold text-base print:text-sm text-slate-800 leading-tight">
                        {question.text}
                        {question.isRequired && <span className="text-red-500 mr-1">*</span>}
                      </h3>
                    </div>

                    <div className="pl-6 print:pl-6">
                      {/* عرض بناءً على نوع السؤال */}
                      {question.type === "TEXT" && (
                        <div className="space-y-3 pt-1">
                          <div className="border-b border-dotted border-slate-400 w-full h-6"></div>
                          <div className="border-b border-dotted border-slate-400 w-full h-6"></div>
                        </div>
                      )}

                      {question.type === "YES_NO" && (
                        <div className="flex items-center gap-10 pt-1">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-slate-400 print:border-black"></div>
                            <span className="font-bold text-slate-700 text-sm">نعم</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-slate-400 print:border-black"></div>
                            <span className="font-bold text-slate-700 text-sm">لا</span>
                          </div>
                        </div>
                      )}

                      {(question.type === "OPTIONS" || question.type === "MULTI_OPTIONS") && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 pt-1">
                          {(question.options || []).map((opt) => (
                            <div key={opt.id} className="flex items-start gap-2">
                              {question.type === "OPTIONS" ? (
                                <div className="w-4 h-4 rounded-full border border-slate-400 print:border-black mt-0.5 shrink-0"></div>
                              ) : (
                                <div className="w-4 h-4 rounded border border-slate-400 print:border-black mt-0.5 shrink-0"></div>
                              )}
                              <span className="font-bold text-slate-700 text-sm leading-tight">{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === "HIJRI_DATE" && (
                        <div className="flex items-center gap-3 pt-2">
                          <span className="font-bold text-slate-500 text-sm">التاريخ:</span>
                          <div className="border-b border-slate-800 w-8 text-center h-5"></div>
                          <span className="font-bold text-slate-500 text-sm">/</span>
                          <div className="border-b border-slate-800 w-8 text-center h-5"></div>
                          <span className="font-bold text-slate-500 text-sm">/</span>
                          <div className="border-b border-slate-800 w-12 text-center h-5"></div>
                          <span className="font-bold text-slate-500 text-sm">هـ</span>
                        </div>
                      )}

                      {question.type === "FILE" && (
                        <div className="mt-2 p-2 border border-dashed border-slate-300 rounded bg-slate-50 text-center print:bg-transparent print:border-slate-400">
                          <p className="text-slate-500 font-bold text-[10px]">
                            [مرفق إلكتروني]
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* تذييل الورقة */}
        <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-center text-[10px] font-bold text-slate-400">
          <p>تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</p>
          <p>توليد آلي - منصة زاد التنموية</p>
        </div>
      </div>
    </div>
  );
}
