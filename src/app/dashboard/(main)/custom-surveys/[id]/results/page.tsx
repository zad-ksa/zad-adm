"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowRight, Download, FileText, User } from "lucide-react";

interface Response {
  id: string;
  charityName: string;
  answers: Record<string, string>;
  attachments: Record<string, string>;
  createdAt: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
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
  sections: Section[];
}

export default function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [surveyRes, responsesRes] = await Promise.all([
        fetch(`/api/custom-surveys/${resolvedParams.id}`),
        fetch(`/api/custom-surveys/${resolvedParams.id}/responses`)
      ]);

      if (surveyRes.ok && responsesRes.ok) {
        setSurvey(await surveyRes.json());
        setResponses(await responsesRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">جاري تحميل النتائج...</div>;
  if (!survey) return <div className="p-8 text-center">الاستبيان غير موجود</div>;

  // Flatten questions to make it easier to lookup
  const allQuestions = survey.sections.flatMap(s => s.questions);

  return (
    <div className="p-8 max-w-7xl mx-auto pb-32">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/custom-surveys" className="text-slate-400 hover:text-slate-800 transition-colors">
          <ArrowRight className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">نتائج الاستبيان: {survey.title}</h1>
          <p className="text-slate-500 mt-1">إجمالي الردود المستلمة: {responses.length}</p>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">لا توجد ردود بعد</h3>
          <p className="text-slate-500">قم بنسخ رابط الاستبيان وإرساله للجمعيات للبدء في تلقي الردود.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {responses.map((response) => (
            <div key={response.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{response.charityName}</h3>
                  <p className="text-sm text-slate-500">
                    تاريخ المشاركة: {new Date(response.createdAt).toLocaleDateString('ar-SA')} - {new Date(response.createdAt).toLocaleTimeString('ar-SA')}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {survey.sections.map((section, sIdx) => {
                  // Only show section if there are answers for its questions
                  const sectionHasAnswers = section.questions.some(q => response.answers[q.id] || response.attachments[q.id]);
                  if (!sectionHasAnswers) return null;

                  return (
                    <div key={section.id} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                      <h4 className="font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                        {sIdx + 1}. {section.title}
                      </h4>
                      <div className="space-y-4">
                        {section.questions.map((question, qIdx) => {
                          const answer = response.answers[question.id];
                          const attachment = response.attachments[question.id];
                          
                          if (!answer && !attachment) return null;

                          return (
                            <div key={question.id} className="flex flex-col gap-1">
                              <span className="text-sm font-bold text-slate-600">{qIdx + 1}- {question.text}</span>
                              {answer && (
                                <p className="text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm">
                                  {question.type === "OPTIONS" 
                                    ? (question.options?.find(opt => opt.id === answer)?.text || answer)
                                    : question.type === "MULTI_OPTIONS"
                                      ? answer.split(",").map(id => question.options?.find(opt => opt.id === id)?.text || id).join("، ")
                                      : question.type === "YES_NO"
                                        ? (answer === "yes" ? "نعم" : "لا")
                                        : answer}
                                </p>
                              )}
                              {attachment && (
                                <div className="mt-2">
                                  <a
                                    href={attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                  >
                                    <Download className="w-4 h-4" /> تحميل المرفق
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
