/**
 * قواعدُ نصِّ إشعار البريد واختيارِ من يُشعَر — خالصةٌ بلا قاعدةِ بياناتٍ ولا
 * بيئة، فتُختبر.
 *
 * وفُصلت عن `mailNotify.ts` لأنّ ذاك يقرأ `@/lib/db`، فلا يُحمَّل في
 * `node --test` بلا بيئةٍ ولا وصلة. وهو الفصلُ نفسُه بين `storage.ts`
 * و`b2.ts` في عدّة التخزين.
 */

/**
 * مُعرِّفاتُ موظَّفي زاد من صفوف الاستلام: بلا تكرارٍ، وبلا الكاتب.
 *
 * **واستثناءُ الكاتب شرطٌ لا تحسين.** فالمحادثةُ للفريقين، والكاتبُ من فريقه،
 * فلولا استثناؤه لوصله إشعارٌ عن رسالةٍ كتبها هو — ولو مرّةً واحدةً كفت لأن
 * يُهمَل الجُرسُ كلُّه. و`serviceConversationRecipients` تستثنيه من صفوفها
 * أصلاً، لكنّ مساراتٍ أخرى تبني صفوفَها بيدها فيُكرَّر الشرطُ هنا: الاستثناءُ
 * في موضعٍ واحدٍ أرخصُ من تتبُّع كلِّ مسارٍ يُنشئ صفّاً.
 *
 * وصفوفُ أعضاء الجمعيات تُسقَط: `AppNotification` لموظَّفي زاد وحدَهم،
 * ولأعضاء الجمعيات عدّادُهم في تخطيط البوّابة.
 */
export function mailNotifyTargets(
  recipients: readonly { employeeId?: string; charityUserId?: string }[],
  excludeEmployeeId?: string | null
): string[] {
  const ids = new Set<string>();
  for (const row of recipients) {
    if (!row.employeeId) continue;
    if (excludeEmployeeId && row.employeeId === excludeEmployeeId) continue;
    ids.add(row.employeeId);
  }
  return [...ids];
}

/** أطولُ ما يُعرض من موضوعٍ في الجُرس. */
export const MAIL_SUBJECT_LIMIT = 80;

/**
 * الموضوعُ في سطرٍ لا يطول، وبديلٌ له إن كان فارغاً.
 *
 * والفارغُ يُسمّى ولا يُترك: رسالةٌ بلا موضوعٍ تُرسَل فعلاً، وإشعارٌ نصُّه
 * «فلان — » يُقرأ عطباً لا رسالة.
 */
export function mailNotifySubject(subject: string | null | undefined): string {
  const clean = (subject ?? "").trim() || "(بلا موضوع)";
  // علامةُ القطع تحلُّ محلَّ حرفٍ ولا تُضاف فوق الحدّ، فالناتجُ لا يتجاوز
  // `MAIL_SUBJECT_LIMIT` بحال — وهو ما يُعتمد عليه في تنسيق سطر الجُرس.
  return clean.length > MAIL_SUBJECT_LIMIT
    ? `${clean.slice(0, MAIL_SUBJECT_LIMIT - 1)}…`
    : clean;
}
