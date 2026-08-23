import type { ReactNode } from "react";

/**
 * Scope shell for the HR section.
 *
 * Two jobs, both of them layout-level rather than per-page:
 *  - opens the `.hr-ui` design scope, so every token (type scale, 8pt steps,
 *    tinted elevation) resolves from one place;
 *  - caps the measure at 1120px. Full-bleed cards on a 27" display are the
 *    single thing that makes an admin screen look unfinished — content that
 *    wide stops being scannable long before it stops fitting.
 */
export default function HrLayout({ children }: { children: ReactNode }) {
  return (
    <div className="hr-ui" dir="rtl">
      <div className="mx-auto w-full max-w-[1120px] px-0 py-2 space-y-6">{children}</div>
    </div>
  );
}
