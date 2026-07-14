"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowRight, Download, FileText, User } from "lucide-react";

interface Response {
  id: string;
  charityName: string;
  answers: Record<string, string>;
  attachments: Record<string, string | string[]>;
  createdAt: string;
}

interface FollowUpQuestion {
  id: string;
  text: string;
  isRequired: boolean;
}

interface Question {
  id: string;
  text: string;
  type: string;
  options?: { id: string; text: string }[];
  followUpQuestions?: FollowUpQuestion[];
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

const getParsedJson = (val: any) => {
  if (!val) return {};
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return {};
    }
  }
  return val;
};

// See edit page for why YES_NO questions store follow-ups inside `options`.
function questionsFromApi(questions: any[]): Question[] {
  return questions.map((q) => {
    if (q.type === "YES_NO" && q.options && !Array.isArray(q.options)) {
      return { ...q, options: undefined, followUpQuestions: q.options.followUpQuestions || [] };
    }
    return q;
  });
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
        const surveyData = await surveyRes.json();
        setSurvey({
          ...surveyData,
          sections: surveyData.sections.map((s: Section) => ({ ...s, questions: questionsFromApi(s.questions) }))
        });
        setResponses(await responsesRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center dark:text-slate-300">جاري تحميل النتائج...</div>;
  if (!survey) return <div className="p-8 text-center dark:text-slate-300">الاستبيان غير موجود</div>;

  // Flatten questions to make it easier to lookup
  const allQuestions = survey.sections.flatMap(s => s.questions);

  return (
    <div className="p-8 max-w-7xl mx-auto pb-32 dark:bg-slate-900">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/main/custom-surveys" className="text-slate-400 hover:text-slate-800 transition-colors dark:text-slate-500 dark:hover:text-slate-100">
          <ArrowRight className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">نتائج الاستبيان: {survey.title}</h1>
          <p className="text-slate-500 mt-1 dark:text-slate-400">إجمالي الردود المستلمة: {responses.length}</p>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-slate-700 dark:text-slate-400">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2 dark:text-slate-100">لا توجد ردود بعد</h3>
          <p className="text-slate-500 dark:text-slate-400">قم بنسخ رابط الاستبيان وإرساله للجمعيات للبدء في تلقي الردود.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {responses.map((response) => {
            const answers = getParsedJson(response.answers);
            const attachments = getParsedJson(response.attachments);

            // Resolve questions values handling both exact key match and index fallback (for modified surveys)
            const getQuestionValue = (questionId: string) => {
              if (answers[questionId] !== undefined) {
                return {
                  answer: answers[questionId],
                  attachment: attachments[questionId]
                };
              }

              // Fallback to match by index
              const totalQuestionIndex = allQuestions.findIndex(q => q.id === questionId);
              const oldQuestionId = totalQuestionIndex !== -1 ? Object.keys(answers)[totalQuestionIndex] : null;

              if (oldQuestionId) {
                return {
                  answer: answers[oldQuestionId],
                  attachment: attachments[oldQuestionId]
                };
              }

              return { answer: undefined, attachment: undefined };
            };

            return (
              <div key={response.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4 dark:border-slate-700">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{response.charityName}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      تاريخ المشاركة: {new Date(response.createdAt).toLocaleDateString('ar-SA')} - {new Date(response.createdAt).toLocaleTimeString('ar-SA')}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {survey.sections.map((section, sIdx) => {
                    // Only show section if there are answers for its questions
                    const sectionHasAnswers = section.questions.some(q => {
                      const { answer, attachment } = getQuestionValue(q.id);
                      return answer !== undefined || attachment !== undefined;
                    });
                    if (!sectionHasAnswers) return null;

                    return (
                      <div key={section.id} className="bg-slate-50 rounded-xl p-5 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-700">
                        <h4 className="font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200 dark:text-slate-300 dark:border-slate-700">
                          {sIdx + 1}. {section.title}
                        </h4>
                        <div className="space-y-4">
                          {section.questions.map((question, qIdx) => {
                            const { answer, attachment } = getQuestionValue(question.id);
                            const attachmentUrls = Array.isArray(attachment)
                              ? attachment
                              : attachment ? [attachment] : [];

                            if (!answer && attachmentUrls.length === 0) return null;

                            return (
                              <div key={question.id} className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{qIdx + 1}- {question.text}</span>
                                {answer && (
                                  <p className="text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm dark:text-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                    {question.type === "OPTIONS"
                                      ? (question.options?.find(opt => opt.id === answer)?.text || answer)
                                      : question.type === "MULTI_OPTIONS"
                                        ? answer.split(",").map((id: string) => question.options?.find(opt => opt.id === id)?.text || id).join("، ")
                                        : question.type === "YES_NO"
                                          ? (answer === "yes" ? "نعم" : "لا")
                                          : answer}
                                  </p>
                                )}
                                {attachmentUrls.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {attachmentUrls.map((url, i) => (
                                      <a
                                        key={url}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors dark:bg-primary/20"
                                      >
                                        <Download className="w-4 h-4" /> تحميل المرفق {attachmentUrls.length > 1 ? i + 1 : ""}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {question.type === "YES_NO" && answer === "yes" && question.followUpQuestions && question.followUpQuestions.length > 0 && (
                                  <div className="mt-2 space-y-2 border-r-4 border-primary/20 pr-4">
                                    {question.followUpQuestions.map(followUp => {
                                      const { answer: followUpAnswer } = getQuestionValue(followUp.id);
                                      if (!followUpAnswer) return null;
                                      return (
                                        <div key={followUp.id} className="flex flex-col gap-1">
                                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{followUp.text}</span>
                                          <p className="text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm dark:text-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                            {followUpAnswer}
                                          </p>
                                        </div>
                                      );
                                    })}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
