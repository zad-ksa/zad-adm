"use client";

import { useState } from "react";
import {
  Check,
  Clock,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  saveShiftGroup,
  deleteShiftGroup,
  assignEmployeesToGroup,
  setDefaultShiftGroup,
} from "@/app/actions/zadAttendance";
import { WEEKDAY_LABELS, formatClock12 } from "@/lib/attendanceTime";
import { BTN, CARD, Feedback, GHOST, INPUT, useSettingsAction } from "../shared";

type Group = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  workDays: number[];
  isDefault: boolean;
};
type Employee = { id: string; name: string; shiftGroupId: string | null };

/** الأحد → ح، الإثنين → ن … the conventional single-letter day heads. */
const INITIALS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** First letters of the first two words — enough to tell twelve people apart. */
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

const emptyForm = {
  name: "",
  startTime: "08:00",
  endTime: "16:00",
  workDays: [0, 1, 2, 3, 4] as number[],
};

export default function GroupsClient({
  groups,
  employees,
  unassignedCount,
}: {
  groups: Group[];
  employees: Employee[];
  unassignedCount: number;
}) {
  const { busy, error, notice, run } = useSettingsAction();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState("");

  const defaultGroup = groups.find((g) => g.isDefault);
  const others = groups.filter((g) => !g.isDefault);

  /**
   * Who a group actually governs.
   *
   * Nobody points at the default group — that is what being the default means —
   * so the unassigned belong to whichever group holds the flag. One rule, used
   * for both the count and the faces.
   */
  const membersOf = (g: Group) =>
    employees.filter((e) => e.shiftGroupId === g.id || (g.isDefault && !e.shiftGroupId));

  const startEdit = (g: Group) => {
    setCreating(false);
    setEditingId(g.id);
    setForm({
      name: g.name,
      startTime: g.startTime,
      endTime: g.endTime,
      workDays: g.workDays,
    });
  };

  const closeForm = () => {
    setEditingId(null);
    setCreating(false);
    setForm(emptyForm);
  };

  const submit = async () => {
    const okDone = await run(
      () =>
        saveShiftGroup({
          ...(editingId ? { id: editingId } : {}),
          name: form.name,
          startTime: form.startTime,
          endTime: form.endTime,
          workDays: form.workDays,
        }),
      editingId ? "حُفظت المجموعة" : "أُضيفت المجموعة"
    );
    if (okDone) closeForm();
  };

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const shown = employees.filter((e) => e.name.includes(query.trim()));
  const groupNameFor = (e: Employee) =>
    e.shiftGroupId ? groups.find((g) => g.id === e.shiftGroupId)?.name : defaultGroup?.name;

  const GroupForm = (
    <div className="rounded-2xl border border-primary/30 dark:border-teal-500/30 bg-primary/[0.03] dark:bg-teal-500/5 p-5 space-y-3">
      <div className="grid sm:grid-cols-3 gap-2">
        <input
          className={INPUT}
          placeholder="اسم المجموعة"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <label className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
          من
          <input
            className={INPUT}
            type="time"
            dir="ltr"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
          إلى
          <input
            className={INPUT}
            type="time"
            dir="ltr"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {WEEKDAY_LABELS.map((label, i) => {
          const on = form.workDays.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  workDays: on
                    ? form.workDays.filter((d) => d !== i)
                    : [...form.workDays, i].sort(),
                })
              }
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                on
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button className={BTN} disabled={busy || !form.name.trim()} onClick={submit}>
          <Check className="w-3.5 h-3.5" /> {editingId ? "حفظ التعديل" : "إضافة المجموعة"}
        </button>
        <button className={GHOST} onClick={closeForm} disabled={busy}>
          إلغاء
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <Feedback error={error} notice={notice} />

      {/* ── المجموعات ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[13px] font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            المجموعات
            <span className="text-slate-400 font-bold tabular-nums">{groups.length}</span>
          </h3>
          {!creating && !editingId && (
            <button
              className={BTN}
              onClick={() => {
                setForm(emptyForm);
                setCreating(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" /> مجموعة جديدة
            </button>
          )}
        </div>

        {creating && GroupForm}

        <div className="grid lg:grid-cols-2 gap-3">
          {groups.map((g) => {
            if (editingId === g.id) return <div key={g.id}>{GroupForm}</div>;

            const members = membersOf(g);
            const from = minutes(g.startTime);
            const to = minutes(g.endTime);
            const hours = Math.round(((to - from) / 60) * 10) / 10;

            return (
              <div key={g.id} className={`${CARD} group/card`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                      {g.name}
                      {g.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary dark:text-teal-400 bg-primary/10 dark:bg-teal-500/15 px-1.5 py-0.5 rounded">
                          <Star className="w-2.5 h-2.5" /> افتراضية
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 tabular-nums" dir="ltr">
                      {formatClock12(g.startTime)} – {formatClock12(g.endTime)}
                      <span className="text-slate-400"> · {hours} ساعات</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center"
                      title="تعديل"
                      disabled={busy}
                      onClick={() => startEdit(g)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!g.isDefault && (
                      <>
                        <button
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center"
                          title="اجعلها الافتراضية"
                          disabled={busy}
                          onClick={() => {
                            const ok = window.confirm(
                              `تعيين «${g.name}» افتراضية سينقل ${unassignedCount} موظفاً غير مُسنَد إلى دوامها (${formatClock12(g.startTime)} – ${formatClock12(g.endTime)}). أيام الحضور الماضية لا تتغيّر. متابعة؟`
                            );
                            if (ok) run(() => setDefaultShiftGroup(g.id), "عُيّنت المجموعة الافتراضية");
                          }}
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors inline-flex items-center justify-center"
                          title="حذف — ينتقل أفرادها إلى الافتراضية"
                          disabled={busy}
                          onClick={() => run(() => deleteShiftGroup(g.id), "حُذفت المجموعة")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* The shift on a 24-hour track. Two groups side by side can be
                    compared at a glance instead of by reading four numbers. */}
                <div className="mt-4">
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        marginInlineStart: `${(from / 1440) * 100}%`,
                        width: `${((to - from) / 1440) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-slate-300 dark:text-slate-600 tabular-nums" dir="ltr">
                    <span>24</span>
                    <span>18</span>
                    <span>12</span>
                    <span>6</span>
                    <span>0</span>
                  </div>
                </div>

                {/* The week */}
                <div className="mt-3 flex items-center gap-1">
                  {INITIALS.map((letter, i) => {
                    const on = g.workDays.includes(i);
                    return (
                      <span
                        key={i}
                        title={WEEKDAY_LABELS[i]}
                        className={`w-6 h-6 rounded-lg inline-flex items-center justify-center text-[10px] font-bold ${
                          on
                            ? "bg-primary/10 text-primary dark:bg-teal-500/15 dark:text-teal-300"
                            : "bg-slate-50 text-slate-300 dark:bg-slate-800/50 dark:text-slate-600"
                        }`}
                      >
                        {letter}
                      </span>
                    );
                  })}
                  <span className="mr-auto text-[11px] text-slate-400 tabular-nums">
                    {g.workDays.length} أيام عمل
                  </span>
                </div>

                {/* Who is in it */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <div className="flex -space-x-2 space-x-reverse">
                    {members.slice(0, 5).map((m) => (
                      <span
                        key={m.id}
                        title={m.name}
                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 text-[10px] font-bold text-slate-500 dark:text-slate-300 inline-flex items-center justify-center"
                      >
                        {initials(m.name)}
                      </span>
                    ))}
                    {members.length > 5 && (
                      <span className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800/60 border-2 border-white dark:border-slate-900 text-[10px] font-bold text-slate-400 inline-flex items-center justify-center tabular-nums">
                        +{members.length - 5}
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {members.length === 0 ? "لا أحد" : `${members.length} موظف`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── الإسناد ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-[13px] font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            إسناد الموظفين
            <span className="text-slate-400 font-bold tabular-nums">{employees.length}</span>
          </h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3" />
            <input
              className="h-9 w-56 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[12px] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="ابحث باسم الموظف"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Bulk bar — assignEmployeesToGroup already takes a list; this is the
            screen finally using it as one. */}
        {picked.size > 0 && (
          <div className="rounded-xl border border-primary/30 dark:border-teal-500/30 bg-primary/[0.03] dark:bg-teal-500/5 px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">
              {picked.size} محدَّد
            </span>
            <select
              className={`${INPUT} w-auto`}
              value={bulkTarget}
              onChange={(e) => setBulkTarget(e.target.value)}
            >
              <option value="">اختر المجموعة…</option>
              <option value="__default__">
                {defaultGroup ? `الافتراضية (${defaultGroup.name})` : "الافتراضية"}
              </option>
              {others.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              className={BTN}
              disabled={busy || !bulkTarget}
              onClick={async () => {
                const target = bulkTarget === "__default__" ? null : bulkTarget;
                const okDone = await run(
                  () => assignEmployeesToGroup(target, [...picked]),
                  `أُسند ${picked.size} موظفاً`
                );
                if (okDone) {
                  setPicked(new Set());
                  setBulkTarget("");
                }
              }}
            >
              إسناد
            </button>
            <button
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-1 text-[11px] font-bold mr-auto"
              onClick={() => setPicked(new Set())}
            >
              <X className="w-3.5 h-3.5" /> إلغاء التحديد
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {shown.length === 0 && (
            <p className="px-4 py-6 text-center text-[12px] text-slate-400">لا نتائج.</p>
          )}
          {shown.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <input
                type="checkbox"
                className="accent-primary shrink-0"
                checked={picked.has(e.id)}
                onChange={() => toggle(e.id)}
                aria-label={`تحديد ${e.name}`}
              />
              <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-300 inline-flex items-center justify-center shrink-0">
                {initials(e.name)}
              </span>
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 min-w-0 truncate">
                {e.name}
              </span>
              <span className="mr-auto flex items-center gap-2 shrink-0">
                {!e.shiftGroupId && (
                  <span className="hidden sm:inline text-[10px] text-slate-400">
                    يتبع {groupNameFor(e)}
                  </span>
                )}
                <select
                  className="text-[12px] px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  value={!e.shiftGroupId || e.shiftGroupId === defaultGroup?.id ? "" : e.shiftGroupId}
                  disabled={busy}
                  onChange={(ev) =>
                    run(() => assignEmployeesToGroup(ev.target.value || null, [e.id]), "تم الإسناد")
                  }
                >
                  <option value="">
                    {defaultGroup ? `الافتراضية (${defaultGroup.name})` : "الافتراضية"}
                  </option>
                  {others.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
