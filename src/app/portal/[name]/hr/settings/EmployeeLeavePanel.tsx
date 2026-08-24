"use client";

import { useState } from "react";
import { CalendarHeart, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  saveEmployeeLeave,
  deleteEmployeeLeave,
  saveLeaveAllowance,
} from "@/app/actions/attendance";
import { LEAVE_TYPE_LABELS } from "@/lib/attendanceTime";
import { Chip, Field, HrCard, SectionHead, ctaClass, fs, ghostClass, inputClass } from "../ui";

export type LeaveRow = {
  id: string;
  userId: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  note: string | null;
};

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
 * Leave for individual staff, plus the annual allowance the balance is measured
 * against.
 *
 * Only ANNUAL leave draws the balance down. Sick and unpaid days still excuse
 * the absence — an employee off sick has not failed to come in — but charging
 * them to the annual entitlement would be a different (and wrong) policy.
 */
export default function EmployeeLeavePanel({
  charityId,
  staff,
  leaves,
  defaultAllowance,
  onChanged,
}: {
  charityId: string;
  staff: { id: string; name: string; allowance: number | null }[];
  leaves: LeaveRow[];
  defaultAllowance: number;
  onChanged: (message: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [allowance, setAllowance] = useState(String(defaultAllowance));
  const [form, setForm] = useState({
    targetUserId: staff[0]?.id ?? "",
    type: "ANNUAL",
    startDate: "",
    endDate: "",
    note: "",
  });

  async function submit() {
    setError(null);
    setBusy("save");
    try {
      const res = await saveEmployeeLeave(charityId, {
        targetUserId: form.targetUserId,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        note: form.note,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setForm({ ...form, startDate: "", endDate: "", note: "" });
      setIsOpen(false);
      onChanged("تمت إضافة الإجازة");
    } finally {
      setBusy(null);
    }
  }

  async function remove(leave: LeaveRow) {
    if (!confirm(`حذف إجازة ${leave.userName}؟`)) return;
    setError(null);
    setBusy(leave.id);
    try {
      const res = await deleteEmployeeLeave(charityId, leave.id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      onChanged("تم حذف الإجازة");
    } finally {
      setBusy(null);
    }
  }

  async function saveAllowance() {
    setError(null);
    setBusy("allowance");
    try {
      const res = await saveLeaveAllowance(charityId, {
        annualLeaveDays: Number(allowance),
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      onChanged("تم حفظ الرصيد السنوي");
    } finally {
      setBusy(null);
    }
  }

  return (
    <HrCard className="hr-reveal">
      <div className="p-6 pb-4">
        <SectionHead
          icon={CalendarHeart}
          title="إجازات الموظفين"
          hint={leaves.length > 0 ? `${leaves.length} إجازة` : undefined}
          action={
            isOpen ? (
              <button onClick={() => setIsOpen(false)} className={ghostClass} style={fs.meta}>
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsOpen(true)}
                disabled={staff.length === 0}
                className={ghostClass}
                style={fs.meta}
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة
              </button>
            )
          }
        />
        <p className="text-slate-400 dark:text-slate-500 mt-2" style={fs.meta}>
          أيام الإجازة لا تُحتسب غياباً. الإجازة السنوية وحدها تُخصم من الرصيد؛ المرضية
          وبدون راتب لا تُخصم.
        </p>
      </div>

      {error && (
        <p className="px-6 pb-3 text-rose-600 dark:text-rose-400 font-semibold" style={fs.meta}>
          {error}
        </p>
      )}

      <div className="px-6 pb-4 flex flex-wrap items-end gap-3">
        <div className="w-32">
          <Field label="الرصيد السنوي">
            <input
              type="number"
              min={0}
              max={365}
              value={allowance}
              onChange={(e) => setAllowance(e.target.value)}
              className={`${inputClass} tabular-nums`}
              style={fs.body}
              dir="ltr"
            />
          </Field>
        </div>
        <button
          onClick={saveAllowance}
          disabled={busy !== null}
          className={ghostClass}
          style={fs.body}
        >
          {busy === "allowance" && <Loader2 className="w-4 h-4 animate-spin" />}
          حفظ الرصيد
        </button>
        <span className="text-slate-400 dark:text-slate-500" style={fs.meta}>
          أيام عمل لكل موظف في السنة
        </span>
      </div>

      {isOpen && (
        <div className="px-6 pb-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="الموظف">
              <select
                value={form.targetUserId}
                onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}
                className={inputClass}
                style={fs.body}
              >
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="نوع الإجازة">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={inputClass}
                style={fs.body}
              >
                {Object.entries(LEAVE_TYPE_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
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
          <Field label="ملاحظة (اختياري)">
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={inputClass}
              style={fs.body}
            />
          </Field>
          <button
            onClick={submit}
            disabled={!form.targetUserId || !form.startDate || busy !== null}
            className={ctaClass}
            style={fs.body}
          >
            {busy === "save" && <Loader2 className="w-4 h-4 animate-spin" />}
            إضافة الإجازة
          </button>
        </div>
      )}

      {leaves.length === 0 ? (
        <p className="px-6 pb-8 text-slate-400 dark:text-slate-500" style={fs.body}>
          لم تُسجَّل إجازات بعد.
        </p>
      ) : (
        <ul>
          {leaves.map((leave) => (
            <li
              key={leave.id}
              className="flex flex-wrap items-center gap-3 px-6 py-4
                         shadow-[inset_0_1px_0_0_rgb(100_116_139_/_.10)]"
            >
              <span
                className="font-semibold text-slate-700 dark:text-slate-200 min-w-[110px]"
                style={fs.body}
              >
                {leave.userName}
              </span>
              <Chip tone={leave.type === "ANNUAL" ? "primary" : "neutral"}>
                {LEAVE_TYPE_LABELS[leave.type] ?? leave.type}
              </Chip>
              <span className="text-slate-500 dark:text-slate-400" style={fs.meta}>
                {formatRange(leave.startDate, leave.endDate)}
              </span>
              {leave.note && (
                <span className="text-slate-400 dark:text-slate-500" style={fs.eyebrow}>
                  {leave.note}
                </span>
              )}
              <button
                onClick={() => remove(leave)}
                disabled={busy === leave.id}
                className="mr-auto h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                title="حذف"
              >
                {busy === leave.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </HrCard>
  );
}
