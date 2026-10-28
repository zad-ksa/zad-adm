import type { Prisma } from "@prisma/client";

/**
 * نطاق الجمعيات: ما يُعرض في قوائم «الجمعيات» وما يُستثنى منها.
 *
 * «شركة زاد» صفٌّ في جدول `Charity` بعلامة `isInternal`، لأن ما تحتاجه من
 * استراتيجيةٍ ومبادراتٍ ومنحٍ مربوطٌ كلّه بـ`charityId` إلزامياً — فصفٌّ حقيقيٌّ
 * يُشغّله بلا تعديل. والبديل (`charityId = null`، وكان في طلبات التصاميم حتى نُقلت) يكسر
 * القيود الفريدة، لأن `NULL ≠ NULL` في Postgres فيمرّ بُعدان برمزٍ واحد.
 *
 * وثمن ذلك أن الصفّ يظهر في كل قائمة جمعياتٍ ما لم يُستثنَ. فالاستثناء هنا في
 * موضعٍ واحد، لا شرطاً متناثراً في عشرين ملفاً يُنسى في القائمة الحادية
 * والعشرين.
 *
 * **القاعدة**: كلُّ استعلامٍ يعرض «الجمعيات» للمستخدم يأخذ
 * `where: EXTERNAL_CHARITIES`. ولا يُستثنى من ذلك إلا ما سُمّي في
 * `INTERNAL_VISIBLE_IN` أدناه، ولكلٍّ منها سببٌ مكتوب.
 */

/** الجمعيات المتعاقدة وحدها — بلا الكيانات الداخلية. */
export const EXTERNAL_CHARITIES = { isInternal: false } satisfies Prisma.CharityWhereInput;

/**
 * يضمّ شرط الاستثناء إلى شرطٍ قائم.
 *
 *     where: externalOnly(assigned === null ? undefined : { id: { in: assigned } })
 */
export function externalOnly(where?: Prisma.CharityWhereInput): Prisma.CharityWhereInput {
  return where ? { ...where, isInternal: false } : { isInternal: false };
}

/**
 * المواضع التي يظهر فيها الكيان الداخلي عن قصد:
 *
 * - **الشريط الجانبي** تحت «الاستراتيجية» و«تنمية الموارد المالية» وحدهما.
 *   وبقية الخدمات تُخفيه (انظر `INTERNAL_SERVICES`).
 * - **إسناد الجمعيات للموظفين** في إدارة الموظفين: لولاه لما أمكن إسناد زاد
 *   إلى صاحب الخدمة، ولما رآها أحدٌ غير `developer_mode`.
 * - **طلبات التصاميم** في صفحة الموظفين: طلبُ تصميمٍ لزاد نفسها كان يُميَّز
 *   بغياب الجمعية (`charityId = null`)، فنُقل إلى الكيان — ولا بدّ من اختياره
 *   في نموذج الرفع وفي مُرشِّح الجهة. وبوّابةُ الجمعية لا تراه: لا حساباتٍ له.
 * - **صفحات القسم نفسها** (`/main/strategy/[name]`، `/main/resource-development/[name]`)
 *   فهي تُستعلم بالاسم لا بقائمة.
 */
export const INTERNAL_VISIBLE_IN = [
  "sidebar:strategy",
  "sidebar:resource-development",
  "employees:charity-assignment",
  "design-requests:entity-picker",
  "section-pages",
] as const;

/** الخدمات التي يظهر الكيان الداخلي تحتها في الشريط الجانبي. */
export const INTERNAL_SERVICES = ["strategy", "resource-development"] as const;

export function showsInternal(serviceId: string) {
  return (INTERNAL_SERVICES as readonly string[]).includes(serviceId);
}
