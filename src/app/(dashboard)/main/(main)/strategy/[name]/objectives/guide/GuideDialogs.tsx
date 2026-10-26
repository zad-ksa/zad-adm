"use client";

import { useState, useTransition } from "react";
import { Layers, LineChart, Target } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import Select from "@/components/console/Select";
import { FooterStatus } from "@/components/console/overlays";
import { Spinner, btn, cx, field } from "@/components/console/ui";
import { saveIndicator, saveObjective, savePerspective } from "@/app/actions/strategyPlanning";
import type { GuideIndicator, GuideObjective, GuidePerspective } from "./GuideClient";

/**
 * نوافذ تحرير الدليل الثلاث.
 *
 * كلّها على `Dialog` واحد بـ`onSubmit`، فEnter يحفظ وزرُّ التذييل من نوع
 * `submit`. والخطأ يُعرض في التذييل لا في شريطٍ عابر: النموذج ما زال مفتوحاً
 * وفيه ما كُتب، فالرسالة مكانها عنده.
 */

const FREQUENCIES = [
  { value: "ربع سنوي", label: "ربع سنوي" },
  { value: "نصف سنوي", label: "نصف سنوي" },
  { value: "سنوي", label: "سنوي" },
];

const POLARITIES = [
  { value: "UP", label: "زيادة — التحسن أن يرتفع" },
  { value: "DOWN", label: "نقص — التحسن أن ينخفض" },
];

const CUMULATIVE = [
  { value: "false", label: "غير تراكمي — يبدأ من الصفر كل ربع، فالسنوي مجموعها" },
  { value: "true", label: "تراكمي — مستوًى قائم، فالسنوي آخر متحقق" },
];

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

export function PerspectiveDialog({
  charityId,
  perspective,
  onClose,
}: {
  charityId: string;
  perspective?: GuidePerspective;
  onClose: () => void;
}) {
  const [name, setName] = useState(perspective?.name ?? "");
  const [prefix, setPrefix] = useState(perspective?.prefix ?? "");
  const { error, busy, submit } = useSave(onClose);

  return (
    <Dialog
      title={perspective ? `تعديل بعد «${perspective.name}»` : "بعد استراتيجي جديد"}
      icon={<Layers className="size-5" />}
      size="sm"
      onClose={onClose}
      busy={busy}
      closeOnBackdrop={false}
      onSubmit={() => submit(() => savePerspective({ id: perspective?.id, charityId, name, prefix }))}
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
      <div className="space-y-4">
        <Labeled label="اسم البعد">
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="المستفيدون" />
        </Labeled>
        <Labeled label="الرمز" hint="حرفٌ واحدٌ تُبنى عليه رموز الأهداف: س، ص، م، ل، ت.">
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            maxLength={4}
            className={cx(field, "w-24 text-center")}
            placeholder="س"
          />
        </Labeled>
      </div>
    </Dialog>
  );
}

export function ObjectiveDialog({
  perspectiveId,
  objective,
  onClose,
}: {
  perspectiveId: string;
  objective?: GuideObjective;
  onClose: () => void;
}) {
  const [code, setCode] = useState(objective?.code ?? "");
  const [name, setName] = useState(objective?.name ?? "");
  const [description, setDescription] = useState(objective?.description ?? "");
  const { error, busy, submit } = useSave(onClose);

  return (
    <Dialog
      title={objective ? `تعديل الهدف ${objective.code}` : "هدف استراتيجي جديد"}
      icon={<Target className="size-5" />}
      size="lg"
      onClose={onClose}
      busy={busy}
      closeOnBackdrop={false}
      onSubmit={() => submit(() => saveObjective({ id: objective?.id, perspectiveId, code, name, description }))}
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
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <Labeled label="رمز الهدف" hint="مثل: س 1">
            <input value={code} onChange={(e) => setCode(e.target.value)} className={cx(field, "text-center")} dir="auto" />
          </Labeled>
          <Labeled label="نصّ الهدف">
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </Labeled>
        </div>
        <Labeled label="شرح الهدف" hint="الفقرة التي تُفصّل ما يقصده الهدف، كما في الوثيقة المعتمدة.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={cx(field, "h-auto py-2 leading-6")}
          />
        </Labeled>
      </div>
    </Dialog>
  );
}

export function IndicatorDialog({
  objectiveId,
  indicator,
  onClose,
}: {
  objectiveId: string;
  indicator?: GuideIndicator;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    code: indicator?.code ?? "",
    name: indicator?.name ?? "",
    description: indicator?.description ?? "",
    unit: indicator?.unit ?? "",
    formula: indicator?.formula ?? "",
    frequency: indicator?.frequency ?? "ربع سنوي",
    polarity: indicator?.polarity ?? "UP",
    cumulative: indicator?.cumulative ? "true" : "false",
    owner: indicator?.owner ?? "",
    execOwner: indicator?.execOwner ?? "",
    measureOwner: indicator?.measureOwner ?? "",
    baseline: indicator?.baseline ?? "",
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const { error, busy, submit } = useSave(onClose);

  return (
    <Dialog
      title={indicator ? `تعديل المؤشر ${indicator.code}` : "مؤشر أداء جديد"}
      icon={<LineChart className="size-5" />}
      size="xl"
      onClose={onClose}
      busy={busy}
      closeOnBackdrop={false}
      onSubmit={() =>
        submit(() =>
          saveIndicator({
            id: indicator?.id,
            objectiveId,
            ...form,
            cumulative: form.cumulative === "true",
          })
        )
      }
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
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <Labeled label="رمز المؤشر" hint="مثل: س 1 - 1">
            <input value={form.code} onChange={(e) => set("code", e.target.value)} className={cx(field, "text-center")} dir="auto" />
          </Labeled>
          <Labeled label="نصّ المؤشر">
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={field} />
          </Labeled>
        </div>

        <Labeled label="شرح المؤشر">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className={cx(field, "h-auto py-2 leading-6")}
          />
        </Labeled>

        <div className="grid gap-4 sm:grid-cols-3">
          <Labeled label="وحدة القياس" hint="مبادرة، مستفيدة، نسبة، ريال…">
            <input value={form.unit} onChange={(e) => set("unit", e.target.value)} className={field} />
          </Labeled>
          <Labeled label="دورية القياس">
            <Select
              variant="console"
              value={form.frequency}
              onSelect={(v) => set("frequency", v)}
              placeholder="الدورية"
              options={FREQUENCIES}
            />
          </Labeled>
          <Labeled label="خط الأساس" hint="قيمة المؤشر قبل الخطة. يُترك فارغاً إن لم تُقَس.">
            <input
              value={form.baseline}
              onChange={(e) => set("baseline", e.target.value)}
              inputMode="decimal"
              dir="ltr"
              className={cx(field, "text-center tabular-nums")}
            />
          </Labeled>
        </div>

        <Labeled label="معادلة القياس">
          <textarea
            value={form.formula}
            onChange={(e) => set("formula", e.target.value)}
            rows={2}
            className={cx(field, "h-auto py-2 leading-6")}
            placeholder="(عدد المتطلبات المحققة ÷ إجمالي المتطلبات) × 100"
          />
        </Labeled>

        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="القطبية">
            <Select
              variant="console"
              value={form.polarity}
              onSelect={(v) => set("polarity", v)}
              placeholder="القطبية"
              options={POLARITIES}
            />
          </Labeled>
          <Labeled
            label="التراكمية"
            hint="هي التي تحدّد حساب المحقق السنوي: جمعُ الأرباع أم آخر متحقق."
          >
            <Select
              variant="console"
              value={form.cumulative}
              onSelect={(v) => set("cumulative", v)}
              placeholder="التراكمية"
              options={CUMULATIVE}
            />
          </Labeled>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Labeled label="مالك المؤشر">
            <input value={form.owner} onChange={(e) => set("owner", e.target.value)} className={field} />
          </Labeled>
          <Labeled label="مسؤول التنفيذ">
            <input value={form.execOwner} onChange={(e) => set("execOwner", e.target.value)} className={field} />
          </Labeled>
          <Labeled label="مسؤول القياس">
            <input value={form.measureOwner} onChange={(e) => set("measureOwner", e.target.value)} className={field} />
          </Labeled>
        </div>
      </div>
    </Dialog>
  );
}
