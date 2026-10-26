"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { cx } from "./ui";

/**
 * أدوات عرض الجداول الواسعة: ملء الشاشة والتكبير.
 *
 * جداول الاستراتيجية أربعة عشر عموداً وأكثر، فلا تُقرأ في عرض الصفحة. وكان
 * مقياس الأداء وحده يملك هذين الزرّين بصنفٍ مكتوبٍ في مكانه، فنُقلا هنا كي
 * لا يختلف جدولان في طبقةٍ ولا في حدّ تكبير.
 *
 * وطبقةُ ملء الشاشة ٩٠ عن قصد: فوق هيكل الموقع (٥٠) ومخطط جانت (٨٠)، وتحت
 * النوافذ (١٠٠) والتنبيه (١١٠) وقائمة Select (١٢٠). وكانت في مقياس الأداء
 * ٩٩٩٩، فكانت قائمتا السنة والربع تُرسمان في بوّابةٍ تحتها فلا تظهران.
 */
export const FULLSCREEN_SHELL =
  "fixed inset-0 z-[90] flex w-screen h-screen flex-col overflow-hidden bg-slate-50 p-6 transition-colors sm:p-8 dark:bg-slate-900";

export const ZOOM_MIN = 70;
export const ZOOM_MAX = 130;
const ZOOM_STEP = 10;

export function useTableView() {
  const [zoom, setZoom] = useState(100);
  const [isFullScreen, setFullScreen] = useState(false);

  // Escape يخرج من ملء الشاشة. ولا يُسجَّل المستمع إلا حين يكون مفتوحاً، فلا
  // يسرق Escape من نافذةٍ مفتوحةٍ فوقه.
  useEffect(() => {
    if (!isFullScreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullScreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullScreen]);

  return {
    zoom,
    setZoom,
    isFullScreen,
    setFullScreen,
    /** صنف الغلاف الخارجي للصفحة أو القسم. */
    shellClass: isFullScreen ? FULLSCREEN_SHELL : "",
    /** صنف إطار الجدول: يمتدّ ويمرّر رأسياً في ملء الشاشة. */
    frameClass: isFullScreen ? "flex-1 overflow-auto" : "overflow-x-auto",
  };
}

export function TableViewControls({
  zoom,
  setZoom,
  isFullScreen,
  setFullScreen,
}: {
  zoom: number;
  setZoom: (next: number) => void;
  isFullScreen: boolean;
  setFullScreen: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setZoom(Math.max(ZOOM_MIN, zoom - ZOOM_STEP))}
          disabled={zoom <= ZOOM_MIN}
          title="تصغير الجدول"
          aria-label="تصغير الجدول"
          className={zoomButton}
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(100)}
          title="إعادة الضبط إلى ١٠٠٪"
          className="min-w-[45px] select-none px-2 text-center text-caption font-semibold text-slate-500 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-teal-300"
        >
          {zoom}%
        </button>
        <button
          type="button"
          onClick={() => setZoom(Math.min(ZOOM_MAX, zoom + ZOOM_STEP))}
          disabled={zoom >= ZOOM_MAX}
          title="تكبير الجدول"
          aria-label="تكبير الجدول"
          className={zoomButton}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setFullScreen(!isFullScreen)}
        title={isFullScreen ? "خروج من ملء الشاشة (Esc)" : "ملء الشاشة"}
        aria-label={isFullScreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
        className="grid size-10 place-items-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600 transition-colors outline-none hover:bg-slate-200/60 focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-700"
      >
        {isFullScreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </button>
    </div>
  );
}

const zoomButton = cx(
  "grid size-8 place-items-center rounded-lg font-semibold text-slate-600 transition-all outline-none select-none",
  "hover:bg-slate-200/60 active:scale-[0.9] disabled:cursor-not-allowed disabled:opacity-40",
  "focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-700"
);
