/**
 * نسخةُ البوّابة من خريطة الأنواع — ونسخةٌ لا استيراد.
 *
 * والعاملُ يُنشر بـwrangler من مجلَّده وحدَه، فاستيرادُه من `src/lib` يربط
 * نشرتَه بشجرةِ مصادرِ الموقع. والنسخةُ ثمنُها التكرار، وتُدفع كما دُفعت في
 * `sigv4.mjs`: **اختبارٌ يُسقط البناءَ على أيِّ افتراق** — `workerMime.test.ts`
 * يُقارن الخريطتين مدخلاً مدخلاً، فلا تُعدَّل إحداهما وتُنسى الأخرى.
 *
 * ولمَ يحتاجها العاملُ أصلاً وقد كُتب النوعُ عند الرفع؟ لأنّ نوعَ المحتوى
 * **ليس في التوقيع**: نحن نُوقِّع `host` وحدَه، فمن حمل رابطَ رفعٍ مُوقَّعاً
 * أرسل معه أيَّ نوعٍ شاء. فالبوّابةُ تُصلح النوعَ عند القراءة من امتدادِ
 * المفتاح، وهو ما لا يُغيَّر بعد التوقيع: المفتاحُ في المسار، والمسارُ
 * مُوقَّع.
 */

export const INERT_CONTENT_TYPE = "application/octet-stream";

export const MIME_BY_EXTENSION = {
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
  wav: "audio/wav",};

/**
 * نوعُ المحتوى لمفتاح، أو `null` إن لم يُعرف امتدادُه.
 *
 * و`null` لا `INERT_CONTENT_TYPE`: البوّابةُ تُفرِّق بينهما — ما عُرف يُفرض،
 * وما لم يُعرف يُترك على ما ردّته باك بليز. فلو رُدَّ الخامُّ لكلِّ مجهولٍ
 * لأُفسد كلُّ ملفٍّ قديمٍ امتدادُه خارجَ الخريطة.
 */
export function contentTypeForKey(key) {
  const base = key.slice(key.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return null;
  const ext = base.slice(dot + 1).toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? null;
}
