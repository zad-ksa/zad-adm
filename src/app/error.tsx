"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 max-w-md w-full text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">عذراً، حدث خطأ غير متوقع</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          واجه النظام مشكلة أثناء معالجة طلبك. نعتذر عن هذا الخلل ونعمل على إصلاحه.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => reset()}
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-sm"
          >
            إعادة المحاولة
          </button>
          <a
            href="/main"
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm font-bold rounded-xl text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all shadow-sm"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}
