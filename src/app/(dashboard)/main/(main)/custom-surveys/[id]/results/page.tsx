"use client";

import { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  FileText,
  User,
  LayoutList,
  UserSquare2,
  ListChecks,
  Table2,
} from "lucide-react";

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

type ViewMode = "list" | "byRespondent" | "byQuestion" | "table";
const VIEW_MODE_STORAGE_KEY = "zad_survey_results_view_mode";

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

/** رقم عربي مختصر للتاريخ + الوقت. */
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("ar-SA")} ${d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`;
}

/** يحوّل الإجابة الخام إلى نص مقروء حسب نوع السؤال. */
function resolveAnswerText(question: Pick<Question, "type" | "options">, raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") return "";
  const s = String(raw);
  if (question.type === "OPTIONS") return question.options?.find((o) => o.id === s)?.text || s;
  if (question.type === "MULTI_OPTIONS")
    return s
      .split(",")
      .map((id) => question.options?.find((o) => o.id === id)?.text || id)
      .join("، ");
  if (question.type === "YES_NO") return s === "yes" ? "نعم" : "لا";
  return s;
}

const CHOICE_TYPES = new Set(["OPTIONS", "MULTI_OPTIONS", "YES_NO"]);

export default function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedRespondentId, setSelectedRespondentId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === "list" || saved === "byRespondent" || saved === "byQuestion" || saved === "table") {
        setViewMode(saved);
      }
    } catch {
      /* localStorage غير متاح */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      /* تجاهل */
    }
  };

  const fetchData = async () => {
    try {
      const [surveyRes, responsesRes] = await Promise.all([
        fetch(`/api/custom-surveys/${resolvedParams.id}`),
        fetch(`/api/custom-surveys/${resolvedParams.id}/responses`),
      ]);

      if (surveyRes.ok && responsesRes.ok) {
        const surveyData = await surveyRes.json();
        setSurvey({
          ...surveyData,
          sections: surveyData.sections.map((s: Section) => ({ ...s, questions: questionsFromApi(s.questions) })),
        });
        setResponses(await responsesRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // قائمة مسطّحة مرتّبة بكل الأسئلة القابلة للعرض — بما فيها الأسئلة التابعة
  // (follow-ups) لأسئلة "نعم/لا" — لعرضَي "حسب السؤال" و"الجدول".
  const flatQuestions = useMemo(() => {
    if (!survey) return [] as { q: Question; sectionTitle: string; sectionIdx: number; isFollowUp: boolean }[];
    const out: { q: Question; sectionTitle: string; sectionIdx: number; isFollowUp: boolean }[] = [];
    survey.sections.forEach((section, sIdx) => {
      section.questions.forEach((q) => {
        out.push({ q, sectionTitle: section.title, sectionIdx: sIdx, isFollowUp: false });
        (q.followUpQuestions || []).forEach((fu) => {
          out.push({
            q: { id: fu.id, text: fu.text, type: "TEXT" },
            sectionTitle: section.title,
            sectionIdx: sIdx,
            isFollowUp: true,
          });
        });
      });
    });
    return out;
  }, [survey]);

  if (isLoading) return <div className="p-8 text-center dark:text-slate-300">جاري تحميل النتائج...</div>;
  if (!survey) return <div className="p-8 text-center dark:text-slate-300">الاستبيان غير موجود</div>;

  const parsedResponses = responses.map((r) => ({
    ...r,
    answers: getParsedJson(r.answers) as Record<string, any>,
    attachments: getParsedJson(r.attachments) as Record<string, string | string[]>,
  }));

  const selectedRespondent =
    parsedResponses.find((r) => r.id === selectedRespondentId) || parsedResponses[0] || null;

  // ── عرض إجابات مشارك واحد (يُعاد استخدامه في "سرد" و"حسب المشارك") ──────────
  const renderRespondentAnswers = (response: (typeof parsedResponses)[number]) => {
    const getValue = (questionId: string) => ({
      answer: response.answers[questionId],
      attachment: response.attachments[questionId],
    });

    return (
      <div className="space-y-6">
        {survey.sections.map((section, sIdx) => {
          const sectionHasAnswers = section.questions.some((q) => {
            const { answer, attachment } = getValue(q.id);
            return answer !== undefined || attachment !== undefined;
          });
          if (!sectionHasAnswers) return null;

          return (
            <div
              key={section.id}
              className="bg-slate-50 rounded-xl p-5 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-700"
            >
              <h4 className="font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200 dark:text-slate-300 dark:border-slate-700">
                {sIdx + 1}. {section.title}
              </h4>
              <div className="space-y-4">
                {section.questions.map((question, qIdx) => {
                  const { answer, attachment } = getValue(question.id);
                  const attachmentUrls = Array.isArray(attachment) ? attachment : attachment ? [attachment] : [];
                  if (question.type !== "FILE" && !answer && attachmentUrls.length === 0) return null;

                  return (
                    <div key={question.id} className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        {qIdx + 1}- {question.text}
                      </span>
                      {answer && (
                        <p className="text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm dark:text-slate-100 dark:bg-slate-800 dark:border-slate-700">
                          {resolveAnswerText(question, answer)}
                        </p>
                      )}
                      {question.type === "FILE" && attachmentUrls.length === 0 && (
                        <p className="text-slate-500 text-sm italic dark:text-slate-400 mt-1">لم يتم إرفاق ملف</p>
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
                              <Download className="w-4 h-4" />
                              {question.type === "FILE" ? "تحميل المرفق" : "مرفق إضافي للسؤال"}{" "}
                              {attachmentUrls.length > 1 ? i + 1 : ""}
                            </a>
                          ))}
                        </div>
                      )}
                      {question.type === "YES_NO" &&
                        answer === "yes" &&
                        question.followUpQuestions &&
                        question.followUpQuestions.length > 0 && (
                          <div className="mt-2 space-y-2 border-r-4 border-primary/20 pr-4">
                            {question.followUpQuestions.map((followUp) => {
                              const followUpAnswer = response.answers[followUp.id];
                              if (!followUpAnswer) return null;
                              return (
                                <div key={followUp.id} className="flex flex-col gap-1">
                                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {followUp.text}
                                  </span>
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
    );
  };

  const VIEW_TABS: { key: ViewMode; label: string; Icon: typeof LayoutList }[] = [
    { key: "list", label: "سرد", Icon: LayoutList },
    { key: "byRespondent", label: "حسب المشارك", Icon: UserSquare2 },
    { key: "byQuestion", label: "حسب السؤال", Icon: ListChecks },
    { key: "table", label: "جدول", Icon: Table2 },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto pb-32 dark:bg-slate-900" dir="rtl">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/main/custom-surveys"
          className="text-slate-400 hover:text-slate-800 transition-colors dark:text-slate-500 dark:hover:text-slate-100"
        >
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
          <p className="text-slate-500 dark:text-slate-400">
            قم بنسخ رابط الاستبيان وإرساله للجمعيات للبدء في تلقي الردود.
          </p>
        </div>
      ) : (
        <>
          {/* مبدّل طرق العرض */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-fit mb-6 flex-wrap">
            {VIEW_TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => changeViewMode(key)}
                aria-pressed={viewMode === key}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === key
                    ? "bg-white text-primary shadow-sm dark:bg-slate-700"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* ── سرد: كل الردود واحداً تلو الآخر (السلوك القديم) ─────────────── */}
          {viewMode === "list" && (
            <div className="space-y-6">
              {parsedResponses.map((response) => (
                <div
                  key={response.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700"
                >
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4 dark:border-slate-700">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{response.charityName}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        تاريخ المشاركة: {fmtDate(response.createdAt)}
                      </p>
                    </div>
                  </div>
                  {renderRespondentAnswers(response)}
                </div>
              ))}
            </div>
          )}

          {/* ── حسب المشارك: قائمة أسماء + إجابات المختار وحده ─────────────── */}
          {viewMode === "byRespondent" && (
            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm dark:bg-slate-800 dark:border-slate-700 h-fit lg:sticky lg:top-4 max-h-[80vh] overflow-y-auto">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-2 py-1.5">
                  المشاركون ({parsedResponses.length})
                </p>
                <ul className="space-y-1">
                  {parsedResponses.map((r) => {
                    const active = (selectedRespondent?.id || "") === r.id;
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => setSelectedRespondentId(r.id)}
                          className={`w-full text-right px-3 py-2 rounded-xl transition-colors ${
                            active
                              ? "bg-primary/10 text-primary dark:bg-primary/20"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="block text-xs font-bold truncate">{r.charityName || "مشارك"}</span>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate">
                            {fmtDate(r.createdAt)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700 min-w-0">
                {selectedRespondent ? (
                  <>
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4 dark:border-slate-700">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                          {selectedRespondent.charityName}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          تاريخ المشاركة: {fmtDate(selectedRespondent.createdAt)}
                        </p>
                      </div>
                    </div>
                    {renderRespondentAnswers(selectedRespondent)}
                  </>
                ) : (
                  <p className="text-slate-400 text-sm text-center py-10">اختر مشاركاً من القائمة</p>
                )}
              </div>
            </div>
          )}

          {/* ── حسب السؤال: لكل سؤال، تجميع إجابات كل المشاركين ────────────── */}
          {viewMode === "byQuestion" && (
            <div className="space-y-4">
              {flatQuestions.map(({ q, sectionTitle, sectionIdx, isFollowUp }, idx) => {
                const rawAnswers = parsedResponses
                  .map((r) => ({ name: r.charityName || "مشارك", raw: r.answers[q.id] }))
                  .filter((x) => x.raw !== undefined && x.raw !== null && x.raw !== "");

                const isChoice = CHOICE_TYPES.has(q.type);
                // تجميع الخيارات: لكل قيمة عدد مرات اختيارها.
                const tally = new Map<string, number>();
                if (isChoice) {
                  for (const { raw } of rawAnswers) {
                    const parts =
                      q.type === "MULTI_OPTIONS" ? String(raw).split(",") : [String(raw)];
                    for (const p of parts) {
                      const label = resolveAnswerText(q, p);
                      tally.set(label, (tally.get(label) || 0) + 1);
                    }
                  }
                }
                const tallyRows = [...tally.entries()].sort((a, b) => b[1] - a[1]);
                const maxCount = tallyRows.reduce((m, [, c]) => Math.max(m, c), 0) || 1;

                return (
                  <div
                    key={`${q.id}-${idx}`}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          {sectionIdx + 1}. {sectionTitle}
                          {isFollowUp && " — سؤال تابع"}
                        </p>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{q.text}</h4>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                        {rawAnswers.length} إجابة
                      </span>
                    </div>

                    {rawAnswers.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500">لا توجد إجابات على هذا السؤال.</p>
                    ) : isChoice ? (
                      <div className="space-y-2">
                        {tallyRows.map(([label, count]) => {
                          const pct = Math.round((count / rawAnswers.length) * 100);
                          return (
                            <div key={label} className="flex items-center gap-3">
                              <span className="w-40 shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300 truncate" title={label}>
                                {label}
                              </span>
                              <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-900/60 rounded-lg overflow-hidden">
                                <div
                                  className="h-full bg-primary/70 dark:bg-teal-500/60 rounded-lg"
                                  style={{ width: `${Math.max(4, (count / maxCount) * 100)}%` }}
                                />
                              </div>
                              <span className="w-16 shrink-0 text-left text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                                {count} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {rawAnswers.map(({ name, raw }, i) => (
                          <li
                            key={i}
                            className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2"
                          >
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-0.5">
                              {name}
                            </span>
                            {resolveAnswerText(q, raw)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── جدول: صف لكل مشارك، عمود لكل سؤال ─────────────────────────── */}
          {viewMode === "table" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm dark:bg-slate-800 dark:border-slate-700 overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    <th className="sticky right-0 z-10 bg-slate-50 dark:bg-slate-900/50 text-right font-bold text-slate-600 dark:text-slate-300 px-3 py-2.5 border-b border-l border-slate-200 dark:border-slate-700 min-w-[160px]">
                      المشارك
                    </th>
                    {flatQuestions.map(({ q, isFollowUp }, idx) => (
                      <th
                        key={`${q.id}-${idx}`}
                        title={q.text}
                        className="text-right font-bold text-slate-500 dark:text-slate-400 px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 min-w-[180px] max-w-[240px]"
                      >
                        <span className="line-clamp-2">
                          {isFollowUp && "↳ "}
                          {q.text}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedResponses.map((r, rIdx) => (
                    <tr
                      key={r.id}
                      className={rIdx % 2 ? "bg-slate-50/40 dark:bg-slate-900/20" : ""}
                    >
                      <td className="sticky right-0 z-10 bg-inherit align-top px-3 py-2 border-b border-l border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 min-w-[160px]">
                        <span className="block truncate max-w-[150px]" title={r.charityName}>
                          {r.charityName || "مشارك"}
                        </span>
                        <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">
                          {fmtDate(r.createdAt)}
                        </span>
                      </td>
                      {flatQuestions.map(({ q }, idx) => {
                        const raw = r.answers[q.id];
                        const att = r.attachments[q.id];
                        const urls = Array.isArray(att) ? att : att ? [att] : [];
                        const text = resolveAnswerText(q, raw);
                        return (
                          <td
                            key={`${q.id}-${idx}`}
                            className="align-top px-3 py-2 border-b border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                          >
                            {text && <span className="whitespace-pre-wrap break-words">{text}</span>}
                            {urls.length > 0 && (
                              <span className="flex flex-wrap gap-1 mt-1">
                                {urls.map((u, i) => (
                                  <a
                                    key={u}
                                    href={u}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <Download className="w-3 h-3" /> ملف {urls.length > 1 ? i + 1 : ""}
                                  </a>
                                ))}
                              </span>
                            )}
                            {!text && urls.length === 0 && <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
