/**
 * Features switched off in the running product.
 *
 * A flag here is a temporary hold, not a deletion: the code, the tables and the
 * data all stay put, and flipping the constant brings the feature back exactly
 * as it was. Deleting instead would mean rebuilding it, and losing whatever was
 * recorded in the meantime.
 */

/**
 * Attendance in the charity portal — recording, reports, and settings.
 *
 * Hidden at the client's request until they ask for it back. Employees and
 * account creation under Human Resources are deliberately unaffected: those are
 * a separate job that happens to live on the same screen.
 *
 * Turning it back on is this one line. Everything below reads it:
 *   - HrNav hides the three tabs
 *   - the three pages redirect to the employees page
 *   - the charity sidebar drops Human Resources for members whose only reason
 *     to open it was recording their own attendance
 *
 * The nightly attendance-close cron is left running on purpose: it settles days
 * that were already open before the hold, and has nothing to do while no new
 * attendance is being recorded.
 */
export const CHARITY_ATTENDANCE_ENABLED = false;

/**
 * بريد الجمعيات — مراسلة زاد للجمعيات وبالعكس، وتعميدها.
 *
 * مبنيٌّ كاملاً ومنشورٌ مع الكود، ومُقفَل حتى يُراد تشغيله: تبويب البريد في
 * البوابة يظهر «قريباً» بلا رابط، وصفحته تُعيد من يكتب عنوانها إلى البوابة،
 * وأفعاله على الخادم ترفض النداء. فلا يُفتح بالعنوان ولا بنداءٍ مباشر.
 *
 * والبريد الداخلي بين موظفي زاد **لا يتأثر**: هو قائمٌ قبل هذه الميزة، وما
 * يُقفَل هنا هو الطرف المتعلق بالجمعيات وحده — الإرسال إليها، وتبويبا التعميد
 * وإعداداته.
 *
 * وتشغيله سطرٌ واحد هنا. وجداوله وأعمدته مطبَّقة في قاعدة الإنتاج أصلاً، فلا
 * ينتظر التشغيلُ شيئاً بعدها.
 */
export const CHARITY_MAIL_ENABLED = false;
