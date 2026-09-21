/**
 * طلبُ نصٍّ من المستخدم — بديل `window.prompt()`.
 *
 * `prompt()` أسوأ من أختيه: نافذة نظامٍ بحقل إدخالٍ عاريةٍ من كل تنسيق، ولا
 * تقبل تسميةً للحقل ولا نصّاً مساعداً، وتُوقف الصفحة حتى تُغلق. وموضعها الوحيد
 * في المشروع رابطُ محرّر البريد.
 *
 * ويعود هنا وعداً بالنصّ — أو `null` عند الإلغاء، كسابقه بحرفه:
 *
 *     const input = await promptAction({ title: "رابط الصفحة", defaultValue: previous });
 *     if (input === null) return;
 */

export type PromptOptions = {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
};

export type PromptRequest = PromptOptions & { id: number; resolve: (value: string | null) => void };

type Listener = (request: PromptRequest) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function subscribeToPrompts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** بلا مُضيفٍ مركَّب يعيد `null`: إلغاءٌ صامت أسلم من قيمةٍ لم يكتبها أحد. */
export function promptAction(options: PromptOptions): Promise<string | null> {
  if (listeners.size === 0) return Promise.resolve(null);

  return new Promise<string | null>((resolve) => {
    const request: PromptRequest = { ...options, id: ++counter, resolve };
    for (const listener of listeners) listener(request);
  });
}
