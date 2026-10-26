"use client";

import { useState, useTransition } from "react";
import { ListPlus, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import Select from "@/components/console/Select";
import { notify } from "@/components/console/toastBus";
import { Badge, Spinner, btn, cx, field } from "@/components/console/ui";
import {
  addStatusOption,
  reactivateStatusOption,
  removeStatusOption,
  setStrategyStatus,
  updateStatusOption,
} from "@/app/actions/strategyPlanning";

export type StatusOption = { id: string; name: string; tone: string; isActive: boolean };

const TONES: { value: string; label: string }[] = [
  { value: "muted", label: "رمادية — لم تبدأ أو متوقّفة" },
  { value: "warn", label: "كهرمانية — قيد العمل" },
  { value: "good", label: "خضراء — مكتملة أو سائرة" },
  { value: "danger", label: "حمراء — متعثّرة" },
];

/** `muted` في الجدول هي `neutral` في شارة العدّة — اسمٌ واحدٌ لنبرةٍ واحدة. */
const tone = (value: string): "neutral" | "warn" | "good" | "danger" =>
  value === "warn" || value === "good" || value === "danger" ? value : "neutral";

/**
 * حالة الخطة الاستراتيجية — اختيارٌ يدويٌّ لا رقمٌ محسوب.
 *
 * وقائمة الحالات تُدار من هنا لا من شاشةٍ في الإعدادات: المكان الذي تُستعمل
 * فيه القائمة هو مكان تعديلها، كما فعلنا في غيرها. وهي بياناتٌ في جدول، فإضافة
 * حالةٍ أو تغيير اسمها لا تحتاج نشرة.
 */
export default function StrategyStatusField({
  charityId,
  current,
  updatedAt,
  options,
  canEdit,
}: {
  charityId: string;
  current: string | null;
  updatedAt: string | null;
  options: StatusOption[];
  canEdit: boolean;
}) {
  const [value, setValue] = useState(current);
  const [saving, startSaving] = useTransition();
  const [managing, setManaging] = useState(false);

  const active = options.filter((o) => o.isActive);
  // حالةٌ مختارةٌ عُطِّل خيارها لاحقاً: تظل ظاهرةً كي لا تختفي بلا بيان.
  const shown = value && !active.some((o) => o.name === value) ? [...active, { id: value, name: value, tone: "muted", isActive: true }] : active;
  const currentTone = tone(options.find((o) => o.name === value)?.tone ?? "muted");

  const save = (next: string | null) => {
    const previous = value;
    setValue(next);
    startSaving(async () => {
      const res = await setStrategyStatus(charityId, next);
      if (res.error) {
        setValue(previous);
        notify("error", res.error);
        return;
      }
      notify("ok", next ? `الحالة: ${next}` : "أُزيلت الحالة");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-meta font-medium text-slate-500 dark:text-slate-400">حالة الخطة</span>

      {canEdit ? (
        <>
          <div className="w-[260px]">
            <Select
              variant="console"
              value={value ?? ""}
              onSelect={(v) => save(v || null)}
              placeholder="اختر الحالة"
              options={shown.map((o) => ({ value: o.name, label: o.name }))}
            />
          </div>
          {saving && <Spinner size={16} />}
          <button type="button" onClick={() => setManaging(true)} className={btn.ghost}>
            <ListPlus className="size-4" />
            إدارة الحالات
          </button>
        </>
      ) : value ? (
        <Badge tone={currentTone}>{value}</Badge>
      ) : (
        <span className="text-body text-slate-400 dark:text-slate-500">لم تُحدَّد</span>
      )}

      {value && updatedAt && (
        <span className="text-caption text-slate-400 dark:text-slate-500">آخر تحديث: {updatedAt}</span>
      )}

      {managing && <ManageOptions options={options} onClose={() => setManaging(false)} />}
    </div>
  );
}

function ManageOptions({ options, onClose }: { options: StatusOption[]; onClose: () => void }) {
  const [busy, startBusy] = useTransition();
  const [draftName, setDraftName] = useState("");
  const [draftTone, setDraftTone] = useState("muted");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTone, setEditTone] = useState("muted");
  const [removing, setRemoving] = useState<StatusOption | null>(null);

  const run = (fn: () => Promise<{ error?: string; deactivated?: boolean }>, done?: () => void) =>
    startBusy(async () => {
      const res = await fn();
      if (res.error) return notify("error", res.error);
      if (res.deactivated) notify("info", "الحالة مستعملةٌ في جمعية، فعُطِّلت بدل حذفها");
      done?.();
    });

  return (
    <>
      <Dialog
        title="حالات الخطة الاستراتيجية"
        description="القائمة التي يُختار منها في صفحة كل جمعية."
        icon={<ListPlus className="size-5" />}
        size="lg"
        onClose={onClose}
        busy={busy}
        footer={
          <button type="button" onClick={onClose} className={btn.secondary}>
            تمّ
          </button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-200 p-3 dark:border-slate-700">
            <div className="min-w-[170px] flex-1">
              <label className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
                اسم الحالة
              </label>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="مثل: مراجعة مجلس الإدارة"
                className={field}
              />
            </div>
            <div className="w-[230px]">
              <label className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
                اللون
              </label>
              <Select variant="console" value={draftTone} onSelect={setDraftTone} placeholder="اللون" options={TONES} />
            </div>
            <button
              type="button"
              disabled={busy || !draftName.trim()}
              onClick={() =>
                run(() => addStatusOption(draftName, draftTone), () => {
                  setDraftName("");
                  setDraftTone("muted");
                })
              }
              className={btn.primary}
            >
              {busy ? <Spinner size={16} tone="onPrimary" /> : <Plus className="size-4" />}
              إضافة
            </button>
          </div>

          <ul className="space-y-2">
            {options.map((option) => (
              <li
                key={option.id}
                className={cx(
                  "flex flex-wrap items-center gap-2 rounded-xl border p-3",
                  option.isActive
                    ? "border-slate-200 dark:border-slate-700"
                    : "border-slate-100 opacity-60 dark:border-slate-800"
                )}
              >
                {editingId === option.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={cx(field, "min-w-[150px] flex-1")}
                    />
                    <div className="w-[230px]">
                      <Select variant="console" value={editTone} onSelect={setEditTone} placeholder="اللون" options={TONES} />
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => updateStatusOption(option.id, editName, editTone), () => setEditingId(null))}
                      className={btn.primary}
                    >
                      حفظ
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className={btn.ghost}>
                      إلغاء
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-[150px] flex-1">
                      <Badge tone={tone(option.tone)}>{option.name}</Badge>
                      {!option.isActive && (
                        <span className="mr-2 text-caption text-slate-400 dark:text-slate-500">(معطّلة)</span>
                      )}
                    </span>
                    {option.isActive ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(option.id);
                            setEditName(option.name);
                            setEditTone(tone(option.tone));
                          }}
                          aria-label={`تعديل ${option.name}`}
                          className={btn.icon}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoving(option)}
                          aria-label={`حذف ${option.name}`}
                          className={btn.iconDanger}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => reactivateStatusOption(option.id))}
                        className={btn.ghost}
                      >
                        <RotateCcw className="size-4" />
                        إعادة تفعيل
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Dialog>

      {removing && (
        <ConfirmDialog
          variant="console"
          title={`حذف «${removing.name}»؟`}
          message="إن كانت مستعملةً في جمعيةٍ فستُعطَّل بدل حذفها، فلا تضيع حالتها."
          confirmLabel="حذف"
          isPending={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() => run(() => removeStatusOption(removing.id), () => setRemoving(null))}
        />
      )}
    </>
  );
}
