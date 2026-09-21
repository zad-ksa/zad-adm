/**
 * تأكيدٌ يُنتظر جوابه — بديل `confirm()` بحرفه.
 *
 * `confirm()` الأصلي متزامن: يوقف الصفحة ويعيد `true/false` في السطر نفسه،
 * فيُكتب هكذا:
 *
 *     if (!confirm("حذف هذا الطلب؟")) return;
 *     await deleteRequest(id);
 *
 * والحوار المصمَّم غير متزامن، فلو رُبط بحالةٍ في كل ملف لاحتاج كل موضعٍ حالةً
 * تحفظ الفعل المؤجَّل ثم تُنفّذه عند التأكيد — اثنان وعشرون موضعاً، كلٌّ منها
 * إعادةُ كتابةٍ لا استبدال.
 *
 * فيعود هنا وعداً، ويبقى السطر سطراً:
 *
 *     if (!(await confirmAction({ title: "حذف هذا الطلب؟" }))) return;
 *
 * والفرق الوحيد `await` — وهو فرقٌ حقيقيٌّ لا تجميل: الصفحة تبقى حيّة أثناء
 * السؤال بدل أن تتجمّد، ويبقى الحوار بهوية الموقع لا بهوية النظام.
 */

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  variant?: "soft" | "console";
};

export type ConfirmRequest = ConfirmOptions & { id: number; resolve: (ok: boolean) => void };

type Listener = (request: ConfirmRequest) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function subscribeToConfirms(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * يسأل المستخدم ويعيد جوابه.
 *
 * وبلا مُضيفٍ مركَّب يعيد `false`: فعلٌ خطِرٌ لم يُسأل عنه أحدٌ لا يُنفَّذ.
 * والعكس — افتراض الموافقة — يحذف بيانات مستخدمٍ لم يُسأل.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (listeners.size === 0) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const request: ConfirmRequest = { ...options, id: ++counter, resolve };
    for (const listener of listeners) listener(request);
  });
}
