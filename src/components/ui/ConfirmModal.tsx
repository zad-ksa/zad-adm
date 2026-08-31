"use client";

import { AlertTriangle, HelpCircle, X, Loader2 } from "lucide-react";

/**
 * A confirmation dialog.
 *
 * It began life as a delete dialog with "تأكيد الحذف" written into the button
 * and a red destructive style, which was fine while deleting was all it did.
 * Once it was reused for submitting, approving and saving, every one of those
 * asked the user to confirm a deletion — so the label and the tone are props
 * now.
 *
 * The defaults still say delete, because the callers that predate this change
 * are all deletions and none of them should have to be edited to keep working.
 * Any non-destructive caller must pass both.
 */
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  /** Text on the confirming button. */
  confirmLabel?: string;
  /** "danger" is red and warns; "primary" is the normal action colour. */
  tone?: "danger" | "primary";
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isPending = false,
  confirmLabel = "تأكيد الحذف",
  tone = "danger",
}: ConfirmModalProps) {
  const isDanger = tone === "danger";
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
        onClick={() => !isPending && onCancel()}
      />
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-2xl w-full max-w-sm overflow-hidden relative z-10 transform transition-all flex flex-col font-sans p-6 text-center" dir="rtl">
        
        <div
          className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
            isDanger ? "bg-red-100 dark:bg-red-900/30" : "bg-primary/10 dark:bg-primary/20"
          }`}
        >
          {isDanger ? (
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
          ) : (
            <HelpCircle className="h-6 w-6 text-primary dark:text-teal-300" />
          )}
        </div>
        
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {message}
        </p>

        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-bold transition-colors text-sm disabled:opacity-50"
          >
            إلغاء
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-bold transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${
              isDanger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
