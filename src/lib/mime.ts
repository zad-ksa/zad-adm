/**
 * نوعُ المحتوى من امتدادِ الملفّ.
 *
 * ولزم مع باك بليز ولم يلزم مع Cloudinary، والفرقُ جوهريٌّ لا تفصيل:
 * Cloudinary تستنبط النوعَ من البايتات وتخدم به، أمّا S3 — وباك بليز على
 * واجهتها — **فتحفظ النوعَ الذي أُرسل مع `PUT` وتُعيده حرفاً إلى الأبد**. فمن
 * رفع بلا نوعٍ خُدم ملفُّه `application/octet-stream`: صورةٌ لا تظهر في بطاقةٍ
 * بل تُنزَّل، وpdf لا يُقرأ في تبويب. ولا يُصلح ذلك بعد الرفع إلّا بنسخِ
 * الكائن كلِّه.
 *
 * ويُشتقُّ من **الامتداد** لا من `File.type` الذي يُرسله المتصفِّح، لسببين:
 * ذاك يأتي فارغاً لكثيرٍ مما نقبله (psd وindd وai وrar)، وهو من جهة العميل
 * فيُقال فيه ما شيء.
 *
 * **وليس في الخريطة `text/html` ولا `image/svg+xml` ولا `application/xhtml+xml`
 * بحال.** وهذا شرطٌ لا سهو: ملفٌّ يُخدَم من نطاقنا بأحدِ هذه الأنواع صفحةٌ
 * تعمل لا مرفقٌ يُعرض، ورافعُ مرفقِ الاستبيان **مجهولٌ بلا حساب**. ومن أراد
 * إضافةَ نوعٍ فليسأل: هل يُنفَّذ في متصفِّح؟
 *
 * وتُقرأ هذه الخريطةُ في موضعين — هنا وفي بوّابةِ كلاود فلير — ويحرسُ
 * تطابقَهما `workerMime.test.ts`.
 */

/** ما يُخدَم به ما لا يُعرف امتدادُه: تنزيلٌ خامٌ لا تفسيرَ فيه. */
export const INERT_CONTENT_TYPE = "application/octet-stream";

/**
 * الامتدادُ ← نوعُ المحتوى.
 *
 * تُغطّي `ALLOWED_EXTENSIONS` كلَّها، وتزيد `heic`/`heif` لشواهدِ المهامّ —
 * فتلك تُقبل هناك ولا تُقبل في بقيّة المواضع.
 */
export const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  // صور
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",

  // مستندات
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // نصٌّ مسطَّح: مُحدَّدُ المحرف صراحةً، وإلّا قرأته المتصفِّحاتُ بـlatin-1
  // فظهر العربيُّ طلاسمَ.
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",

  // ملفّاتُ التصميم
  psd: "image/vnd.adobe.photoshop",
  // الإليستريتور يُقبل بوصفه postscript لا pdf: كثيرٌ منه pdf في متنه، لكنّ
  // تسميتَه pdf تجعل المتصفِّحَ يحاول عرضَه ويفشل، والتنزيلُ هو المقصود.
  ai: "application/postscript",
  eps: "application/postscript",
  indd: "application/x-indesign",

  // حِزَم
  zip: "application/zip",
  rar: "application/vnd.rar",

  // وسائط
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

/**
 * نوعُ المحتوى لاسمِ ملفٍّ أو مفتاحٍ كامل.
 *
 * ويُقبل المفتاحُ بمجلَّداته: يُقرأ آخرُ مقطعٍ ثمّ آخرُ نقطةٍ فيه، فلا تُخدع
 * الدالّةُ بنقطةٍ في اسمِ مجلَّد.
 */
export function contentTypeFor(nameOrKey: string): string {
  const base = nameOrKey.slice(nameOrKey.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return INERT_CONTENT_TYPE;
  const ext = base.slice(dot + 1).toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? INERT_CONTENT_TYPE;
}
