"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cx } from "./ui";

/**
 * قسمٌ يُطوى ويُفتح — بندٌ من قائمةٍ طويلةٍ لا يُقرأ كلُّه مرّةً واحدة.
 *
 * **ومتى يُستعمل**: حين يكون العنوانُ وحدَه كافياً للمسح بالعين، والمحتوى
 * مطلوباً لواحدٍ منها لا لكلِّها — دليلُ الحوكمة مثلاً: عشرون مؤشّراً وفي
 * كلٍّ منها عشرون سؤالاً، فصفحةٌ مفتوحةٌ كلُّها أربعُ مئةِ فقرة. وما كان
 * محتواه سطرين فلا يُطوى: النقرةُ أغلى من السطرين.
 *
 * **ومصراعان**: بلا `open` يحفظ حالَه بنفسه، ومع `open` و`onToggle` يحفظه
 * المُنادي — وفهرسُ الصفحة يحتاج الثاني: نقرةٌ على عنوانٍ في الفهرس تفتح
 * قسمَه، والقسمُ لا يعرف بالفهرس شيئاً.
 *
 * **والمحتوى يبقى مرسوماً مطويّاً** (شبكةٌ من صفٍّ صفرِ الارتفاع) فتنساب
 * الحركة، و`inert` تمنع وصولَ لوحةِ المفاتيح إلى ما لا يُرى.
 */
export default function Accordion({
  title,
  meta,
  children,
  defaultOpen = false,
  open,
  onToggle,
  id,
}: {
  title: ReactNode;
  /** سطرٌ صغيرٌ في طرف الرأس — عددُ ما بالداخل مثلاً. */
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** مع `onToggle`: الحالُ عند المُنادي. وبدونهما: عند القسم نفسِه. */
  open?: boolean;
  onToggle?: () => void;
  id?: string;
}) {
  const [self, setSelf] = useState(defaultOpen);
  const isOpen = open ?? self;
  const panelId = useId();

  return (
    <div
      id={id}
      className={cx(
        "scroll-mt-24 overflow-hidden rounded-xl border bg-white transition-colors dark:bg-slate-900",
        isOpen
          ? "border-primary/30 dark:border-teal-400/25"
          : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
      )}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => (onToggle ? onToggle() : setSelf(!isOpen))}
        className="flex w-full items-center gap-3 p-4 text-right outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
      >
        <ChevronLeft
          aria-hidden
          className={cx(
            "size-4 shrink-0 text-slate-400 transition-transform duration-300",
            isOpen && "-rotate-90"
          )}
        />
        <span className="min-w-0 flex-1">{title}</span>
        {meta && <span className="shrink-0 text-meta text-slate-400">{meta}</span>}
      </button>

      <div
        id={panelId}
        inert={!isOpen}
        className="grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
