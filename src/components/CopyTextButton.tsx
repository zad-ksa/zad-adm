"use client";

import { useState } from "react";

interface CopyTextButtonProps {
  texts: string[];
}

export default function CopyTextButton({ texts }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  if (!texts || texts.length === 0) return null;

  const handleCopy = async () => {
    try {
      const combinedText = texts.join("\n");
      await navigator.clipboard.writeText(combinedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy texts", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm shrink-0"
      title="نسخ جميع المشاركات"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-emerald-500 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">تم النسخ!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span>نسخ المشاركات</span>
        </>
      )}
    </button>
  );
}
