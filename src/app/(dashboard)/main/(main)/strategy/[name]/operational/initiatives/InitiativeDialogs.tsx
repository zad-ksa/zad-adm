"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarRange, ListChecks } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import Select from "@/components/console/Select";
import { FooterStatus } from "@/components/console/overlays";
import { Badge, Spinner, btn, cx, field } from "@/components/console/ui";
import { PRIORITIES, saveInitiative, savePlan } from "@/app/actions/strategyOperational";
import { weeksBetween, type PlanMonth } from "@/lib/initiativeProgress";
import type { InitiativeRow, ObjectiveOption, PlanOption } from "./InitiativesClient";

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-caption text-slate-400 dark:text-slate-500">{hint}</span>}
    </label>
  );
}

function useSave(onClose: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const submit = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) return setError(res.error);
      onClose();
    });
  return { error, busy, submit };
}

function Footer({ error, busy, onClose }: { error: string | null; busy: boolean; onClose: () => void }) {
  return (
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
  );
}

/**
 * نافذة الخطة التشغيلية.
 *
 * وعددُ الأسابيع لا يُدخَل: يُحسب من التاريخين ويُعرض حال كتابتهما. فرقمان
 * يُحدَّدان وثالثٌ يُشتقّ منهما لا يتناقضان — وفي ملف Excel «أسابيع الخطة»
 * خليّةٌ مستقلّة يمكن أن تخالف تاريخَيها.
 */
export function PlanDialog({
  charityId,
  plan,
  onClose,
}: {
  charityId: string;
  plan?: PlanOption;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(plan?.label ?? "");
  const [startDate, setStartDate] = useState(plan?.startDate ?? "");
  const [endDate, setEndDate] = useState(plan?.endDate ?? "");
  const { error, busy, submit } = useSave(onClose);

  const weeks = useMemo(() => {
    if (!startDate || !endDate) return null;
    const a = new Date(`${startDate}T00:00:00Z`);
    const b = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return null;
    return weeksBetween(a, b);
  }, [startDate, endDate]);

  return (
    <Dialog
      title={plan ? `تعديل خطة «${plan.label}»` : "خطة تشغيلية جديدة"}
      icon={<CalendarRange className="size-5" />}
      size="md"
      onClose={onClose}
      busy={busy}
      closeOnBackdrop={false}
      onSubmit={() => submit(() => savePlan({ id: plan?.id, charityId, label, startDate, endDate }))}
      footer={<Footer error={error} busy={busy} onClose={onClose} />}
    >
      <div className="space-y-4">
        <Labeled label="اسم الخطة" hint="مثل: أغسطس 2026 — ديسمبر 2026">
          <input value={label} onChange={(e) => setLabel(e.target.value)} className={field} />
        </Labeled>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="تاريخ البداية">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
          </Labeled>
          <Labeled label="تاريخ النهاية">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
          </Labeled>
        </div>
        <p className="rounded-xl bg-primary/5 px-4 py-3 text-meta text-primary dark:bg-primary/10 dark:text-teal-300">
          {weeks === null
            ? "حدّد التاريخين ليُحسب عدد الأسابيع — وهو محور مخطّط جانت."
            : `عدد الأسابيع المحسوب: ${weeks} أسبوعاً. وأعمدة الموازنة الشهرية تُشتقّ من الفترة نفسها.`}
        </p>
      </div>
    </Dialog>
  );
}

/**
 * نافذة المبادرة.
 *
 * والهدف والمؤشرات تُختار من الدليل لا تُكتب باليد — فلا يُربط مؤشرٌ باسمٍ
 * لا يقابله صفّ. والمؤشرات المعروضة تضيق على مؤشرات الهدف المختار، لأن
 * المبادرة تخدم هدفاً فمؤشراته هي المعنيّة.
 */
export function InitiativeDialog({
  planId,
  months,
  objectives,
  initiative,
  onClose,
}: {
  planId: string;
  months: PlanMonth[];
  objectives: ObjectiveOption[];
  initiative?: InitiativeRow;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initiative?.name ?? "",
    description: initiative?.description ?? "",
    objectiveId: initiative?.objective?.id ?? "",
    durationText: initiative?.durationText ?? "",
    managerName: initiative?.managerName ?? "",
    owningDept: initiative?.owningDept ?? "",
    priority: initiative?.priority ?? "",
    startDate: initiative?.startDate ?? "",
    endDate: initiative?.endDate ?? "",
    budget: initiative?.budget ?? "",
  });
  const [indicatorIds, setIndicatorIds] = useState<string[]>(initiative?.indicators.map((i) => i.id) ?? []);
  const [monthly, setMonthly] = useState<Record<string, string>>(() =>
    Object.fromEntries(months.map((m) => [m.key, String(initiative?.monthlyBudget?.[m.key] ?? "")]))
  );
  const { error, busy, submit } = useSave(onClose);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const selected = objectives.find((o) => o.id === form.objectiveId) ?? null;
  // مؤشرات الهدف المختار، ومعها ما كان مرتبطاً سابقاً من أهدافٍ أخرى كي لا
  // يختفي ارتباطٌ قائمٌ من الواجهة فيُحذف بالحفظ بلا قصد.
  const indicatorPool = useMemo(() => {
    const pool = new Map<string, { id: string; code: string; name: string }>();
    for (const i of selected?.indicators ?? []) pool.set(i.id, i);
    for (const i of initiative?.indicators ?? []) if (!pool.has(i.id)) pool.set(i.id, i);
    return [...pool.values()];
  }, [selected, initiative]);

  const distributed = Object.values(monthly).reduce((a, v) => a + (Number(v) || 0), 0);
  const budgetValue = Number(form.budget) || 0;

  return (
    <Dialog
      title={initiative ? `تعديل مبادرة «${initiative.name}»` : "مبادرة جديدة"}
      icon={<ListChecks className="size-5" />}
      size="2xl"
      onClose={onClose}
      busy={busy}
      closeOnBackdrop={false}
      onSubmit={() =>
        submit(() =>
          saveInitiative({
            id: initiative?.id,
            planId,
            ...form,
            objectiveId: form.objectiveId || null,
            indicatorIds,
            monthlyBudget: monthly,
          })
        )
      }
      footer={<Footer error={error} busy={busy} onClose={onClose} />}
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Labeled label="اسم المبادرة">
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={field} />
          </Labeled>
          <Labeled label="مدة المبادرة" hint="نصّاً كما في الوثيقة">
            <input
              value={form.durationText}
              onChange={(e) => set("durationText", e.target.value)}
              placeholder="18 أسبوعاً"
              className={field}
            />
          </Labeled>
        </div>

        <Labeled label="وصف المبادرة">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className={cx(field, "h-auto py-2 leading-6")}
          />
        </Labeled>

        <Labeled label="الهدف الاستراتيجي المرتبط" hint="من دليل الأهداف والمؤشرات.">
          <Select
            variant="console"
            value={form.objectiveId}
            onSelect={(v) => {
              set("objectiveId", v);
              // المؤشرات تتبع الهدف: ما لم يعد من مؤشراته يُرفع من الاختيار.
              const allowed = new Set((objectives.find((o) => o.id === v)?.indicators ?? []).map((i) => i.id));
              setIndicatorIds((prev) => prev.filter((id) => allowed.has(id)));
            }}
            placeholder="بلا هدف"
            options={[
              { value: "", label: "بلا هدف" },
              ...objectives.map((o) => ({
                value: o.id,
                label: `${o.code} — ${o.name}`,
                hint: o.perspective,
              })),
            ]}
          />
        </Labeled>

        <div>
          <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
            مؤشرات الأداء المرتبطة
          </span>
          {indicatorPool.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-body text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {form.objectiveId ? "لا مؤشرات لهذا الهدف في الدليل." : "اختر هدفاً لتظهر مؤشراته."}
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {indicatorPool.map((indicator) => {
                const active = indicatorIds.includes(indicator.id);
                return (
                  <li key={indicator.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setIndicatorIds((prev) =>
                          active ? prev.filter((id) => id !== indicator.id) : [...prev, indicator.id]
                        )
                      }
                      title={indicator.name}
                      aria-pressed={active}
                      className={cx(
                        "max-w-[320px] truncate rounded-lg border px-2.5 py-1.5 text-start text-meta transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        active
                          ? "border-primary/30 bg-primary/[0.08] text-primary dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      )}
                    >
                      <span className="font-semibold">{indicator.code}</span> {indicator.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Labeled label="مدير المبادرة">
            <input value={form.managerName} onChange={(e) => set("managerName", e.target.value)} className={field} />
          </Labeled>
          <Labeled label="الإدارة المالكة">
            <input value={form.owningDept} onChange={(e) => set("owningDept", e.target.value)} className={field} />
          </Labeled>
          <Labeled label="الأولوية">
            <Select
              variant="console"
              value={form.priority}
              onSelect={(v) => set("priority", v)}
              placeholder="بلا أولوية"
              options={[{ value: "", label: "بلا أولوية" }, ...PRIORITIES.map((p) => ({ value: p, label: p }))]}
            />
          </Labeled>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Labeled label="تاريخ البداية">
            <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={field} />
          </Labeled>
          <Labeled label="تاريخ النهاية">
            <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={field} />
          </Labeled>
          <Labeled label="الموازنة المعتمدة">
            <input
              value={form.budget}
              onChange={(e) => set("budget", e.target.value)}
              inputMode="decimal"
              dir="ltr"
              className={cx(field, "text-center tabular-nums")}
            />
          </Labeled>
        </div>

        {months.length > 0 && (
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-caption font-semibold text-slate-500 dark:text-slate-400">
                توزيع الموازنة على أشهر الخطة
              </span>
              {budgetValue > 0 && (
                <span className="text-caption">
                  {distributed === budgetValue ? (
                    <Badge tone="good">التوزيع مطابقٌ للموازنة</Badge>
                  ) : (
                    <Badge tone="warn">
                      الموزَّع {distributed.toLocaleString("en-US")} من {budgetValue.toLocaleString("en-US")}
                    </Badge>
                  )}
                </span>
              )}
            </div>
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
