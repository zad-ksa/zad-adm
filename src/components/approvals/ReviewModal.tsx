"use client";

import { useState, useTransition } from "react";
import { X, ShieldCheck, ArrowRight, Check, CornerUpLeft, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import { reviewRequest } from "@/app/actions/approvals";

type ReviewAction = "APPROVED_FINAL" | "FORWARDED" | "REJECTED" | "RETURNED" | "DELEGATED";

import { useRoleLabels } from "@/components/RoleLabelsProvider";

export default function ReviewModal({
  request, onClose, onDone, allEmployees,
}: {
  request: any; onClose: () => void; onDone: () => void; allEmployees: any[];
}) {
  const roleLabels = useRoleLabels();

  // الإجراء الافتراضي: تمرير إن كانت سلسلة، وإلا اعتماد
  const defaultAction: ReviewAction = request.chain ? "FORWARDED" : "APPROVED_FINAL";
  const [action, setAction] = useState<ReviewAction>(defaultAction);
  const [note, setNote] = useState("");
  const [delegatedToId, setDelegatedToId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // الإجراءات المتاحة — التمرير فقط إذا توجد سلسلة
  const actions: { value: ReviewAction; label: string; icon: any; color: string; desc: string }[] = [
    ...(request.chain ? [{ value: "FORWARDED" as ReviewAction, label: "تمرير للأعلى", icon: ArrowRight, color: "indigo", desc: "إرسال للمستوى التالي في السلسلة" }] : []),
    { value: "APPROVED_FINAL", label: "اعتماد نهائي", icon: Check, color: "emerald", desc: "اعتماد الطلب وإغلاقه" },
    { value: "RETURNED", label: "إرجاع للتعديل", icon: CornerUpLeft, color: "amber", desc: "إرجاع للمرسل مع ملاحظات" },
    { value: "REJECTED", label: "رفض", icon: X, color: "red", desc: "رفض الطلب نهائياً" },
    { value: "DELEGATED", label: "تحويل التنفيذ", icon: UserCheck, color: "purple", desc: "تحويل تنفيذ الطلب لشخص آخر" },
  ];

  // الملاحظات إلزامية فقط عند الإرجاع أو الرفض
  const noteRequired = action === "RETURNED" || action === "REJECTED";

  function handleSubmit() {
    if (noteRequired && !note.trim()) {
      setError("يجب ذكر السبب أو الملاحظات"); return;
    }
    if (action === "DELEGATED" && !delegatedToId) {
      setError("يجب اختيار الشخص المحوَّل إليه"); return;
    }
    setError("");
    startTransition(async () => {
      try {
        await reviewRequest({ requestId: request.id, action, note, delegatedToId: delegatedToId || undefined });
        onDone(); onClose();
      } catch (e: any) { setError(e.message); }
    });
  }

  const colorMap: Record<string, string> = {
    indigo:  "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 text-indigo-700 dark:text-indigo-300 ring-indigo-300 dark:ring-indigo-700",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 text-emerald-700 dark:text-emerald-300 ring-emerald-300 dark:ring-emerald-700",
    amber:   "bg-amber-50 dark:bg-amber-900/20 border-amber-400 text-amber-700 dark:text-amber-300 ring-amber-300 dark:ring-amber-700",
    red:     "bg-red-50 dark:bg-red-900/20 border-red-400 text-red-700 dark:text-red-300 ring-red-300 dark:ring-red-700",
    purple:  "bg-purple-50 dark:bg-purple-900/20 border-purple-400 text-purple-700 dark:text-purple-300 ring-purple-300 dark:ring-purple-700",
  };
  const btnMap: Record<string, string> = {
    indigo: "bg-indigo-600 hover:bg-indigo-700", emerald: "bg-emerald-600 hover:bg-emerald-700",
    amber: "bg-amber-500 hover:bg-amber-600", red: "bg-red-600 hover:bg-red-700",
    purple: "bg-purple-600 hover:bg-purple-700",
  };
  const selectedAction = actions.find(a => a.value === action)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> مراجعة الطلب
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5">
            {request.title}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {actions.map(opt => (
              <button key={opt.value} type="button" onClick={() => setAction(opt.value)}
                className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-right ${
                  action === opt.value ? `${colorMap[opt.color]} ring-2` : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300"
                }`}>
                <opt.icon className="w-4 h-4 shrink-0" />
                <div>
                  <div>{opt.label}</div>
                  <div className="font-normal text-[10px] opacity-70">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {action === "DELEGATED" && (
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">الشخص المحوَّل إليه *</label>
              <select value={delegatedToId} onChange={e => setDelegatedToId(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">اختر شخصاً...</option>
                {allEmployees.filter(e => e.id !== request.createdBy?.id).map(e => (
                  <option key={e.id} value={e.id}>{e.name} — {roleLabels[e.role] || e.role}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
              {noteRequired ? "السبب / الملاحظات *" : "ملاحظات (اختياري)"}
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder={noteRequired ? "اذكر السبب أو التعديلات المطلوبة..." : "يمكنك إضافة ملاحظة..."}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">إلغاء</button>
          <button onClick={handleSubmit} disabled={isPending}
            className={`flex items-center gap-2 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors ${btnMap[selectedAction?.color || "emerald"]}`}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {isPending ? "جاري الحفظ..." : "تأكيد"}
          </button>
        </div>
      </div>
    </div>
  );
}
