"use client";

import { useState, useTransition } from "react";
import { ListChecks } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import Select from "@/components/console/Select";
import { FooterStatus } from "@/components/console/overlays";
import { Spinner, btn, cx, field } from "@/components/console/ui";
import { PHASES, saveStep } from "@/app/actions/strategyOperational";
import type { PlanMonth } from "@/lib/initiativeProgress";
import type { StepRow } from "./InitiativePlanClient";

/**
 * نافذة خطوة التنفيذ.
 *
 * وأرقام الأسابيع نسبيّةٌ إلى بداية الخطة، فيُذكر مداها في التلميح: «١ إلى ٢٢»
 * لا رقمٌ مطلقٌ لا مرجع له. والفعل يرفض ما خرج عن المدى.
 */
export function StepDialog({
  initiativeId,
  weekCount,
  months,
  step,
  onClose,
}: {
  initiativeId: string;
  weekCount: number;
  months: PlanMonth[];
  step?: StepRow;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    phase: step?.phase ?? "الإعداد",
    title: step?.title ?? "",
    evidence: step?.evidence ?? "",
    owner: step?.owner ?? "",
    cost: step?.cost ?? "",
    actualCost: step?.actualCost ?? "",
    planStartWeek: step?.planStartWeek ? String(step.planStartWeek) : "",
    planWeeks: step?.planWeeks ? String(step.planWeeks) : "",
    actualStartWeek: step?.actualStartWeek ? String(step.actualStartWeek) : "",
    actualWeeks: step?.actualWeeks ? String(step.actualWeeks) : "",
    progress: String(step?.progress ?? 0),
  });
  const [monthly, setMonthly] = useState<Record<string, string>>(() =>
    Object.fromEntries(months.map((m) => [m.key, String(step?.monthlyCost?.[m.key] ?? "")]))
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await saveStep({ id: step?.id, initiativeId, ...form, monthlyCost: monthly });
      if (res.error) return setError(res.error);
      onClose();
    });

  const weekHint = `من ١ إلى ${weekCount} — نسبةً إلى بداية الخطة`;

  return (
    <Dialog
      title={step ? `تعديل الخطوة ${step.order}` : "خطوة تنفيذ جديدة"}
      icon={<ListChecks className="size-5" />}
      size="2xl"
      onClose={onClose}
      busy={busy}
      closeOnBackdrop={false}
      onSubmit={submit}
      footer={
        <>
          <FooterStatus error={error}>
            <span />
          </FooterStatus>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={busy} className={btn.secondary}>
              إلغاء
            </button>
            <button type="submit" disabled={busy} className={btn.primary}>
              {busy && <Spinner size={16} tone="onPrimary" />}
              حفظ
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <Labeled label="المرحلة">
            <Select
              variant="console"
              value={form.phase}
              onSelect={(v) => set("phase", v)}
              placeholder="المرحلة"
              options={PHASES.map((p) => ({ value: p, label: p }))}
            />
          </Labeled>
          <Labeled label="نصّ الخطوة">
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={field} />
          </Labeled>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="شاهد التنفيذ" hint="الوثيقة التي تُثبت إنجاز الخطوة.">
            <input value={form.evidence} onChange={(e) => set("evidence", e.target.value)} className={field} />
          </Labeled>
          <Labeled label="مسؤول التنفيذ">
            <input value={form.owner} onChange={(e) => set("owner", e.target.value)} className={field} />
          </Labeled>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Labeled label="التكلفة المقدَّرة">
            <input
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
              inputMode="decimal"
              dir="ltr"
              className={cx(field, "text-center tabular-nums")}
            />
          </Labeled>
          <Labeled label="التكلفة الفعلية">
            <input
              value={form.actualCost}
              onChange={(e) => set("actualCost", e.target.value)}
              inputMode="decimal"
              dir="ltr"
              className={cx(field, "text-center tabular-nums")}
            />
          </Labeled>
          <Labeled label="نسبة الإنجاز" hint="من ٠ إلى ١٠٠. ومنها تُحسب نسبة المبادرة.">
            <input
              value={form.progress}
              onChange={(e) => set("progress", e.target.value)}
              inputMode="numeric"
              dir="ltr"
              className={cx(field, "text-center tabular-nums")}
            />
          </Labeled>
        </div>

        <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <legend className="px-2 text-caption font-semibold text-slate-500 dark:text-slate-400">الخطة الزمنية</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="أسبوع البداية" hint={weekHint}>
              <input
                value={form.planStartWeek}
                onChange={(e) => set("planStartWeek", e.target.value)}
                inputMode="numeric"
                dir="ltr"
                className={cx(field, "text-center tabular-nums")}
              />
            </Labeled>
            <Labeled label="مدة الخطة بالأسابيع">
              <input
                value={form.planWeeks}
                onChange={(e) => set("planWeeks", e.target.value)}
                inputMode="numeric"
                dir="ltr"
                className={cx(field, "text-center tabular-nums")}
              />
            </Labeled>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <legend className="px-2 text-caption font-semibold text-slate-500 dark:text-slate-400">التنفيذ الفعلي</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="أسبوع البداية الفعلي" hint="يُترك فارغاً قبل أن تبدأ الخطوة.">
              <input
                value={form.actualStartWeek}
                onChange={(e) => set("actualStartWeek", e.target.value)}
                inputMode="numeric"
                dir="ltr"
                className={cx(field, "text-center tabular-nums")}
              />
            </Labeled>
            <Labeled label="مدة التنفيذ بالأسابيع">
              <input
                value={form.actualWeeks}
                onChange={(e) => set("actualWeeks", e.target.value)}
                inputMode="numeric"
                dir="ltr"
                className={cx(field, "text-center tabular-nums")}
              />
            </Labeled>
          </div>
        </fieldset>

        {months.length > 0 && (
          <div>
            <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
              توزيع تكلفة الخطوة على أشهر الخطة
            </span>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {months.map((m) => (
                <label key={m.key} className="block">
                  <span className="mb-1 block text-caption text-slate-400 dark:text-slate-500">
                    {m.label} {m.year}
                  </span>
                  <input
                    value={monthly[m.key] ?? ""}
                    onChange={(e) => setMonthly((prev) => ({ ...prev, [m.key]: e.target.value }))}
                    inputMode="decimal"
                    dir="ltr"
                    className={cx(field, "text-center tabular-nums")}
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-caption text-slate-400 dark:text-slate-500">{hint}</span>}
    </label>
  );
}
