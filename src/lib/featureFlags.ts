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
 * مبنيٌّ كاملاً ومنشورٌ مع الكود، ومفتوحٌ **بالاسم لجمعيةٍ جمعية** لا دفعةً
 * واحدة: الميزةُ لم تُجرَّب ببياناتٍ حيّة بعد، وفتحُها على ثماني جمعياتٍ معاً
 * يجعل أولَ خطأٍ خطأً في ثماني بوّابات. فتُفتح لواحدة، فإذا استقرّت أُضيف
 * اسمٌ إلى القائمة.
 *
 * وشرطُ الفتح أن يكون في الجمعية مفوَّضون بالخدمات (`CharityMemberService`):
 * بريدُ زاد إلى جمعيةٍ يصل مفوَّضي تلك الخدمة فيها، وجمعيةٌ بلا مفوَّضٍ يُرفض
 * الإرسالُ إليها برسالةٍ تسمّيها. ومكين فيها عشرةٌ مفوَّضون.
 *
 * **وقائمةٌ فارغةٌ تعني مقفلاً للجميع** كما كان: تبويب البريد في البوابة يظهر
 * «قريباً» بلا رابط، وصفحته تُعيد من يكتب عنوانها، وأفعاله ترفض النداء. وكذلك
 * جمعيةٌ ليست في القائمة — فالقفلُ صار لكل جمعيةٍ على حدة، لا علَماً واحداً.
 *
 * والبريد الداخلي بين موظفي زاد **لا يتأثر**: هو قائمٌ قبل هذه الميزة.
 */
export const CHARITY_MAIL_CHARITIES: readonly string[] = ["مكين التعليمية"];

/**
 * هل فُتح البريد لأي جمعية؟ — لتبويبات زاد: الإرسال للجمعيات، وبانتظار
 * التعميد، وإعدادات البريد.
 */
export const CHARITY_MAIL_ENABLED = CHARITY_MAIL_CHARITIES.length > 0;

/**
 * هل فُتح لهذه الجمعية بعينها؟
 *
 * والمقارنةُ بالاسم كما يُخزَّن — وهو مفتاحُ البوابة في الرابط وفي كل
 * استعلاماتها، فلا يُدخل معرّفاً لا يُقرأ في ملفِّ أعلام.
 */
export function isCharityMailOpen(charityName: string): boolean {
  return CHARITY_MAIL_CHARITIES.includes(charityName.trim());
}
