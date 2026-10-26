"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * سطح القسم.
 *
 * صفحات المحتوى (نتائج استبيان، جدول متابعة، تقرير) تجلس على لوحٍ أبيض واحد.
 * أما صفحات المربّعات — الجامعة وأقسامها الأربعة — فبطاقاتُها هي الأسطح، ولوحٌ
 * أبيض حولها بطاقةٌ داخل بطاقة. فالسطح يتبع نوع الصفحة لا مكانها في الشجرة.
 */
const BARE = new Set(["", "analysis", "direction", "objectives", "operational"]);

export default function StrategySurface({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // ما بعد /main/strategy/[name] — والرابط قد يصل مُرمَّزاً أو لا.
  const tail = decodeURIComponent(pathname).split("/").slice(4).join("/");

  if (BARE.has(tail)) return <div className="flex-1">{children}</div>;

  return (
    <div className="flex-1 rounded-b-xl rounded-tl-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors md:p-8 dark:border-slate-700 dark:bg-slate-800 print:m-0 print:border-none print:p-0 print:shadow-none">
      {children}
    </div>
  );
}
