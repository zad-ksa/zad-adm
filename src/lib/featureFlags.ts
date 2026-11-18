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
 * مبنيٌّ كاملاً ومنشورٌ مع الكود. وفُتح أوّلاً لمكين وحدَها حتى يُجرَّب
 * ببياناتٍ حيّة، فلمّا استقرّ فُتح **للجميع**.
 *
 * وثلاثةُ أحوالٍ لا اثنان:
 *   `"ALL"`  — مفتوحٌ لكلِّ جمعية، وهو الحال اليوم.
 *   `"NONE"` — مقفلٌ للجميع: تبويبُ البريد في البوابة «قريباً» بلا رابط،
 *              وصفحتُه تُعيد من يكتب عنوانها، وأفعالُه ترفض النداء.
 *   قائمةُ أسماء — مفتوحٌ للمسمّين وحدَهم، وهو ما يُرجَع إليه إن لزم.
 *
 * **والفتحُ ليس كافياً وحدَه**: بريدُ زاد إلى جمعيةٍ يصل مفوَّضي تلك الخدمة
 * فيها (`CharityMemberService`)، وجمعيةٌ بلا مفوَّضٍ يُرفض الإرسالُ إليها
 * برسالةٍ تسمّيها — ويُقال للمرسِل عددُ المستلمين قبل أن يكتب لا بعد أن
 * يضغط «إرسال». فالتفويضُ في بوّابة كلِّ جمعيةٍ هو ما يُكمل الفتح.
 *
 * والبريد الداخلي بين موظفي زاد **لا يتأثر**: هو قائمٌ قبل هذه الميزة.
 */
export const CHARITY_MAIL_SCOPE: "ALL" | "NONE" | readonly string[] = "ALL";

/**
 * هل فُتح البريد لأي جمعية؟ — لتبويبات زاد: الإرسال للجمعيات، وبانتظار
 * التعميد، وإعدادات البريد.
 */
/**
 * نسخةٌ مُوسَّعةٌ من الثابت، ووجودُها ليس زينة: TypeScript يُضيِّق ثابتاً
 * مُهيّأً بـ`"ALL"` إلى هذه القيمة وحدَها، فيصير الفرعان الآخران `never`
 * ويسقط البناء. والفرعان يبقيان حيَّين عن قصد ليكفيَ تبديلُ سطرٍ واحدٍ
 * أعلاه للإقفال أو للعودة إلى قائمةِ أسماء.
 */
const scope = CHARITY_MAIL_SCOPE as "ALL" | "NONE" | readonly string[];

export const CHARITY_MAIL_ENABLED =
  scope === "ALL" || (scope !== "NONE" && scope.length > 0);

/**
 * هل فُتح لهذه الجمعية بعينها؟
 *
 * والمقارنةُ بالاسم كما يُخزَّن — وهو مفتاحُ البوابة في الرابط وفي كل
 * استعلاماتها، فلا يُدخل معرّفاً لا يُقرأ في ملفِّ أعلام.
 */
export function isCharityMailOpen(charityName: string): boolean {
  if (scope === "ALL") return true;
  if (scope === "NONE") return false;
  return scope.includes(charityName.trim());
}

/**
 * تنمية الموارد المالية في بوّابة الجمعية — الجهاتُ المانحةُ ومجالاتُها
 * والمشاريعُ المقترحةُ والمنح.
 *
 * ومفتوحٌ لجمعيةٍ واحدةٍ أوّلاً حتى يُجرَّب ببياناتٍ حيّة، كما فُعل ببريد
 * الجمعيات: فالشاشةُ تعرض حساباتِ الدخول عند الجهات، وتجربتُها على جمعيةٍ
 * تجريبيّةٍ أهونُ من تجربتها على تسع.
 *
 * وثلاثةُ أحوالٍ كحال البريد: `"ALL"` للجميع، و`"NONE"` إقفالٌ تامّ، وقائمةُ
 * أسماءٍ للمسمَّين وحدَهم — وهو الحال اليوم.
 */
export const CHARITY_FUNDRAISING_SCOPE: "ALL" | "NONE" | readonly string[] = [
  "جمعية تجريبية للتطوير",
];

/** انظر `scope` أعلاه: نسخةٌ مُوسَّعةٌ حتى لا يُضيِّق TypeScript الثابتَ فيُميت فرعيه. */
const fundraisingScope = CHARITY_FUNDRAISING_SCOPE as "ALL" | "NONE" | readonly string[];

/** هل فُتحت تنميةُ الموارد لهذه الجمعية بعينها؟ — بالاسم كما يُخزَّن. */
export function isCharityFundraisingOpen(charityName: string): boolean {
  if (fundraisingScope === "ALL") return true;
  if (fundraisingScope === "NONE") return false;
  return fundraisingScope.includes(charityName.trim());
}
