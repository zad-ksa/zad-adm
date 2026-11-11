"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * تفضيلٌ صغيرٌ يبقى في المتصفّح: هيئةُ عرضٍ، أو مجلّدٌ مفتوح.
 *
 * ويُقرأ بـ`useSyncExternalStore` لا بحالةٍ تُضبط في `useEffect`: الخادمُ لا
 * `localStorage` له، فالقيمةُ المخزَّنةُ لقطةٌ تعلم React أنّها تختلف بين
 * الخادم والمتصفّح. وضبطُها من أثرٍ يرسم الافتراضيَّ أوّلاً ثمّ يقفز — وهو ما
 * تُشير إليه قاعدةُ `react-hooks/set-state-in-effect`.
 *
 * ونافذةٌ خاصّةٌ أو تخزينٌ محجوبٌ يرمي عند القراءة لا عند الكتابة وحدها،
 * فكلاهما في `try`. والقيمةُ غيرُ المعروفة تُهمَل: مفتاحٌ قديمٌ لا يُعطّل شاشة.
 *
 * وكانت مكتوبةً في «مكتبة النماذج» وحدَها، فنُقلت إلى العُدّة حين احتاجتها
 * الخطّةُ الإعلاميّة — عنصرٌ واحدٌ له تطبيقٌ واحد.
 */
export function readStored<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function useStoredChoice<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[]
): [T, (value: T) => void] {
  const [override, setOverride] = useState<T | null>(null);

  const stored = useSyncExternalStore(
    () => () => {}, // لا شيءَ خارج المكوّن يُغيّره
    () => readStored(key, fallback, allowed),
    () => fallback // رسمُ الخادم
  );

  const set = (value: T) => {
    setOverride(value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // التخزينُ قد يكون محجوباً، والاختيارُ يبقى سارياً في هذه الجلسة.
    }
  };

  return [override ?? stored, set];
}
