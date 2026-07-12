"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function RequestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Requests page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center" dir="rtl">
      <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-8 max-w-lg w-full">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">خطأ في صفحة الطلبات</h2>
        <p className="text-sm text-red-600 dark:text-red-400 font-mono bg-red-100 dark:bg-red-900/40 rounded-xl p-3 mb-4 text-left break-all">
          {error.message || "Unknown error"}
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 mb-4">digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-primary/90 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
