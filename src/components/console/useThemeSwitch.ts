"use client";

import { useCallback } from "react";
import { useTheme } from "next-themes";

/**
 * تبديلُ المظهر بدائرةٍ تتّسع من موضع الزرّ حتى تملأ الشاشة.
 *
 * **ولمَ لا تبديلٌ فوريّ**: قلبُ ألوان الصفحة كلِّها في إطارٍ واحدٍ وميضٌ
 * يُجفل العين، وفي الظلام أشدّ. والدائرةُ تُخبر أين وقع الفعلُ وتُمهّد البصر
 * لما يأتي، فيُقرأ التبديلُ قصداً لا عطلاً.
 *
 * **وتُنفَّذ بـ`startViewTransition`**: المتصفّحُ يلتقط صورةَ ما قبل وما بعد،
 * فنُحرّك قناعَ الجديدة فوق القديمة — ولا يُرسم شيءٌ مرّتين ولا تُعاد الشجرة.
 *
 * **وثلاثةُ مخارج تُبدّل بلا حركة**: متصفّحٌ لا يعرف الواجهة، ومن طلب تقليلَ
 * الحركة، وتبديلٌ يقع بلا موضعٍ معلوم (لوحةُ المفاتيح). والمخرجُ تبديلٌ
 * صحيحٌ لا تعطُّل.
 *
 * **والصنفُ يُكتب بيدٍ داخل الانتقال**: `setTheme` حالُ React تُطبَّق في أثرٍ
 * بعد الرسم، فتلتقط الواجهةُ الصورةَ القديمةَ مرّتين ولا يظهر شيء. فيُكتب
 * الصنفُ فوراً ليصحّ الالتقاط، ويُنادى `setTheme` ليُحفظ الاختيار ويُوافق
 * next-themes ما على الجذر.
 */

type Mode = "light" | "dark";

type SwitchOptions = {
  /** موضعُ النقرة — مركزُ الدائرة. وبلا موضعٍ لا حركة. */
  origin?: { x: number; y: number } | null;
  /** مدّةُ الاتّساع بالمللي. */
  duration?: number;
};

type DocumentWithTransition = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

export function useThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();

  const apply = useCallback(
    (mode: Mode) => {
      const root = document.documentElement;
      root.classList.toggle("dark", mode === "dark");
      // ولون النظام يُعلَن للمتصفّح: أشرطةُ التمرير وحقولُه تتبعه، ولولاه
      // بقيت بيضاءَ على صفحةٍ سوداءَ حتى يلحق next-themes.
      root.style.colorScheme = mode;
      setTheme(mode);
    },
    [setTheme]
  );

  /**
   * التبديلُ إلى المظهر الآخر — أو إلى `mode` بعينه.
   *
   * ويُمرَّر الحدثُ ليُعرف موضعُ الزرّ: `switchTheme(e)` من `onClick`.
   */
  const switchTheme = useCallback(
    (event?: { clientX: number; clientY: number } | null, options: SwitchOptions = {}) => {
      const next: Mode = resolvedTheme === "dark" ? "light" : "dark";
      const doc = document as DocumentWithTransition;

      const origin =
        options.origin ??
        (event && (event.clientX || event.clientY) ? { x: event.clientX, y: event.clientY } : null);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!doc.startViewTransition || reduced || !origin) {
        apply(next);
        return;
      }

      // ونصفُ القطر إلى أبعد زاوية: الدائرةُ تملأ الشاشةَ ولا تترك ركناً.
      const { x, y } = origin;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

      const transition = doc.startViewTransition(() => apply(next));

      void transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
          },
          {
            duration: options.duration ?? 520,
            // تبدأ سريعةً وتهدأ: الاتّساعُ الخطّيُّ يُقرأ آليّاً.
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    },
    [apply, resolvedTheme]
  );

  return { theme: resolvedTheme as Mode | undefined, switchTheme };
}
