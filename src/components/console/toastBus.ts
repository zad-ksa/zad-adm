import type { ToastTone } from "./Toast";

/**
 * نداءٌ عالميٌّ للتنبيه — بديل `alert()` بحرفه.
 *
 * `alert()` كان يُنادى من أربعةٍ وثلاثين موضعاً: من معالجات أحداث، ومن دوالّ
 * مساعدة خارج المكوّنات (`meetingPrint.ts`)، ومن داخل `catch`. ولو رُبط بديله
 * بحالة كل ملف لاحتاج كل واحدٍ منها حالةً وعرضاً ومُمرِّراً للدوالّ التي لا
 * ترى React أصلاً.
 *
 * فالبديل بنفس شكل النداء: `notify("error", "…")` من أي مكان، ومُضيفٌ واحد
 * مركَّبٌ في الجذر يعرضه. وهو الفرق بين استبدالٍ في سطر، وإعادة كتابة ملف.
 *
 * ولا يُستعمل حيث تكفي الحالة المحلية: رسالةٌ تخصّ نموذجاً مفتوحاً مكانها ذلك
 * النموذج، لا شريطٌ في زاوية الشاشة.
 */

export type ToastRequest = { tone: ToastTone; text: string; id: number };

type Listener = (request: ToastRequest) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function subscribeToToasts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * يُظهر تنبيهاً من أي مكان — مكوّناً كان أو دالّةً عادية.
 *
 * وبلا مُضيفٍ مركَّب لا يفعل شيئاً ولا يرمي خطأً: رسالةٌ لم تظهر أهونُ من
 * صفحةٍ تنهار لأن التنبيه لم يجد من يعرضه.
 */
export function notify(tone: ToastTone, text: string) {
  if (!text) return;
  const request = { tone, text, id: ++counter };
  for (const listener of listeners) listener(request);
}
