"use client";

import { Fragment } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, MONO, OptionRow, btn, cx, field } from "@/components/console/ui";
import { StarRating } from "@/components/console/StarRating";
import { TableShell, Th, tbodyClass, tdClass, theadRowClass } from "@/components/console/layout";
import Select from "@/components/console/Select";
import {
  CAUSES,
  CAUSE_NONE,
  CAUSE_OTHER,
  COMMITMENT_GROUPS,
  OPEN_QUESTIONS,
  OUTLOOK_OPTIONS,
  PACE_OPTIONS,
  RATING_LABELS,
  READINESS_STATEMENTS,
  ROLES,
  TASK_STATUSES,
  TOP_CAUSES_MAX,
  type RatingGroup,
  type RatingStatement,
} from "@/lib/planSurvey";

export type StepView = { id: string; order: number; phase: string | null; title: string; plannedEnd: string | null };
export type InitiativeView = { id: string; number: number; name: string; steps: StepView[] };

export type BlockerDraft = {
  subject: string;
  description: string;
  cause: string;
  solution: string;
  proposedEnd: string;
};

export type Form = {
  department: string;
  role: string;
  initiativeIds: string[];
  extraInitiatives: string[];
  ratings: Record<string, number>;
  stepIds: string[];
  taskRows: Record<string, { status: string; progress: string; expectedEnd: string }>;
  pace: string;
  causes: string[];
  causeOther: string;
  topCauses: string[];
  blockers: BlockerDraft[];
  outlook: string;
  achievements: string;
  neededAction: string;
  suggestions: string;
};

type Patch = (next: Partial<Form>) => void;

const legend = "mb-2 block text-body font-medium text-slate-700 dark:text-slate-300";

/** سؤالُ اختيارٍ واحدٍ من قائمة — صفوفُ راديو بهوية العُدّة. */
function ChoiceList({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <fieldset>
      <legend className={legend}>{label}</legend>
      <div className="space-y-1">
        {options.map((option) => {
          const on = value === option;
          return (
            <label
              key={option}
              className={cx(
                "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition-colors",
                "focus-within:ring-2 focus-within:ring-primary/40",
                on
                  ? "border-primary/40 bg-primary/[0.06] dark:border-teal-400/40 dark:bg-teal-400/[0.08]"
                  : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              )}
            >
              <input
                type="radio"
                checked={on}
                onChange={() => onChange(option)}
                className="mt-1 size-4 shrink-0 accent-[rgb(15_118_110)]"
              />
              <span className={cx("text-body leading-6", on ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-300")}>
                {option}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** صفوفُ تقييمٍ بالنجوم — القسمان الثالث والسادس شكلٌ واحد. */
function RatingRows({ statements, ratings, patch }: { statements: RatingStatement[]; ratings: Form["ratings"]; patch: Patch }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {statements.map((s) => (
        <div key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2 text-body leading-6 text-slate-700 dark:text-slate-200">
            <span className={cx(MONO, "shrink-0 text-slate-400")}>{s.id}.</span>
            <span>{s.text}</span>
          </p>
          <div className="shrink-0 ps-6 sm:ps-0">
            <StarRating
              label={s.text}
              labels={RATING_LABELS}
              value={ratings[String(s.id)] ?? null}
              onChange={(value) => patch({ ratings: { ...ratings, [String(s.id)]: value } })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── القسم الأول ─────────────────────────────────────────────────────────────

export function CharitySection({ charityName, planLabel, intro }: { charityName: string; planLabel: string | null; intro: readonly string[] }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-5 dark:border-teal-400/20 dark:bg-teal-400/[0.06]">
        <p className="text-meta text-slate-500 dark:text-slate-400">اسم الجمعية</p>
        <p className="mt-1 text-section font-semibold text-slate-900 dark:text-slate-100">{charityName}</p>
        {planLabel && <p className="mt-1 text-body text-slate-500 dark:text-slate-400">الخطة: {planLabel}</p>}
      </div>
      <div className="space-y-3">
        {intro.map((line) => (
          <p key={line} className="text-body leading-7 text-slate-600 dark:text-slate-300">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

// ── القسم الثاني ────────────────────────────────────────────────────────────

export function RespondentSection({
  form,
  patch,
  departments,
  initiatives,
}: {
  form: Form;
  patch: Patch;
  departments: string[];
  initiatives: InitiativeView[];
}) {
  const setExtra = (index: number, value: string) => {
    const next = [...form.extraInitiatives];
    next[index] = value;
    patch({ extraInitiatives: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <span className={legend}>الإدارة التي تنتمي إليها</span>
        {departments.length > 0 ? (
          <Select
            value={form.department}
            onSelect={(v) => patch({ department: v })}
            placeholder="اختر الإدارة…"
            options={departments.map((d) => ({ value: d, label: d }))}
            className="w-full [&>button]:w-full [&>button]:justify-between"
          />
        ) : (
          <input
            value={form.department}
            onChange={(e) => patch({ department: e.target.value })}
            placeholder="اكتب اسم الإدارة"
            className={field}
          />
        )}
        {departments.length > 0 && (
          <p className="mt-1.5 text-meta text-slate-500">الإدارات كما وردت في الخطة التشغيلية.</p>
        )}
      </div>

      <ChoiceList label="دورك في الخطة التشغيلية" options={ROLES} value={form.role} onChange={(v) => patch({ role: v })} />

      <fieldset>
        <legend className={legend}>المشاريع أو المبادرات التي تشارك في تنفيذها</legend>
        {initiatives.length === 0 ? (
          <p className="text-body text-slate-500">لا مبادراتٍ في الخطة بعد — اكتب مبادراتك أدناه.</p>
        ) : (
          <div className="max-h-[320px] space-y-0.5 overflow-y-auto rounded-md border border-slate-200 p-1 dark:border-slate-800">
            {initiatives.map((i) => (
              <OptionRow
                key={i.id}
                label={`م${i.number} — ${i.name}`}
                note={i.steps.length ? `${i.steps.length} خطوة` : "بلا خطوات"}
                checked={form.initiativeIds.includes(i.id)}
                onToggle={() =>
                  patch({
                    initiativeIds: form.initiativeIds.includes(i.id)
                      ? form.initiativeIds.filter((x) => x !== i.id)
                      : [...form.initiativeIds, i.id],
                  })
                }
              />
            ))}
          </div>
        )}
      </fieldset>

      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-body font-medium text-slate-700 dark:text-slate-300">مبادرةٌ من خارج الخطة</p>
            <p className="mt-0.5 text-meta leading-5 text-slate-500">
              تُسجَّل باسمها وتُوسَم «من خارج الخطة»، فلا تُحتسب على الخطة ولا تَضيع.
            </p>
          </div>
          <button
            type="button"
            onClick={() => patch({ extraInitiatives: [...form.extraInitiatives, ""] })}
            className={btn.secondary}
          >
            <Plus className="size-3.5" /> إضافة
          </button>
        </div>
        {form.extraInitiatives.length > 0 && (
          <div className="mt-3 space-y-2">
            {form.extraInitiatives.map((name, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge tone="gold">خارج الخطة</Badge>
                <input
                  value={name}
                  onChange={(e) => setExtra(index, e.target.value)}
                  placeholder="اسم المبادرة"
                  className={cx(field, "flex-1")}
                />
                <button
                  type="button"
                  onClick={() => patch({ extraInitiatives: form.extraInitiatives.filter((_, i) => i !== index) })}
                  aria-label="حذف"
                  className={btn.iconDanger}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── القسم الثالث ────────────────────────────────────────────────────────────

export function CommitmentSection({ form, patch }: { form: Form; patch: Patch }) {
  return (
    <div className="space-y-6">
      <p className="text-body leading-6 text-slate-500 dark:text-slate-400">
        اختر عددَ النجوم الذي يعبّر عن رأيك: خمسٌ «موافق بشدة» وواحدةٌ «غير موافق بشدة».
      </p>
      {COMMITMENT_GROUPS.map((group: RatingGroup) => (
        <section key={group.title}>
          <h3 className="mb-1 text-body font-semibold text-slate-900 dark:text-slate-100">{group.title}</h3>
          <RatingRows statements={group.statements} ratings={form.ratings} patch={patch} />
        </section>
      ))}
    </div>
  );
}

// ── القسم الرابع ────────────────────────────────────────────────────────────

export function TasksSection({
  form,
  patch,
  chosen,
}: {
  form: Form;
  patch: Patch;
  chosen: InitiativeView[];
}) {
  const stepById = new Map(chosen.flatMap((i) => i.steps.map((s) => [s.id, { step: s, initiative: i }] as const)));
  const rows = form.stepIds.map((id) => stepById.get(id)).filter((x): x is NonNullable<typeof x> => !!x);

  const toggle = (stepId: string) => {
    const on = form.stepIds.includes(stepId);
    const stepIds = on ? form.stepIds.filter((x) => x !== stepId) : [...form.stepIds, stepId];
    const taskRows = { ...form.taskRows };
    if (on) delete taskRows[stepId];
    else taskRows[stepId] = { status: "", progress: "", expectedEnd: "" };
    patch({ stepIds, taskRows });
  };

  const setCell = (stepId: string, key: "status" | "progress" | "expectedEnd", value: string) => {
    patch({ taskRows: { ...form.taskRows, [stepId]: { ...form.taskRows[stepId], [key]: value } } });
  };

  return (
    <div className="space-y-6">
      <p className="text-body leading-6 text-slate-500 dark:text-slate-400">
        اختر من خطوات مبادراتك ما كُلِّفتَ به ممّا كان مخططاً أن يبدأ أو ينتهي حتى تاريخه، ثم عبّئ حالته الفعلية.
      </p>

      {chosen.length === 0 ? (
        <p className="text-body text-slate-500">لم تختر مبادرةً من الخطة، فلا خطواتٍ تُعرض.</p>
      ) : (
        <div className="space-y-4">
          {chosen.map((i) => (
            <section key={i.id} className="rounded-xl border border-slate-200 dark:border-slate-800">
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                <h3 className="text-body font-semibold text-slate-900 dark:text-slate-100">
                  م{i.number} — {i.name}
                </h3>
                <span className={cx(MONO, "shrink-0 text-meta text-slate-400")}>
                  {i.steps.filter((s) => form.stepIds.includes(s.id)).length}/{i.steps.length}
                </span>
              </header>
              {i.steps.length === 0 ? (
                <p className="px-4 py-3 text-body text-slate-500">لا خطواتٍ لهذه المبادرة في الخطة.</p>
              ) : (
                <div className="max-h-[300px] space-y-0.5 overflow-y-auto p-1">
                  {i.steps.map((s) => (
                    <OptionRow
                      key={s.id}
                      label={`${s.order}. ${s.title}`}
                      note={[s.phase, s.plannedEnd ? `المخطَّط: ${s.plannedEnd}` : null].filter(Boolean).join(" · ") || undefined}
                      checked={form.stepIds.includes(s.id)}
                      onToggle={() => toggle(s.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-body font-semibold text-slate-900 dark:text-slate-100">
            المهام المكلَّف بها — {rows.length}
          </h3>
          <p className="text-meta text-slate-500">
            المبادرةُ والمهمةُ والموعدُ المخطَّط مأخوذةٌ من الخطة، وما عليك إلا الحالةَ والنسبةَ والموعدَ المتوقَّع.
          </p>
          <TableShell>
            <thead>
              <tr className={theadRowClass}>
                <Th className="w-[70px]">م</Th>
                <Th>المبادرة</Th>
                <Th>المهمة</Th>
                <Th className="w-[120px]">المخطَّط</Th>
                <Th className="w-[160px]">الحالة الفعلية</Th>
                <Th className="w-[110px]">نسبة الإنجاز</Th>
                <Th className="w-[150px]">الإنجاز المتوقَّع</Th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {rows.map(({ step, initiative }, index) => (
                <tr key={step.id}>
                  <td className={cx(tdClass, MONO, "text-slate-400")}>{index + 1}</td>
                  <td className={cx(tdClass, "text-slate-700 dark:text-slate-200")}>م{initiative.number}</td>
                  <td className={cx(tdClass, "min-w-[220px] text-slate-700 dark:text-slate-200")}>{step.title}</td>
                  <td className={cx(tdClass, MONO, "text-slate-500")}>{step.plannedEnd ?? "—"}</td>
                  <td className={tdClass}>
                    <Select
                      value={form.taskRows[step.id]?.status ?? ""}
                      onSelect={(v) => setCell(step.id, "status", v)}
                      placeholder="اختر…"
                      options={TASK_STATUSES.map((s) => ({ value: s, label: s }))}
                      className="w-full [&>button]:w-full [&>button]:justify-between"
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      value={form.taskRows[step.id]?.progress ?? ""}
                      onChange={(e) => setCell(step.id, "progress", e.target.value)}
                      inputMode="numeric"
                      placeholder="٠–١٠٠"
                      className={cx(field, "w-[90px]")}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="date"
                      value={form.taskRows[step.id]?.expectedEnd ?? ""}
                      onChange={(e) => setCell(step.id, "expectedEnd", e.target.value)}
                      className={cx(field, "w-[140px]")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </section>
      )}

      <ChoiceList
        label="برأيك كيف تصف سير تنفيذ المهام المسندة إليك مقارنةً بالخطة؟"
        options={PACE_OPTIONS}
        value={form.pace}
        onChange={(v) => patch({ pace: v })}
      />
    </div>
  );
}

// ── القسم الخامس ────────────────────────────────────────────────────────────

export function BlockersSection({
  form,
  patch,
  subjects,
}: {
  form: Form;
  patch: Patch;
  /** المبادراتُ والمهامُ التي اختارها — منها يُختار موضوعُ التعثر. */
  subjects: string[];
}) {
  const options = [...CAUSES, CAUSE_OTHER];
  const picked = form.causes.filter((c) => c !== CAUSE_NONE);

  const toggleCause = (cause: string) => {
    // «لا توجد متعثرات» تُلغي ما سواها، وما سواها يُلغيها: لا يُقال «لا متعثرات»
    // ثم تُذكر أسبابُها.
    if (cause === CAUSE_NONE) {
      const on = form.causes.includes(CAUSE_NONE);
      patch({ causes: on ? [] : [CAUSE_NONE], topCauses: [], causeOther: "" });
      return;
    }
    const on = form.causes.includes(cause);
    const causes = (on ? form.causes.filter((c) => c !== cause) : [...form.causes, cause]).filter((c) => c !== CAUSE_NONE);
    patch({ causes, topCauses: form.topCauses.filter((c) => causes.includes(c)) });
  };

  const setTop = (index: number, value: string) => {
    const next = [...form.topCauses];
    next[index] = value;
    // لا يُكرَّر سببٌ في المرتبتين.
    patch({ topCauses: next.filter((c, i) => c && next.indexOf(c) === i) });
  };

  const setBlocker = (index: number, key: keyof BlockerDraft, value: string) => {
    const next = form.blockers.map((b, i) => (i === index ? { ...b, [key]: value } : b));
    patch({ blockers: next });
  };

  return (
    <div className="space-y-7">
      <fieldset>
        <legend className={legend}>١. ما الأسباب التي أدّت إلى تأخر أو تعثر المهام المسندة إليك؟</legend>
        <p className="mb-2 text-meta text-slate-500">يمكن اختيار أكثر من سبب.</p>
        <div className="space-y-0.5 rounded-md border border-slate-200 p-1 dark:border-slate-800">
          {options.map((cause) => (
            <OptionRow
              key={cause}
              label={cause}
              checked={form.causes.includes(cause)}
              onToggle={() => toggleCause(cause)}
            />
          ))}
        </div>
        {form.causes.includes(CAUSE_OTHER) && (
          <input
            value={form.causeOther}
            onChange={(e) => patch({ causeOther: e.target.value })}
            placeholder="اذكر السبب الآخر"
            className={cx(field, "mt-2")}
          />
        )}
      </fieldset>

      <fieldset>
        <legend className={legend}>٢. رتّب أبرز ثلاثة أسباب حسب شدّة تأثيرها</legend>
        {picked.length === 0 ? (
          <p className="text-body text-slate-500">اختر أسباباً أعلاه لتظهر هنا.</p>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: Math.min(TOP_CAUSES_MAX, picked.length) }, (_, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className={cx(MONO, "w-5 shrink-0 text-slate-400")}>{index + 1}.</span>
                <Select
                  value={form.topCauses[index] ?? ""}
                  onSelect={(v) => setTop(index, v)}
                  placeholder="اختر من أسبابك…"
                  options={picked
                    .filter((c) => c === form.topCauses[index] || !form.topCauses.includes(c))
                    .map((c) => ({ value: c, label: c }))}
                  className="flex-1 [&>button]:w-full [&>button]:justify-between"
                />
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset>
        <div className="flex items-start justify-between gap-3">
          <legend className={legend}>٣. تفاصيل المهام المتعثرة</legend>
          <button
            type="button"
            onClick={() =>
              patch({
                blockers: [...form.blockers, { subject: "", description: "", cause: "", solution: "", proposedEnd: "" }],
              })
            }
            className={btn.secondary}
          >
            <Plus className="size-3.5" /> إضافة صفّ
          </button>
        </div>
        {form.blockers.length === 0 ? (
          <p className="text-body text-slate-500">لا متعثرَ مُسجَّل. أضف صفّاً إن كان لديك تعثُّر.</p>
        ) : (
          <div className="space-y-3">
            {form.blockers.map((b, index) => (
              <div key={index} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <span className="mb-1.5 block text-meta text-slate-500">المشروع أو المهمة</span>
                    {subjects.length > 0 ? (
                      <Select
                        value={b.subject}
                        onSelect={(v) => setBlocker(index, "subject", v)}
                        placeholder="اختر ممّا اخترته سابقاً…"
                        options={subjects.map((s) => ({ value: s, label: s }))}
                        className="w-full [&>button]:w-full [&>button]:justify-between"
                      />
                    ) : (
                      <input
                        value={b.subject}
                        onChange={(e) => setBlocker(index, "subject", e.target.value)}
                        className={field}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => patch({ blockers: form.blockers.filter((_, i) => i !== index) })}
                    aria-label="حذف الصفّ"
                    className={cx(btn.iconDanger, "mt-6")}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {(
                  [
                    ["description", "وصف التعثر"],
                    ["cause", "سبب التعثر"],
                    ["solution", "الحلّ وفق رأيك"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-meta text-slate-500">{label}</span>
                    <textarea
                      value={b[key]}
                      onChange={(e) => setBlocker(index, key, e.target.value)}
                      rows={2}
                      className={cx(field, "h-auto py-2 leading-6")}
                    />
                  </label>
                ))}

                <label className="block">
                  <span className="mb-1.5 block text-meta text-slate-500">الموعد المقترح للإنجاز</span>
                  <input
                    type="date"
                    value={b.proposedEnd}
                    onChange={(e) => setBlocker(index, "proposedEnd", e.target.value)}
                    className={cx(field, "w-[170px]")}
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </fieldset>
    </div>
  );
}

// ── القسم السادس ────────────────────────────────────────────────────────────

export function ReadinessSection({ form, patch }: { form: Form; patch: Patch }) {
  return (
    <div className="space-y-6">
      <p className="text-body leading-6 text-slate-500 dark:text-slate-400">
        أجب عن العبارات التالية بالنسبة لمهامك المتبقية في الخطة حتى نهاية ٢٠٢٦.
      </p>
      <RatingRows statements={READINESS_STATEMENTS} ratings={form.ratings} patch={patch} />
      <ChoiceList
        label="هل تتوقّع إنجاز مهامك في الخطة كاملةً بنهاية عام ٢٠٢٦؟"
        options={OUTLOOK_OPTIONS}
        value={form.outlook}
        onChange={(v) => patch({ outlook: v })}
      />
    </div>
  );
}

// ── القسم السابع ────────────────────────────────────────────────────────────

export function OpenSection({ form, patch }: { form: Form; patch: Patch }) {
  return (
    <div className="space-y-6">
      {OPEN_QUESTIONS.map((q, index) => (
        <Fragment key={q.id}>
          <label className="block">
            <span className={legend}>
              {index + 1}. {q.text}
            </span>
            <textarea
              value={form[q.id as "achievements" | "neededAction" | "suggestions"]}
              onChange={(e) => patch({ [q.id]: e.target.value } as Partial<Form>)}
              rows={4}
              className={cx(field, "h-auto py-2 leading-7")}
            />
          </label>
        </Fragment>
      ))}
    </div>
  );
}
