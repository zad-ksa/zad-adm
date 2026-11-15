"use client";

import { useState, useEffect, use, useMemo } from "react";
import { PageHeader, theadRowClass, tbodyClass } from "@/components/console/layout";
import FileOpenDownload, { downloadHref } from "@/components/FileOpenDownload";
import { cx, MONO } from "@/components/console/ui";
import {
  answerText as resolveAnswerText,
  choiceRowKey,
  isMatrixType,
  matrixCellKey,
  matrixFilledCount,
  questionsFromApi,
  type SurveyQuestion,
} from "@/lib/surveyQuestions";
import {
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

type Question = SurveyQuestion;

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

/** رقم عربي مختصر للتاريخ + الوقت. */
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("ar-SA")} ${d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`;
}

const CHOICE_TYPES = new Set(["OPTIONS", "MULTI_OPTIONS", "YES_NO"]);

/** إجابةُ مصفوفةٍ لمشاركٍ واحد — تُقرأ جدولاً كما مُلئت، لا ٤٥ سطراً. */
function MatrixAnswerTable({ question, answers }: { question: SurveyQuestion; answers: Record<string, any> }) {
  const matrix = question.matrix;
  if (!matrix) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full border-collapse text-caption">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/50">
            <th className="min-w-[160px] border-e border-slate-200 px-3 py-2 text-start text-meta font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
              الصف
            </th>
            {matrix.columns.map((column) => (
              <th
                key={column.id}
                className="min-w-[80px] border-e border-slate-200 px-2 py-2 text-center text-meta font-medium leading-snug text-slate-500 last:border-e-0 dark:border-slate-700 dark:text-slate-400"
              >
                {column.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => {
            const scores = matrix.columns.map((column) =>
              question.type === "CHOICE_MATRIX"
                ? answers[choiceRowKey(question.id, row.id)] === column.id ? "✓" : undefined
                : answers[matrixCellKey(question.id, row.id, column.id)]
            );
            // صفٌّ لم يُقيَّم أصلاً لا يُعرض: «لم نستفد من هذه الخدمة» خبرٌ
            // يُقال مرّةً بغيابه، لا خمسَ شُرَطٍ في صفّ.
            if (scores.every((score) => !score)) return null;
            return (
              <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">
                <td className="border-e border-slate-200 px-3 py-1.5 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  {row.text}
                </td>
                {scores.map((score, index) => (
                  <td
                    key={matrix.columns[index].id}
                    className={cx(
                      "border-e border-slate-200 px-2 py-1.5 text-center last:border-e-0 dark:border-slate-700",
                      MONO,
                      score ? "font-semibold text-slate-800 dark:text-slate-100" : "text-slate-300 dark:text-slate-600"
                    )}
                  >
                    {score || "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ٤٠٣ من مسار الردود: الاستبيانُ لغيره.
  const [denied, setDenied] = useState(false);

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

      // ردُّ الردود هو الفاصل: مسارُ الاستبيان عامٌّ، ومسارُ الردود محروسٌ
      // بملكيّة الاستبيان. فـ٤٠٣ تعني «ليس من إنشائك» لا «غير موجود».
      if (responsesRes.status === 403) {
        setDenied(true);
        return;
      }
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
  // (follow-ups) لأسئلة "نعم/لا"، وخلايا المصفوفة — لعرضَي "حسب السؤال"
  // و"الجدول". وخليّةُ المصفوفة عمودٌ قائمٌ بنفسه: متوسّطُ «الجودة» لخدمةٍ
  // بعينها هو ما يُحسب، لا المصفوفةُ جملةً.
  type FlatEntry = {
    q: Question;
    sectionTitle: string;
    sectionIdx: number;
    isFollowUp: boolean;
    isMatrixCell?: boolean;
  };
  const flatQuestions = useMemo(() => {
    if (!survey) return [] as FlatEntry[];
    const out: FlatEntry[] = [];
    const bare = { isRequired: false, allowAttachment: false };
    survey.sections.forEach((section, sIdx) => {
      section.questions.forEach((q) => {
        // كل صفٍّ في جدول الاختيار سؤالُ خيارٍ قائمٌ بنفسه: أعمدتُه خياراتُه،
        // فتعمل عليه نِسَبُ «حسب السؤال» وعمودُ الجدول كما تعمل على غيره.
        if (q.type === "CHOICE_MATRIX") {
          (q.matrix?.rows ?? []).forEach((row) => {
            out.push({
              q: { ...bare, id: choiceRowKey(q.id, row.id), text: `${q.text} — ${row.text}`, type: "OPTIONS", options: q.matrix?.columns ?? [] },
              sectionTitle: section.title,
              sectionIdx: sIdx,
              isFollowUp: false,
              isMatrixCell: true,
            });
          });
          return;
        }
        if (q.type === "MATRIX") {
          const matrix = q.matrix;
          (matrix?.rows ?? []).forEach((row) => {
            (matrix?.columns ?? []).forEach((column) => {
              out.push({
                q: { ...bare, id: matrixCellKey(q.id, row.id, column.id), text: `${row.text} — ${column.text}`, type: "TEXT" },
                sectionTitle: section.title,
                sectionIdx: sIdx,
                isFollowUp: false,
                isMatrixCell: true,
              });
            });
          });
          return;
        }
        out.push({ q, sectionTitle: section.title, sectionIdx: sIdx, isFollowUp: false });
        (q.followUpQuestions || []).forEach((fu) => {
          out.push({
            q: { ...bare, id: fu.id, text: fu.text, type: "TEXT" },
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
  if (denied) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="font-semibold text-slate-800 dark:text-slate-100">هذا الاستبيان ليس من إنشائك</p>
          <p className="mt-1 text-caption text-slate-600 dark:text-slate-300">
            وردودُ الجمعيات لا تُقرأ إلا لمالك الاستبيان.
          </p>
        </div>
      </div>
    );
  }
  if (!survey) return <div className="p-8 text-center dark:text-slate-300">الاستبيان غير موجود</div>;

  const parsedResponses = responses.map((r) => ({
    ...r,
    answers: getParsedJson(r.answers) as Record<string, any>,
    attachments: getParsedJson(r.attachments) as Record<string, string | string[]>,
  }));

  const selectedRespondent =
    parsedResponses.find((r) => r.id === selectedRespondentId) || parsedResponses[0] || null;

  // المسمّى الظاهر للمشارك: أول إجابة نصية له — ففي أغلب الاستبيانات يكون السؤال
  // الأول هو "اسمك الكريم". ثم اسم الجمعية المحفوظ، ثم رقم تسلسلي.
  const respondentLabel = (response: (typeof parsedResponses)[number], index: number): string => {
    for (const { q, isMatrixCell } of flatQuestions) {
      // ودرجةُ خليّةٍ ليست اسماً: «٤» لا تُعرَّف بها جمعية.
      if (isMatrixCell) continue;
      const t = resolveAnswerText(q, response.answers[q.id], response.answers).trim();
      if (t) return t;
    }
    return (response.charityName || "").trim() || `مشارك ${index + 1}`;
  };
  const respondentIndex = (id: string) => parsedResponses.findIndex((r) => r.id === id);

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
            if (isMatrixType(q.type)) return matrixFilledCount(q, response.answers) > 0;
            const { answer, attachment } = getValue(q.id);
            return answer !== undefined || attachment !== undefined;
          });
          if (!sectionHasAnswers) return null;

          return (
            <div
              key={section.id}
              className="bg-slate-50 rounded-xl p-5 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-700"
            >
              <h4 className="font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-200 dark:text-slate-300 dark:border-slate-700">
                {sIdx + 1}. {section.title}
              </h4>
              <div className="space-y-4">
                {section.questions.map((question, qIdx) => {
                  const { answer, attachment } = getValue(question.id);
                  const attachmentUrls = Array.isArray(attachment) ? attachment : attachment ? [attachment] : [];
                  const grid = isMatrixType(question.type);
                  if (grid && matrixFilledCount(question, response.answers) === 0) return null;
                  if (question.type !== "FILE" && !grid && !answer && attachmentUrls.length === 0)
                    return null;

                  return (
                    <div key={question.id} className="flex flex-col gap-1">
                      <span className="text-caption font-semibold text-slate-600 dark:text-slate-400">
                        {qIdx + 1}- {question.text}
                      </span>
                      {grid && (
                        <MatrixAnswerTable question={question} answers={response.answers} />
                      )}
                      {answer && !grid && (
                        <p className="text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-lg text-caption dark:text-slate-100 dark:bg-slate-800 dark:border-slate-700">
                          {resolveAnswerText(question, answer, response.answers)}
                        </p>
                      )}
                      {question.type === "FILE" && attachmentUrls.length === 0 && (
                        <p className="text-slate-500 text-caption italic dark:text-slate-400 mt-1">لم يتم إرفاق ملف</p>
                      )}
                      {attachmentUrls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {attachmentUrls.map((url, i) => (
                            <FileOpenDownload
                              key={url}
                              url={url}
                              label={`${question.type === "FILE" ? "المرفق" : "مرفق إضافي"}${attachmentUrls.length > 1 ? ` ${i + 1}` : ""}`}
                              name={`${response.charityName?.trim() || "مرفق"} - ${question.text}${attachmentUrls.length > 1 ? ` ${i + 1}` : ""}`}
                            />
                          ))}
                        </div>
                      )}
                      {/* وجوابُ الفرع هو ما اختاره مُعِدُّ الاستبيان، لا «نعم»
                          دائماً: سؤالٌ يُستفسر عند «لا» كانت إجابةُ «لماذا؟»
                          فيه تُحفظ ولا تُعرض هنا أبداً. */}
                      {question.type === "YES_NO" &&
                        answer === (question.followUpOn ?? "yes") &&
                        question.followUpQuestions &&
                        question.followUpQuestions.length > 0 && (
                          <div className="mt-2 space-y-2 border-r-4 border-primary/20 pr-4">
                            {question.followUpQuestions.map((followUp) => {
                              const followUpAnswer = response.answers[followUp.id];
                              if (!followUpAnswer) return null;
                              return (
                                <div key={followUp.id} className="flex flex-col gap-1">
                                  <span className="text-caption font-semibold text-slate-500 dark:text-slate-400">
                                    {followUp.text}
                                  </span>
                                  <p className="text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-caption dark:text-slate-100 dark:bg-slate-800 dark:border-slate-700">
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
        <PageHeader
          crumbs={[
            { label: "الاستبيانات المخصصة", href: "/main/custom-surveys" },
            { label: "نتائج الاستبيان" },
          ]}
          title="نتائج الاستبيان"
          description={`${survey.title} · إجمالي الردود المستلمة: ${responses.length}`}
        />
      </div>

      {responses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:bg-slate-900 dark:border-slate-800">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-slate-700 dark:text-slate-400">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-section font-semibold text-slate-800 mb-2 dark:text-slate-100">لا توجد ردود بعد</h3>
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-semibold transition-all ${
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
              {parsedResponses.map((response, rIdx) => (
                <div
                  key={response.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:bg-slate-900 dark:border-slate-800"
                >
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4 dark:border-slate-700">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-section font-semibold text-slate-800 dark:text-slate-100">{respondentLabel(response, rIdx)}</h3>
                      <p className="text-caption text-slate-500 dark:text-slate-400">
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
              <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:bg-slate-900 dark:border-slate-800 h-fit lg:sticky lg:top-4 max-h-[80vh] overflow-y-auto">
                <p className="text-caption font-semibold text-slate-400 dark:text-slate-500 px-2 py-1.5">
                  المشاركون ({parsedResponses.length})
                </p>
                <ul className="space-y-1">
                  {parsedResponses.map((r, i) => {
                    const active = (selectedRespondent?.id || "") === r.id;
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => setSelectedRespondentId(r.id)}
                          className={`w-full text-right px-3 py-2 rounded-lg transition-colors ${
                            active
                              ? "bg-primary/10 text-primary dark:bg-primary/20"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="block text-caption font-semibold truncate">{respondentLabel(r, i)}</span>
                          <span className="block text-caption text-slate-400 dark:text-slate-500 truncate">
                            {fmtDate(r.createdAt)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:bg-slate-900 dark:border-slate-800 min-w-0">
                {selectedRespondent ? (
                  <>
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4 dark:border-slate-700">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-section font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {respondentLabel(selectedRespondent, respondentIndex(selectedRespondent.id))}
                        </h3>
                        <p className="text-caption text-slate-500 dark:text-slate-400">
                          تاريخ المشاركة: {fmtDate(selectedRespondent.createdAt)}
                        </p>
                      </div>
                    </div>
                    {renderRespondentAnswers(selectedRespondent)}
                  </>
                ) : (
                  <p className="text-slate-400 text-caption text-center py-10">اختر مشاركاً من القائمة</p>
                )}
              </div>
            </div>
          )}

          {/* ── حسب السؤال: لكل سؤال، تجميع إجابات كل المشاركين ────────────── */}
          {viewMode === "byQuestion" && (
            <div className="space-y-4">
              {flatQuestions.map(({ q, sectionTitle, sectionIdx, isFollowUp }, idx) => {
                const rawAnswers = parsedResponses
                  .map((r, i) => ({ name: respondentLabel(r, i), raw: r.answers[q.id] }))
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
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:bg-slate-900 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-caption font-semibold text-slate-400 dark:text-slate-500">
                          {sectionIdx + 1}. {sectionTitle}
                          {isFollowUp && " — سؤال تابع"}
                        </p>
                        <h4 className="text-caption font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{q.text}</h4>
                      </div>
                      <span className="shrink-0 text-caption font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                        {rawAnswers.length} إجابة
                      </span>
                    </div>

                    {rawAnswers.length === 0 ? (
                      <p className="text-caption text-slate-400 dark:text-slate-500">لا توجد إجابات على هذا السؤال.</p>
                    ) : isChoice ? (
                      <div className="space-y-2">
                        {tallyRows.map(([label, count]) => {
                          const pct = Math.round((count / rawAnswers.length) * 100);
                          return (
                            <div key={label} className="flex items-center gap-3">
                              <span className="w-40 shrink-0 text-caption font-semibold text-slate-600 dark:text-slate-300 truncate" title={label}>
                                {label}
                              </span>
                              <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-900/60 rounded-lg overflow-hidden">
                                <div
                                  className="h-full bg-primary/70 dark:bg-teal-500/60 rounded-lg"
                                  style={{ width: `${Math.max(4, (count / maxCount) * 100)}%` }}
                                />
                              </div>
                              <span className="w-16 shrink-0 text-left text-caption font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
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
                            className="text-caption text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2"
                          >
                            <span className="text-caption font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">
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
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full border-collapse text-caption">
                <thead>
                  <tr className={theadRowClass}>
                    <th className="text-meta font-medium text-slate-500 dark:text-slate-400 sticky right-0 z-10 h-10 min-w-[160px] whitespace-nowrap border-l border-slate-200 bg-slate-50 px-3 text-right dark:border-slate-800 dark:bg-slate-900">
                      المشارك
                    </th>
                    {flatQuestions.map(({ q, isFollowUp }, idx) => (
                      <th
                        key={`${q.id}-${idx}`}
                        title={q.text}
                        className="text-meta font-medium text-slate-500 dark:text-slate-400 min-w-[180px] max-w-[240px] px-3 py-2.5 text-right"
                      >
                        <span className="line-clamp-2">
                          {isFollowUp && "↳ "}
                          {q.text}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {parsedResponses.map((r, rIdx) => (
                    <tr
                      key={r.id}
                      className={rIdx % 2 ? "bg-slate-50/60 dark:bg-slate-800/30" : ""}
                    >
                      <td className={cx("sticky right-0 z-10 min-w-[160px] border-l border-slate-200 px-3 py-2 align-top font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200", rIdx % 2 ? "bg-slate-50 dark:bg-slate-900" : "bg-white dark:bg-slate-900")}>
                        <span className="block truncate max-w-[150px]" title={respondentLabel(r, rIdx)}>
                          {respondentLabel(r, rIdx)}
                        </span>
                        <span className="block text-caption font-normal text-slate-400 dark:text-slate-500">
                          {fmtDate(r.createdAt)}
                        </span>
                      </td>
                      {flatQuestions.map(({ q }, idx) => {
                        const raw = r.answers[q.id];
                        const att = r.attachments[q.id];
                        const urls = Array.isArray(att) ? att : att ? [att] : [];
                        const text = resolveAnswerText(q, raw, r.answers);
                        return (
                          <td
                            key={`${q.id}-${idx}`}
                            className="px-3 py-2 align-top text-slate-700 dark:text-slate-200"
                          >
                            {text && <span className="whitespace-pre-wrap break-words">{text}</span>}
                            {urls.length > 0 && (
                              <span className="flex flex-wrap gap-1 mt-1">
                                {urls.map((u, i) => (
                                  <span key={u} className="inline-flex items-center gap-1.5">
                                    <a
                                      href={u}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                      title="عرض"
                                    >
                                      ملف {urls.length > 1 ? i + 1 : ""}
                                    </a>
                                    <a
                                      href={downloadHref(u, `${r.charityName?.trim() || "مرفق"} - ${q.text}${urls.length > 1 ? ` ${i + 1}` : ""}`)}
                                      download
                                      className="text-primary hover:opacity-70"
                                      title="تنزيل"
                                      aria-label="تنزيل الملف"
                                    >
                                      <Download className="w-3 h-3" />
                                    </a>
                                  </span>
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
