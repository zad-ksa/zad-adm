/**
 * كلُّ موضعٍ في القاعدة يحفظ رابطَ ملفّ.
 *
 * وقائمةٌ واحدةٌ مشتركةٌ لا نسخةٌ في كلِّ سكربت: السكربتُ الذي ينسخ والسكربتُ
 * الذي يُحصي يجب أن يَريا الأعمدةَ نفسَها. فلو زاد أحدُهما عموداً ونسي الآخر،
 * قال المُحصي «لم يبق شيءٌ على Cloudinary» عن عمودٍ لم ينظر فيه أصلاً — وهو
 * أسوأُ من خطأٍ لأنّه يُطمئن.
 *
 * و`json: true` يعني أنّ العمود يحمل شجرةً تُمشى مشياً عامّاً: الأشكالُ ثلاثةٌ
 * مختلفة — مصفوفةُ كائناتٍ في `Request`، وكائنُ مصفوفاتٍ في الاستبانات
 * المخصّصة، وتعشيشٌ عميقٌ في إعداد الواجهة — فمعرفةُ الشكل سلفاً تُخطئ واحداً
 * منها حتماً.
 *
 * وأربعةٌ من هذه الأعمدة لا تحفظ `publicId` بحال (`MailAttachment.fileUrl`
 * و`Charity.logoUrl` و`Employee.avatarUrl` و`CustomSurveyResponse.attachments`)،
 * ولذلك يُشتقُّ المزوّدُ والمفتاحُ من الرابط لا من عمودٍ آخر.
 */

export type FileSource = {
  table: string;
  /** عمودُ المُعرِّف، لأنّ `GlobalSetting` مفتاحُها `key` لا `id`. */
  id: string;
  column: string;
  /** يُمشى مشياً عامّاً بـ`collectStrings` لا يُقرأ نصّاً مسطَّحاً. */
  json?: true;
};

export const FILE_SOURCES: readonly FileSource[] = [
  { table: "Request", id: "id", column: "attachments", json: true },
  { table: "CustomSurveyResponse", id: "id", column: "attachments", json: true },
  { table: "GlobalSetting", id: "key", column: "value", json: true },
  { table: "DesignRequestAttachment", id: "id", column: "fileUrl" },
  { table: "KnowledgeNode", id: "id", column: "fileUrl" },
  { table: "MailAttachment", id: "id", column: "fileUrl" },
  { table: "Task", id: "id", column: "proofUrl" },
  { table: "Task", id: "id", column: "attachmentUrl" },
  { table: "Achievement", id: "id", column: "proofUrl" },
  { table: "GovernanceProgress", id: "id", column: "proofUrl" },
  { table: "Initiative", id: "id", column: "marketingUrl" },
  { table: "Charity", id: "id", column: "logoUrl" },
  { table: "Employee", id: "id", column: "avatarUrl" },
];

/** `Table.column` — للطبع وللتحقُّق من ألّا يتكرّر موضع. */
export const sourceLabel = (source: FileSource): string => `${source.table}.${source.column}`;
