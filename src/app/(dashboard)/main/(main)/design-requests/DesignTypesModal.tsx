"use client";

import { useState } from "react";
import { X, Loader2, AlertTriangle, Plus, Check, EyeOff, Eye, Palette } from "lucide-react";
import { saveDesignType, setDesignTypeActive } from "@/app/actions/designRequests";

export type DesignTypeRow = {
  id: string;
  name: string;
  workingDays: number;
  isActive: boolean;
};

/**
 * The design-type catalogue: each row is a name and the business days a request
 * of that kind is given.
 *
 * Editing a type never touches requests already in the queue — their duration
 * was frozen when they were submitted. That is stated in the panel because it
 * is the first thing a manager wonders when they raise a type from 3 days to 5.
 *
 * Retiring hides a type from the submission form without deleting it, so past
 * requests keep showing what they were.
 */
export default function DesignTypesModal({
  initialTypes,
  onClose,
  onChanged,
}: {
  initialTypes: DesignTypeRow[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draftName, setDraftName] = useState("");
  const [draftDays, setDraftDays] = useState("3");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDays, setEditDays] = useState("");

  async function run(key: string, fn: () => Promise<{ error?: string } | void>) {
    setBusyId(key);
    setError(null);
    try {
      const res = await fn();
      if (res && "error" in res && res.error) {
        setError(res.error);
        return false;
      }
      onChanged();
      return true;
    } finally {
      setBusyId(null);
    }
  }

  async function addType() {
    const ok = await run("new", () =>
      saveDesignType({ name: draftName, workingDays: Number(draftDays) })
    );
    if (ok) {
      setDraftName("");
      setDraftDays("3");
    }
  }

  async function saveEdit(id: string) {
    const ok = await run(id, () =>
      saveDesignType({ id, name: editName, workingDays: Number(editDays) })
    );
    if (ok) setEditingId(null);
  }

  const inputClass =
    "h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none";

  return (
    <div className="design-requests-ui fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[var(--dr-shadow-card)] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2
            className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100"
            style={{ fontSize: "var(--dr-fs-title)" }}
          >
            <Palette className="w-4 h-4 text-primary dark:text-teal-400" />
            أنواع التصاميم ومدد التنفيذ
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <p
            className="rounded-xl bg-primary/5 dark:bg-primary/10 text-primary dark:text-teal-300 px-4 py-3"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            تعديل مدة نوع يسري على الطلبات الجديدة فقط — الطلبات القائمة تحتفظ بمدتها
            المحسوبة وقت رفعها. لتمديد طلب قائم استخدم «إضافة أيام» على بطاقته.
          </p>

          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 font-bold"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Add */}
          <div className="flex flex-wrap items-end gap-2 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="flex-1 min-w-[150px]">
              <label
                className="block font-bold text-slate-500 dark:text-slate-400 mb-1"
                style={{ fontSize: "var(--dr-fs-eyebrow)" }}
              >
                اسم النوع
              </label>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="مثال: هوية بصرية"
                className={`w-full ${inputClass}`}
                style={{ fontSize: "var(--dr-fs-body)" }}
              />
            </div>
            <div className="w-24">
              <label
                className="block font-bold text-slate-500 dark:text-slate-400 mb-1"
                style={{ fontSize: "var(--dr-fs-eyebrow)" }}
              >
                أيام العمل
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={draftDays}
                onChange={(e) => setDraftDays(e.target.value)}
                className={`w-full ${inputClass} tabular-nums`}
                style={{ fontSize: "var(--dr-fs-body)" }}
                dir="ltr"
              />
            </div>
            <button
              onClick={addType}
              disabled={!draftName.trim() || busyId === "new"}
              className="h-10 px-4 flex items-center gap-2 text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--dr-shadow-cta)] rounded-xl font-bold transition-all disabled:opacity-50"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              {busyId === "new" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              إضافة
            </button>
          </div>

          {/* List */}
          {initialTypes.length === 0 ? (
            <p
              className="text-center py-6 text-slate-400 dark:text-slate-500"
              style={{ fontSize: "var(--dr-fs-body)" }}
            >
              لا توجد أنواع بعد. أضف أول نوع أعلاه.
            </p>
          ) : (
            <ul className="space-y-2">
              {initialTypes.map((type) => (
                <li
                  key={type.id}
                  className={`flex flex-wrap items-center gap-2 p-3 rounded-xl border ${
                    type.isActive
                      ? "border-slate-200 dark:border-slate-700"
                      : "border-slate-100 dark:border-slate-800 opacity-60"
                  }`}
                >
                  {editingId === type.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`flex-1 min-w-[140px] ${inputClass}`}
                        style={{ fontSize: "var(--dr-fs-body)" }}
                      />
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={editDays}
                        onChange={(e) => setEditDays(e.target.value)}
                        className={`w-20 ${inputClass} tabular-nums`}
                        style={{ fontSize: "var(--dr-fs-body)" }}
                        dir="ltr"
                      />
                      <button
                        onClick={() => saveEdit(type.id)}
                        disabled={busyId === type.id}
                        className="h-10 px-3 flex items-center gap-1.5 rounded-xl font-bold text-primary dark:text-teal-300 bg-primary/[0.08] disabled:opacity-50"
                        style={{ fontSize: "var(--dr-fs-meta)" }}
                      >
                        {busyId === type.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="h-10 px-3 rounded-xl font-bold text-slate-500 dark:text-slate-400"
                        style={{ fontSize: "var(--dr-fs-meta)" }}
                      >
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className="flex-1 min-w-[140px] font-bold text-slate-800 dark:text-slate-100"
                        style={{ fontSize: "var(--dr-fs-body)" }}
                      >
                        {type.name}
                        {!type.isActive && (
                          <span
                            className="mr-2 font-normal text-slate-400 dark:text-slate-500"
                            style={{ fontSize: "var(--dr-fs-eyebrow)" }}
                          >
                            (معطّل)
                          </span>
                        )}
                      </span>
                      <span
                        className="text-slate-500 dark:text-slate-400 tabular-nums"
                        style={{ fontSize: "var(--dr-fs-meta)" }}
                      >
                        {type.workingDays} يوم عمل
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(type.id);
                          setEditName(type.name);
                          setEditDays(String(type.workingDays));
                          setError(null);
                        }}
                        className="h-9 px-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-teal-300 hover:bg-primary/[0.06] transition-colors"
                        style={{ fontSize: "var(--dr-fs-meta)" }}
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() =>
                          run(type.id, () => setDesignTypeActive(type.id, !type.isActive))
                        }
                        disabled={busyId === type.id}
                        title={type.isActive ? "إخفاء من نموذج الطلب" : "إعادة تفعيله"}
                        className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-teal-300 hover:bg-primary/[0.06] transition-colors disabled:opacity-50"
                      >
                        {busyId === type.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : type.isActive ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
