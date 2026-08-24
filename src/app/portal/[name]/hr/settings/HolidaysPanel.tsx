"use client";

import { useState } from "react";
import { CalendarOff, Loader2, Plus, Trash2, X } from "lucide-react";
import { saveCharityHoliday, deleteCharityHoliday } from "@/app/actions/attendance";
import { Chip, Field, HrCard, SectionHead, ctaClass, fs, ghostClass, inputClass } from "../ui";

export type Holiday = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

/** "YYYY-MM-DD" from a civil anchor, for the date inputs. */
function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

function formatRange(startDate: string, endDate: string): string {
  const fmt = (v: string) =>
    new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(v));
  return startDate.slice(0, 10) === endDate.slice(0, 10)
    ? fmt(startDate)
    : `${fmt(startDate)} — ${fmt(endDate)}`;
}

/**
 * Charity-wide days off: Eid, national day, an exceptional closure.
 *
 * A range rather than a single date, because Eid is days and forcing four
 * separate rows is how one of them ends up wrong. Leaving the end empty means a
 * single day, which is the common case.
 */
export default function HolidaysPanel({
  charityId,
  holidays,
  onChanged,
}: {
  charityId: string;
  holidays: Holiday[];
  onChanged: (message: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });

  function reset() {
    setForm({ name: "", startDate: "", endDate: "" });
    setEditingId(null);
    setIsOpen(false);
  }

  async function submit() {
    setError(null);
    setBusy("save");
    try {
      const res = await saveCharityHoliday(charityId, {
        id: editingId ?? undefined,
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      reset();
      onChanged(editingId ? "تم تحديث الإجازة" : "تمت إضافة الإجازة");
    } finally {
      setBusy(null);
    }
  }

  async function remove(holiday: Holiday) {
    if (!confirm(`حذف «${holiday.name}»؟`)) return;
    setError(null);
    setBusy(holiday.id);
    try {
      const res = await deleteCharityHoliday(charityId, holiday.id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      onChanged("تم حذف الإجازة");
    } finally {
      setBusy(null);
    }
  }

  return (
    <HrCard className="hr-reveal">
      <div className="p-6 pb-4">
        <SectionHead
          icon={CalendarOff}
          title="إجازات الجمعية"
          hint={holidays.length > 0 ? `${holidays.length} إجازة` : undefined}
          action={
            isOpen ? (
              <button onClick={reset} className={ghostClass} style={fs.meta}>
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => setIsOpen(true)} className={ghostClass} style={fs.meta}>
                <Plus className="w-3.5 h-3.5" />
                إضافة
              </button>
            )
          }
        />
        <p className="text-slate-400 dark:text-slate-500 mt-2" style={fs.meta}>
          أيام لا يُحتسب فيها حضور ولا غياب على أحد، ولا تُخصم من رصيد إجازات الموظفين.
        </p>
      </div>

      {error && (
        <p className="px-6 pb-3 text-rose-600 dark:text-rose-400 font-semibold" style={fs.meta}>
          {error}
        </p>
      )}

      {isOpen && (
        <div className="px-6 pb-4 space-y-3">
          <Field label="اسم الإجازة">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: عيد الفطر"
              className={inputClass}
              style={fs.body}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="من">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={inputClass}
                style={fs.body}
                dir="ltr"
              />
            </Field>
            <Field label="إلى" hint="اتركه فارغاً ليوم واحد">
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={inputClass}
                style={fs.body}
                dir="ltr"
              />
            </Field>
          </div>
          <button
            onClick={submit}
            disabled={!form.name.trim() || !form.startDate || busy !== null}
            className={ctaClass}
            style={fs.body}
          >
            {busy === "save" && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingId ? "حفظ التعديل" : "إضافة الإجازة"}
          </button>
        </div>
      )}

      {holidays.length === 0 ? (
        <p className="px-6 pb-8 text-slate-400 dark:text-slate-500" style={fs.body}>
          لم تُضَف إجازات بعد.
        </p>
      ) : (
        <ul>
          {holidays.map((holiday) => (
            <li
              key={holiday.id}
              className="flex flex-wrap items-center gap-3 px-6 py-4
                         shadow-[inset_0_1px_0_0_rgb(100_116_139_/_.10)]"
            >
              <span
                className="font-semibold text-slate-700 dark:text-slate-200"
                style={fs.body}
              >
                {holiday.name}
              </span>
              <Chip>{formatRange(holiday.startDate, holiday.endDate)}</Chip>
              <span className="mr-auto flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingId(holiday.id);
                    setForm({
                      name: holiday.name,
                      startDate: toInputDate(holiday.startDate),
                      endDate: toInputDate(holiday.endDate),
                    });
                    setIsOpen(true);
                    setError(null);
                  }}
                  className={ghostClass}
                  style={fs.meta}
                >
                  تعديل
                </button>
                <button
                  onClick={() => remove(holiday)}
                  disabled={busy === holiday.id}
                  className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                  title="حذف"
                >
                  {busy === holiday.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </HrCard>
  );
}
