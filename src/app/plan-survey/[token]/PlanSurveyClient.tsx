"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Send } from "lucide-react";
import { Spinner, btn, card, cx } from "@/components/console/ui";
import { StepTrail } from "@/components/console/StepTrail";
import { EmptyState } from "@/components/console/layout";
import { notify } from "@/components/console/toastBus";
import {
  COMMITMENT_IDS,
  READINESS_IDS,
  SECTIONS,
  SURVEY_INTRO,
  SURVEY_TITLE,
  CAUSE_NONE,
  CAUSE_OTHER,
  TOP_CAUSES_MAX,
  parseProgress,
  ratingsComplete,
} from "@/lib/planSurvey";
import { submitPlanSurvey } from "@/app/actions/planSurvey";
import {
  BlockersSection,
  CharitySection,
  CommitmentSection,
  OpenSection,
  ReadinessSection,
  RespondentSection,
  TasksSection,
  type Form,
  type InitiativeView,
} from "./PlanSurveySections";

const EMPTY: Form = {
  department: "",
  role: "",
  initiativeIds: [],
  extraInitiatives: [],
  ratings: {},
  stepIds: [],
  taskRows: {},
  pace: "",
  causes: [],
  causeOther: "",
  topCauses: [],
  blockers: [],
  outlook: "",
  achievements: "",
  neededAction: "",
  suggestions: "",
};

/**
 * الاستبانةُ قسماً قسماً.
 *
 * **ولا انتقالَ إلا بتمام القسم**: القسمُ الرابع يُبنى على مبادراتِ الثاني،
 * والخامسُ على أسبابِ نفسه — فالقفزُ بقسمٍ ناقصٍ يُخرج أسئلةً بلا مادّة. والشرطُ
 * يُقال في موضعه لا يُكتفى بتعطيل الزرّ: زرٌّ معطَّلٌ بلا سببٍ يُقرأ لغزٌ.
 *
 * ويُصعَد إلى رأس الصفحة عند كل انتقال: الأقسامُ تطول، ومن أنهى أسفلَ قسمٍ
 * ووجد نفسه في أسفل الذي بعده حسبَ أن شيئاً لم يتغيّر.
 */
export default function PlanSurveyClient({
  token,
  charityName,
  planLabel,
  departments,
  initiatives,
}: {
  token: string;
  charityName: string;
  planLabel: string | null;
  departments: string[];
  initiatives: InitiativeView[];
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const patch = (next: Partial<Form>) => setForm((prev) => ({ ...prev, ...next }));

  // الصعودُ إلى الأعلى بعد تغيّر القسم — لا قبله، وإلا صعدت الصفحةُ ثم رُسمت.
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step, done]);

  const chosen = useMemo(
    () => initiatives.filter((i) => form.initiativeIds.includes(i.id)),
    [initiatives, form.initiativeIds]
  );

  /** مواضيعُ التعثر: مبادراتُه ومهامُه التي اختارها — لا قائمةُ الخطة كلِّها. */
  const subjects = useMemo(() => {
    const names = chosen.map((i) => `م${i.number} — ${i.name}`);
    const extras = form.extraInitiatives.filter(Boolean).map((n) => `${n} (خارج الخطة)`);
    const tasks = chosen.flatMap((i) =>
      i.steps.filter((s) => form.stepIds.includes(s.id)).map((s) => `م${i.number} · ${s.title}`)
    );
    return [...names, ...extras, ...tasks];
  }, [chosen, form.extraInitiatives, form.stepIds]);

  /** ما يمنع الانتقال من القسم الحالي — نصٌّ أو `null`. */
  const blocker = useMemo((): string | null => {
    if (step === 1) {
      if (!form.department.trim()) return "اختر الإدارة التي تنتمي إليها.";
      if (!form.role) return "اختر دورك في الخطة التشغيلية.";
      if (form.initiativeIds.length === 0 && form.extraInitiatives.some((n) => n.trim()) === false) {
        return "اختر مبادرةً واحدةً على الأقل، أو أضف مبادرةً من خارج الخطة.";
      }
      return null;
    }
    if (step === 2 && !ratingsComplete(form.ratings, COMMITMENT_IDS)) {
      return "قيّم العبارات الخمسَ عشرةَ كلَّها.";
    }
    if (step === 3) {
      const missing = form.stepIds.filter((id) => !form.taskRows[id]?.status);
      if (missing.length > 0) return `اختر الحالة الفعلية لكل مهمة اخترتها (${missing.length} بلا حالة).`;
      const badProgress = form.stepIds.filter((id) => {
        const raw = form.taskRows[id]?.progress ?? "";
        return raw.trim() !== "" && parseProgress(raw) === null;
      });
      if (badProgress.length > 0) return "نسبة الإنجاز رقمٌ بين ٠ و١٠٠.";
      if (!form.pace) return "اختر وصفَ سير التنفيذ.";
      return null;
    }
    if (step === 4) {
      if (form.causes.length === 0) return "اختر سبباً، أو اختر «لا توجد متعثرات».";
      if (form.causes.includes(CAUSE_OTHER) && !form.causeOther.trim()) return "اذكر السبب الآخر.";
      const real = form.causes.filter((c) => c !== CAUSE_NONE);
      const needed = Math.min(TOP_CAUSES_MAX, real.length);
      if (real.length > 0 && form.topCauses.filter(Boolean).length < needed) {
        return `رتّب أبرز ${needed} ${needed === 1 ? "سبب" : "أسباب"} من التي اخترتها.`;
      }
      return null;
    }
    if (step === 5) {
      if (!ratingsComplete(form.ratings, READINESS_IDS)) return "قيّم العبارات الستَّ كلَّها.";
      if (!form.outlook) return "اختر توقّعك لإنجاز المهام.";
      return null;
    }
    return null;
  }, [step, form]);

  const submit = () => {
    setBusy(true);
    void (async () => {
      const res = await submitPlanSurvey({
        token,
        department: form.department.trim(),
        role: form.role,
        initiativeIds: form.initiativeIds,
        extraInitiatives: form.extraInitiatives.map((n) => n.trim()).filter(Boolean),
        ratings: form.ratings,
        tasks: form.stepIds.map((id) => {
          const found = chosen
            .flatMap((i) => i.steps.map((s) => ({ s, i })))
            .find((x) => x.s.id === id);
          const row = form.taskRows[id];
          return {
            stepId: id,
            initiativeName: found ? `م${found.i.number} — ${found.i.name}` : "",
            taskTitle: found?.s.title ?? "",
            plannedEnd: found?.s.plannedEnd ?? null,
            status: row?.status ?? "",
            progress: parseProgress(row?.progress ?? ""),
            expectedEnd: row?.expectedEnd || null,
          };
        }),
        pace: form.pace,
        causes: form.causes,
        causeOther: form.causeOther.trim() || null,
        topCauses: form.topCauses.filter(Boolean),
        blockers: form.blockers
          .filter((b) => b.subject.trim() || b.description.trim())
          .map((b) => ({
            subject: b.subject.trim(),
            description: b.description.trim(),
            cause: b.cause.trim(),
            solution: b.solution.trim(),
            proposedEnd: b.proposedEnd || null,
          })),
        outlook: form.outlook,
        achievements: form.achievements.trim() || null,
        neededAction: form.neededAction.trim() || null,
        suggestions: form.suggestions.trim() || null,
      });
      setBusy(false);
      if (!res.ok) {
        notify("error", res.error);
        return;
      }
      setDone(true);
    })();
  };

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4" dir="rtl">
        <div ref={topRef} className={cx(card.static, "w-full p-2")}>
          <EmptyState
            icon={<CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />}
            title="وصلت إجابتك — شكراً لك"
            description="تُستخدم الإجابات لمتابعة الخطة وتحسينها. يمكنك إغلاق الصفحة."
          />
        </div>
      </main>
    );
  }

  const isLast = step === SECTIONS.length - 1;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10" dir="rtl">
      <div ref={topRef} className="scroll-mt-6" />

      <header className="mb-6 space-y-1.5">
        <h1 className="flex items-center gap-2.5 text-page font-semibold leading-tight tracking-tight">
          <ClipboardList aria-hidden className="size-6 shrink-0 text-primary dark:text-teal-300" />
          <span className="min-w-0">{SURVEY_TITLE}</span>
        </h1>
        <p className="text-body text-slate-500 dark:text-slate-400">
          {charityName}
          {planLabel ? ` · ${planLabel}` : ""}
        </p>
      </header>

      <div className="mb-5">
        <StepTrail steps={[...SECTIONS]} current={step} onJump={(i) => setStep(i)} />
      </div>

      <section className={cx(card.static, "p-5 sm:p-6")} aria-label={SECTIONS[step]}>
        <h2 className="mb-4 text-section font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          القسم {step + 1}: {SECTIONS[step]}
        </h2>

        {step === 0 && <CharitySection charityName={charityName} planLabel={planLabel} intro={SURVEY_INTRO} />}
        {step === 1 && (
          <RespondentSection form={form} patch={patch} departments={departments} initiatives={initiatives} />
        )}
        {step === 2 && <CommitmentSection form={form} patch={patch} />}
        {step === 3 && <TasksSection form={form} patch={patch} chosen={chosen} />}
        {step === 4 && <BlockersSection form={form} patch={patch} subjects={subjects} />}
        {step === 5 && <ReadinessSection form={form} patch={patch} />}
        {step === 6 && <OpenSection form={form} patch={patch} />}
      </section>

      {blocker && (
        <p role="status" className="mt-3 text-body text-amber-700 dark:text-amber-300">
          {blocker}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || busy}
          className={btn.secondary}
        >
          <ArrowRight className="size-4" /> السابق
        </button>

        {isLast ? (
          <button type="button" onClick={submit} disabled={busy || !!blocker} className={btn.primary}>
            {busy ? <Spinner /> : <Send className="size-4" />}
            {busy ? "جارٍ الإرسال…" : "إرسال الاستبانة"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!!blocker || busy}
            className={btn.primary}
          >
            التالي <ArrowLeft className="size-4" />
          </button>
        )}
      </div>
    </main>
  );
}
