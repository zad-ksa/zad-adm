"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * تلميحٌ مثبَّتٌ على شريطٍ في مخطّط زمني.
 *
 * موضعه يُقرأ مرّةً من صندوق الشريط حين يصل المؤشّر، لا من المؤشّر — فيثبت
 * بينما تتحرّك الفأرة على الشريط، وكأنّه خرج من الشريط نفسه.
 *
 * و`left` فيزيائيٌّ لا `inset-inline-start`: الصندوق يأتي من
 * `getBoundingClientRect` وهو يقيس من الحافة اليسرى، فإطعامُه لخاصيّةٍ منطقية
 * في صفحةٍ عربية يعكسه — شريطٌ في اليمين يظهر تلميحه في اليسار.
 *
 * وقرب حافة الشاشة ينزلق إلى الداخل ليبقى كاملاً، ويزيح سهمُه في الاتجاه
 * المقابل فيبقى واقعاً على الشريط. وبلا متّسعٍ فوقه (شريطٌ في الصفوف الأولى)
 * يُفتح أسفله.
 *
 * وهذا السلوك بُني أولاً في مخطّط التصاميم (`DesignGanttModal`)، ونُقل هنا
 * ليشترك فيه كل مخطّط — فلا يُعاد حلُّ المسألة في كل مرّة.
 */

const TOOLTIP_HALF = 130; // نصف max-w-[260px]
export const TOOLTIP_GAP = 8;
const TOOLTIP_ROOM = 96; // ارتفاع التلميح تقريباً مع فجوته

export type BarAnchor = {
  center: number;
  top: number;
  bottom: number;
  below: boolean;
  arrowShift: number;
};

/** يُقرأ الصندوق مرّةً عند وصول المؤشّر. */
export function anchorToBar(bar: HTMLElement): BarAnchor {
  const r = bar.getBoundingClientRect();
  const barCenter = r.left + r.width / 2;
  const margin = TOOLTIP_HALF + 8;
  const center = Math.min(Math.max(barCenter, margin), window.innerWidth - margin);
  return {
    center,
    top: r.top,
    bottom: r.bottom,
    below: r.top < TOOLTIP_ROOM,
    arrowShift: barCenter - center,
  };
}

/**
 * يُخفي التلميح عند التمرير أو تغيير المقاس: الموضع مقروءٌ مرّةً، فتحريكُ
 * الصفحة يتركه معلّقاً بعيداً عن شريطه.
 */
export function useDismissOnScroll(active: boolean, dismiss: () => void) {
  useEffect(() => {
    if (!active) return;
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [active, dismiss]);
}

export function BarTooltip({ anchor, children }: { anchor: BarAnchor; children: ReactNode }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[95]"
      style={{
        left: anchor.center,
        top: anchor.below ? anchor.bottom + TOOLTIP_GAP : anchor.top - TOOLTIP_GAP,
        transform: anchor.below ? "translateX(-50%)" : "translate(-50%, -100%)",
      }}
    >
      <div className="relative w-max max-w-[260px] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg motion-safe:animate-[zad-fade-in_120ms_ease-out] dark:border-slate-700 dark:bg-slate-900">
        <span
          aria-hidden
          className={`absolute size-2.5 rotate-45 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${
            anchor.below ? "-top-[6px] border-l border-t" : "-bottom-[6px] border-b border-r"
          }`}
          style={{ left: `calc(50% + ${anchor.arrowShift}px - 5px)` }}
        />
        {children}
      </div>
    </div>
  );
}

/** حالةٌ جاهزة: ما هو مُشار إليه، وموضعه. */
export function useBarTooltip<T>() {
  const [hovered, setHovered] = useState<{ item: T; anchor: BarAnchor } | null>(null);
  const dismiss = () => setHovered(null);
  useDismissOnScroll(hovered !== null, dismiss);
  return {
    hovered,
    show: (item: T, bar: HTMLElement) => setHovered({ item, anchor: anchorToBar(bar) }),
    dismiss,
  };
}
