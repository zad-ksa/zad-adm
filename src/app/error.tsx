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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">عذراً، حدث خطأ غير متوقع</h2>
        <p className="text-slate-500 mb-8">
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
            href="/dashboard"
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-slate-200 text-sm font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}
