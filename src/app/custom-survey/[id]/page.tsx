"use client";

import { useState, useEffect, useRef, use } from "react";
import { notify } from "@/components/console/toastBus";
import { Spinner, btn, cx, field } from "@/components/console/ui";
import { MatrixField } from "@/components/console/MatrixField";
import { ChoiceMatrixField } from "@/components/console/ChoiceMatrixField";
import {
  choiceMatrixMissingRows,
  choiceRowKey,
  isAnswered,
  matrixCellCount,
  matrixCellKey,
  matrixFilledCount,
  matrixPartialRows,
  extraTextKey,
  otherTextKey,
  questionsFromApi,
  selectedOptionIds,
  type SurveyQuestion,
} from "@/lib/surveyQuestions";
import { useRouter } from "next/navigation";
import { createSurveyUploadTicket } from "@/app/actions/surveyUpload";
import { uploadWithTicket } from "@/lib/clientUpload";
import { UploadCloud, CheckCircle2, AlertCircle, Check, X, Paperclip } from "lucide-react";
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


interface Section {
  id: string;
  title: string;
  questions: SurveyQuestion[];
}

/**
 * مربّعُ نصِّ خيارٍ — «أخرى: ....».
 *
 * ولا يظهر إلّا إذا اختير خيارُه، ويُلزم إذا كان السؤالُ إجبارياً: «أخرى»
 * وحدَها ليست جواباً، فمن اختارها ولم يكتب لم يُجب.
 */
function OtherText({
  question,
  option,
  shown,
  answers,
  setAnswers,
}: {
  question: SurveyQuestion;
  option: { id: string; text: string; allowText?: boolean };
  shown: boolean;
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  if (!option.allowText || !shown) return null;
  const key = otherTextKey(question.id, option.id);
  return (
    <div className="mt-2 ps-8">
      <input
        type="text"
        value={answers[key] || ""}
        onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
        placeholder={`اكتب ${option.text}...`}
        aria-label={`${option.text} — ${question.text}`}
        autoFocus
        className={field}
      />
      {question.isRequired && !(answers[key] || "").trim() && (
        <p className="mt-1 text-caption font-semibold text-amber-700 dark:text-amber-400">اكتبْ ما اخترتَ، فالخيارُ وحدَه لا يكفي.</p>
      )}
    </div>
  );
}

/**
 * مربع النص الذي على السؤال — بعنوانه، إجباريا كان أو اختياريا.
 *
 * ويظهر تحت الخيارات مهما كان المختار، بخلاف نص «أخرى» الذي لا يظهر إلا إذا
 * اختير خياره.
 */
function ExtraTextBox({
  question,
  answers,
  setAnswers,
}: {
  question: SurveyQuestion;
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  if (!question.extraText) return null;
  const key = extraTextKey(question.id);
  const value = answers[key] || "";
  return (
    <div className="mt-3 space-y-1.5">
      <label className="block text-meta font-medium text-slate-600 dark:text-slate-300">
        {question.extraText.label}
        {question.extraText.required && <span className="ms-1 text-red-500">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
        rows={2}
        aria-label={`${question.extraText.label} — ${question.text}`}
        placeholder="اكتب هنا..."
        className={cx(field, "h-auto resize-y py-2 leading-6")}
      />
      {question.extraText.required && !value.trim() && (
        <p className="text-caption font-semibold text-amber-700 dark:text-amber-400">
          هذا الحقل مطلوب.
        </p>
      )}
    </div>
  );
}

/**
 * صفُّ خيارٍ — دائرةٌ للواحد ومربّعٌ للمتعدّد، بوسمِ العدة.
 *
 * والمدخَلُ `sr-only` والعلامةُ مرسومةٌ: مربّعُ المتصفّح الأصليُّ يختلف شكلُه
 * بين متصفّحٍ وآخرَ ولا يقبل مقاساً، وهو أوّلُ ما يُرى في استبيانٍ كلُّه خيارات.
 * ويبقى مدخلاً حقيقيّاً — فالأسهمُ وقارئُ الشاشة ولمسُ الوسم تعمل بلا كود.
 */
function Choice({
  name,
  multi,
  checked,
  onPick,
  children,
}: {
  name: string;
  multi?: boolean;
  checked: boolean;
  onPick: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-colors",
        checked
          ? "border-primary/40 bg-primary/[0.06] dark:border-teal-500/40 dark:bg-teal-500/[0.08]"
          : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
      )}
    >
      <input
        type={multi ? "checkbox" : "radio"}
        name={name}
        checked={checked}
        onChange={onPick}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cx(
          "mt-0.5 grid size-[1.125rem] shrink-0 place-items-center border transition-colors",
          multi ? "rounded" : "rounded-full",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
          checked
            ? "border-primary bg-primary text-white dark:border-teal-500 dark:bg-teal-500"
            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
        )}
      >
        {checked &&
          (multi ? (
            <Check className="size-3" strokeWidth={3} />
          ) : (
            <span className="size-2 rounded-full bg-white" />
          ))}
      </span>
      <span
        className={cx(
          "min-w-0 text-body leading-6",
          checked ? "font-medium text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"
        )}
      >
        {children}
      </span>
    </label>
  );
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
  // Scrolled to when the section changes. Top-of-page put the survey header
  // and the progress bar back on screen and left the first question below
  // the fold, so every section began with the respondent scrolling.
  const firstQuestionRef = useRef<HTMLDivElement | null>(null);
  const hasChangedSection = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Record<string, string[]>>({});
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
        setSurvey({
          ...data,
          sections: data.sections.map((s: Section) => ({ ...s, questions: questionsFromApi(s.questions) }))
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Land on the first question of the section just opened.
  //
  // Guarded by hasChangedSection so arriving at the survey does not yank the
  // page past its own introduction before the respondent has read it.
  useEffect(() => {
    if (!hasChangedSection.current) return;
    firstQuestionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentSectionIndex]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner size={40} />
      </div>
    );
  }

  if (!survey || !survey.isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/15 dark:text-red-300">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="mb-2 text-section font-semibold text-slate-800 dark:text-slate-100">عذراً</h1>
          <p className="text-body text-slate-500 dark:text-slate-400">هذا الاستبيان غير متاح حالياً أو تم إيقافه.</p>
        </div>
      </div>
    );
  }

  const currentSection = survey.sections[currentSectionIndex];

  const isLastSection = currentSectionIndex === survey.sections.length - 1;

  // Validation
  const allCurrentRequiredAnswered = currentSection?.questions.every(q => {
    if (q.type === "YES_NO" && q.requireAttachmentIfYes && answers[q.id] === "yes" && !(attachments[q.id]?.length)) {
      return false; // Requires attachment if "yes"
    }
    // التابعةُ تُلزم عند جوابها هي: سؤالٌ يُستفسر عند «لا» لا يُحبس من أجاب «نعم».
    if (q.type === "YES_NO" && answers[q.id] === (q.followUpOn ?? "yes") && q.followUpQuestions?.length) {
      const allFollowUpsAnswered = q.followUpQuestions.every(f => !f.isRequired || !!answers[f.id]);
      if (!allFollowUpsAnswered) return false;
    }
    if (q.type === "MATRIX" && matrixPartialRows(q, answers).length > 0) return false;
    if (!q.isRequired) return true;
    // و«أخرى» المختارةُ بلا نصٍّ ليست إجابةً — `isAnswered` يعرف ذلك.
    return isAnswered(q, answers) || !!(attachments[q.id]?.length);
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";

    setUploadingFiles(prev => ({ ...prev, [questionId]: true }));

    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        // تذكرةٌ يُجيزها الاستبيانُ نفسُه لا الجلسة.
        //
        // This used to POST to /api/upload, which demands a session — so a
        // respondent, who by design has no account, was told «غير مصرح».
        // Worse, the failure was swallowed and the survey was submitted as
        // though the file had gone with it.
        const { ticket, error } = await createSurveyUploadTicket(
          resolvedParams.id,
          file.name,
          file.size
        );
        if (error || !ticket) {
          throw new Error(error || `تعذّر رفع ${file.name}`);
        }

        // والرفعُ من `clientUpload` لا بيدِ الصفحة. وكان هنا `POST` بنموذجٍ
        // مكتوبٍ حرفاً، فبقي وحيداً على Cloudinary بينما تحوّل الموقعُ كلُّه:
        // صفحةٌ تعرف أسماءَ حقولِ مزوّدٍ بعينه لا تتحوّل معه. والآن تقرأ
        // الوحدةُ المشتركةُ وسمَ التذكرة فترفع بما يُناسبه، ومنها تأتي
        // رسالةُ المزوّد كما هي — فلا يعود «حجمٌ كبير» و«نوعٌ غيرُ مدعوم»
        // هَزَّ كتفٍ واحداً.
        const uploaded = await uploadWithTicket(file, ticket);
        uploadedUrls.push(uploaded.url);
      }
      if (uploadedUrls.length > 0) {
        setAttachments(prev => ({ ...prev, [questionId]: [...(prev[questionId] || []), ...uploadedUrls] }));
      }
    } catch (err) {
      console.error("Upload failed", err);
      notify("error", err instanceof Error ? err.message : "فشل رفع الملف. يرجى المحاولة مرة أخرى.");
    } finally {
      setUploadingFiles(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleRemoveAttachment = (questionId: string, url: string) => {
    setAttachments(prev => ({ ...prev, [questionId]: (prev[questionId] || []).filter(u => u !== url) }));
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
          notify("error", "حدث خطأ أثناء إرسال البيانات.");
        }
      } catch (err) {
        console.error(err);
        notify("error", "حدث خطأ في الاتصال.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      hasChangedSection.current = true;
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSectionIndex > 0) {
      hasChangedSection.current = true;
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm animate-in fade-in zoom-in duration-500 sm:p-10 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mb-2 text-section font-semibold text-slate-800 dark:text-slate-100">تم الإرسال بنجاح</h1>
          <p className="text-body leading-6 text-slate-500 dark:text-slate-400">نشكركم على المشاركة في هذا الاستبيان وإتمام المطلوب.</p>
        </div>
      </div>
    );
  }

  return (
    // وحشوُ الصفحة يضيق على الهاتف ويتّسع على الحاسوب: `py-12` على شاشةٍ طولُها
    // ٦٤٠ بكسلاً تُذهب سُدسَها قبل أوّل سؤال.
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <main className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        {!hasAcceptedWelcome ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-in fade-in duration-500 sm:p-10 dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-6 size-32 sm:size-48">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logos/لوجو زاد-01.svg" alt="زاد التنموية" className="h-full w-full object-contain" />
            </div>
            <h1 className="mb-5 text-center text-page font-bold text-primary dark:text-teal-400">{survey.title}</h1>
            <div className="mb-8 text-center text-body leading-7 text-slate-600 dark:text-slate-300">
              {survey.introText.split('\n').map((line, i) => (
                <p key={i} className="mb-2">{line}</p>
              ))}
            </div>
            <button
              onClick={() => setHasAcceptedWelcome(true)}
              className={cx(btn.primary, "h-11 w-full text-body")}
            >
              البدء الآن
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <ProgressBar current={currentSectionIndex + 1} total={survey.sections.length} />

            <div className="mb-6 mt-5 rounded-xl bg-primary p-4 text-white shadow-sm sm:p-6">
              <h2 className="mb-1 text-section font-semibold">{currentSection.title}</h2>
              <p className="text-meta text-white/80">يرجى إتمام جميع الأسئلة المطلوبة</p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {currentSection.questions.map((question, index) => (
                <div
                  key={question.id}
                  ref={index === 0 ? firstQuestionRef : undefined}
                  className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex gap-3 sm:gap-4">
                    <div className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-meta font-semibold text-slate-600 sm:size-8 dark:bg-slate-800 dark:text-slate-300">
                      {index + 1}
                    </div>
                    {/*
                      **و`min-w-0` هي حلُّ «الجدولُ يخرج من إطار المربّع»**:
                      عنصرُ flex عرضُه الأدنى `auto` — أي عرضُ محتواه — فجدولُ
                      التقييم بمعاييره يدفع هذا العمودَ فيتجاوز البطاقة، ولا
                      يعمل `overflow-x-auto` الذي في الجدول نفسِه لأنّه لا يجد
                      حدّاً يُمرِّر داخله. وبها يُقبل الانضغاطُ فيُمرَّر الجدولُ
                      داخل البطاقة أيّاً كان عددُ البنود.
                    */}
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 text-body font-semibold leading-6 text-slate-800 dark:text-slate-100">
                        {question.text}
                        {question.isRequired && <span className="ms-1 text-red-500">*</span>}
                      </h3>

                      <div className="mt-3 sm:mt-4">
                        {question.type === "OPTIONS" ? (
                          <div className="space-y-2">
                            {(question.options || []).map(opt => (
                              <div key={opt.id}>
                                <Choice
                                  name={question.id}
                                  checked={answers[question.id] === opt.id}
                                  onPick={() => setAnswers(prev => ({ ...prev, [question.id]: opt.id }))}
                                >
                                  {opt.text}
                                </Choice>
                                <OtherText
                                  question={question}
                                  option={opt}
                                  shown={answers[question.id] === opt.id}
                                  answers={answers}
                                  setAnswers={setAnswers}
                                />
                              </div>
                            ))}
                            <ExtraTextBox question={question} answers={answers} setAnswers={setAnswers} />
                          </div>
                        ) : question.type === "MULTI_OPTIONS" ? (
                          <div className="space-y-2">
                            {(question.options || []).map(opt => {
                              const currentSelected = selectedOptionIds(question, answers[question.id]);
                              const isChecked = currentSelected.includes(opt.id);
                              const handleToggle = () => {
                                const newSelected = isChecked
                                  ? currentSelected.filter(id => id !== opt.id)
                                  : [...currentSelected, opt.id];
                                setAnswers(prev => ({ ...prev, [question.id]: newSelected.join(",") }));
                              };
                              return (
                                <div key={opt.id}>
                                  <Choice multi name={question.id} checked={isChecked} onPick={handleToggle}>
                                    {opt.text}
                                  </Choice>
                                  <OtherText
                                    question={question}
                                    option={opt}
                                    shown={isChecked}
                                    answers={answers}
                                    setAnswers={setAnswers}
                                  />
                                </div>
                              );
                            })}
                            <ExtraTextBox question={question} answers={answers} setAnswers={setAnswers} />
                          </div>
                        ) : question.type === "CHOICE_MATRIX" ? (
                          <div className="space-y-3">
                            <ChoiceMatrixField
                              label={question.text}
                              hint="ضعْ علامةَ صحٍّ على خيارٍ واحدٍ في كل صف."
                              rows={question.matrix?.rows ?? []}
                              columns={question.matrix?.columns ?? []}
                              value={answers}
                              rowKey={(rowId) => choiceRowKey(question.id, rowId)}
                              onChange={(key, columnId) =>
                                setAnswers(prev => {
                                  const next = { ...prev };
                                  if (columnId === null) delete next[key];
                                  else next[key] = columnId;
                                  return next;
                                })
                              }
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-meta text-slate-500 dark:text-slate-400">
                                تمّ الاختيار في {matrixFilledCount(question, answers)} من {matrixCellCount(question)} صف
                              </span>
                              {question.isRequired && matrixFilledCount(question, answers) > 0 && choiceMatrixMissingRows(question, answers).length > 0 && (
                                <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-caption font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                  بقي: {choiceMatrixMissingRows(question, answers).map(r => r.text).join("، ")}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : question.type === "MATRIX" ? (
                          <div className="space-y-3">
                            <MatrixField
                              label="الخدمة"
                              hint={`ضعْ درجةً من ١ إلى ${question.matrix?.max ?? 5} في كل خليّة — واترك صفَّ الخدمة فارغاً إن لم تستفيدوا منها.`}
                              rows={question.matrix?.rows ?? []}
                              columns={question.matrix?.columns ?? []}
                              max={question.matrix?.max ?? 5}
                              labels={question.matrix?.labels}
                              value={answers}
                              cellKey={(rowId, columnId) => matrixCellKey(question.id, rowId, columnId)}
                              onChange={(key, score) =>
                                setAnswers(prev => {
                                  const next = { ...prev };
                                  if (score === null) delete next[key];
                                  else next[key] = score;
                                  return next;
                                })
                              }
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-meta text-slate-500 dark:text-slate-400">
                                المُقيَّم: {matrixFilledCount(question, answers)} من {matrixCellCount(question)} خليّة
                              </span>
                              {matrixPartialRows(question, answers).length > 0 && (
                                <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-caption font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                  أكملوا تقييمَ: {matrixPartialRows(question, answers).map(r => r.text).join("، ")} — إمّا كلُّ المعايير أو لا شيء.
                                </span>
                              )}
                            </div>
                          </div>
                        ) : question.type === "YES_NO" ? (
                          <div>
                            <div className="flex gap-2">
                              <label className={cx(
                                  "flex-1 cursor-pointer rounded-md border py-2.5 text-center text-body font-medium transition-colors",
                                  answers[question.id] === "yes"
                                    ? "border-primary bg-primary/[0.06] text-primary dark:border-teal-500 dark:bg-teal-500/10 dark:text-teal-300"
                                    : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                                )}>
                                <input type="radio" name={question.id} value="yes" className="hidden" onChange={() => setAnswers(prev => ({ ...prev, [question.id]: 'yes' }))} />
                                <span>نعم</span>
                              </label>
                              <label className={cx(
                                  "flex-1 cursor-pointer rounded-md border py-2.5 text-center text-body font-medium transition-colors",
                                  answers[question.id] === "no"
                                    ? "border-primary bg-primary/[0.06] text-primary dark:border-teal-500 dark:bg-teal-500/10 dark:text-teal-300"
                                    : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                                )}>
                                <input type="radio" name={question.id} value="no" className="hidden" onChange={() => setAnswers(prev => ({ ...prev, [question.id]: 'no' }))} />
                                <span>لا</span>
                              </label>
                            </div>

                            {answers[question.id] === (question.followUpOn ?? 'yes') && question.followUpQuestions && question.followUpQuestions.length > 0 && (
                              <div className="mt-3 space-y-3 border-e-2 border-primary/20 pe-3">
                                {question.followUpQuestions.map(followUp => (
                                  <div key={followUp.id}>
                                    <label className="mb-1.5 block text-meta font-medium text-slate-600 dark:text-slate-300">
                                      {followUp.text}
                                      {followUp.isRequired && <span className="ms-1 text-red-500">*</span>}
                                    </label>
                                    <textarea
                                      value={answers[followUp.id] || ""}
                                      onChange={(e) => setAnswers(prev => ({ ...prev, [followUp.id]: e.target.value }))}
                                      placeholder="اكتب إجابتك هنا..."
                                      rows={2}
                                      className={cx(field, "h-auto resize-y py-2 leading-6")}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
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
                              // ومحدِّدُ التاريخ مكتبةٌ خارجيّةٌ تأخذ صفَّ أصنافٍ نصّاً، فيُمرَّر إليها
                              // وسمُ الحقل نفسُه الذي في العدة.
                              inputClass={cx(field, "h-10")}
                              placeholder="اختر التاريخ الهجري..."
                            />
                          </div>
                        ) : question.type === "FILE" ? (
                          <div className="w-full space-y-3">
                            {(attachments[question.id] || []).length > 0 && (
                              <div className="space-y-2">
                                {(attachments[question.id] || []).map((url, i) => (
                                  <div key={url} className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    <Paperclip className="w-4 h-4 shrink-0" />
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-meta font-medium hover:underline">
                                      مرفق {i + 1}
                                    </a>
                                    <button type="button" onClick={() => handleRemoveAttachment(question.id, url)} className="text-emerald-600 hover:text-red-500 transition-colors shrink-0">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-5 text-slate-500 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary sm:p-8 dark:border-slate-700">
                              {uploadingFiles[question.id] ? (
                                <div className="flex flex-col items-center gap-2 text-meta font-medium text-primary">
                                  <Spinner size={32} />
                                  <span>جاري رفع الملفات...</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <UploadCloud className="size-8 text-slate-400" />
                                  <span className="text-body font-medium text-slate-700 dark:text-slate-200">
                                    {(attachments[question.id] || []).length > 0 ? "انقر هنا لإضافة مرفقات أخرى" : "انقر هنا لرفع الملف المطلوب"}
                                  </span>
                                  <span className="text-center text-caption text-slate-400">يدعم الصور والمستندات (PDF و Word) — ويمكن اختيار أكثر من ملف</span>
                                  <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, question.id)} />
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
                            className={cx(field, "h-auto resize-y py-2 leading-6")}
                          />
                        )}
                      </div>

                      {question.allowAttachment && question.type !== "FILE" && (
                        question.type !== "YES_NO" || 
                        !question.requireAttachmentIfYes || 
                        answers[question.id] === "yes"
                      ) && (
                        <div className="mt-4 space-y-2">
                          {(attachments[question.id] || []).length > 0 && (
                            <div className="space-y-2">
                              {(attachments[question.id] || []).map((url, i) => (
                                <div key={url} className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                  <Paperclip className="w-4 h-4 shrink-0" />
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-meta font-medium hover:underline">
                                    مرفق {i + 1}
                                  </a>
                                  <button type="button" onClick={() => handleRemoveAttachment(question.id, url)} className="text-emerald-600 hover:text-red-500 transition-colors shrink-0">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <label className="flex cursor-pointer flex-wrap items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-4 text-meta text-slate-500 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary dark:border-slate-700">
                            {uploadingFiles[question.id] ? (
                              <div className="flex items-center gap-2 text-meta font-medium text-primary">
                                <Spinner size={20} /> جاري الرفع...
                              </div>
                            ) : (
                              <>
                                <UploadCloud className="w-5 h-5" />
                                {(attachments[question.id] || []).length > 0 ? "إرفاق ملف آخر" : "إرفاق ملف (صورة، PDF، Word)"}
                                <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, question.id)} />
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

            {/*
              التنقّلُ بين المحاور: على الهاتف زرّان بعرض الشاشة و«التالي» أعلاهما
              (`flex-col-reverse`) — فهو المقصودُ في تسعٍ من عشر، ويكون تحت
              الإبهام. وعلى الحاسوب صفٌّ: السابقُ يميناً والتاليُ يساراً.
            */}
            <div className="mt-6 flex flex-col-reverse gap-2 pb-10 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={handlePrev}
                disabled={currentSectionIndex === 0}
                className={cx(
                  btn.secondary,
                  "h-11 w-full text-body sm:w-auto",
                  currentSectionIndex === 0 && "hidden sm:inline-flex sm:opacity-0 sm:pointer-events-none"
                )}
              >
                المحور السابق
              </button>

              <button
                onClick={handleNext}
                disabled={!allCurrentRequiredAnswered || isSubmitting || Object.values(uploadingFiles).some(Boolean)}
                className={cx(btn.primary, "h-11 w-full text-body sm:w-auto sm:px-6")}
              >
                {isSubmitting && <Spinner size={18} tone="onPrimary" />}
                {isLastSection ? "إنهاء وإرسال" : "المحور التالي"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
