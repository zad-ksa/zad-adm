import type { ReactNode } from "react";

/**
 * Scope shell for the HR section.
 *
 * وعملُه واحد: حدُّ العرض عند ١١٢٠ بكسل. وبطاقةٌ تملأ شاشةَ ٢٧ بوصةً عرضاً
 * تكفّ عن أن تُمسح بالعين قبل أن تكفّ عن أن تتّسع.
 *
 * **وكان يفتح نطاق `.hr-ui`**: سلّمُ خطٍّ ثانٍ وشبكةُ مسافاتٍ وظلالٌ ملوّنة —
 * نظامُ تصميمٍ كاملٌ داخل نظام. وذهب إلى عُدّة اللوحة.
 */
export default function HrLayout({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl">
      <div className="mx-auto w-full max-w-[1120px] px-0 py-2 space-y-6">{children}</div>
    </div>
  );
}
