/**
 * أين يسكن الملفُّ، وكيف يُعرف ذلك من رابطه.
 *
 * دوالٌّ خالصةٌ لا تلمس شبكةً ولا بيئة: المزوّدُ يُعرف من الرابط المحفوظ في
 * الصفّ، لا من عمودٍ جديدٍ يُضاف. وهذا متعمَّد — ٤٣٧ صفّاً قائمةً تحمل روابطَ
 * Cloudinary، وأربعةُ أعمدةٍ منها لا تحفظ مفتاحاً أصلاً، فعمودُ مزوّدٍ جديدٌ
 * يعني ترحيلاً قبل أن يُقرأ أولُ ملفّ.
 *
 * وما دام المزوّدان يتعايشان، فكلُّ حذفٍ يمرّ من هنا: من لم يسأل عن المزوّد
 * حذف الصفَّ وترك الملفَّ في الطرف الآخر إلى الأبد، بلا شكوى تُسمع.
 */

export type StorageProvider = "cloudinary" | "b2";

/** مضيفُ Cloudinary الذي يُخدَم منه كلُّ ما رُفع قبل النقل. */
export const CLOUDINARY_HOST = "res.cloudinary.com";

/**
 * المزوّدُ الذي يسكنه هذا الرابط.
 *
 * و`null` لرابطٍ لا يخصّ أيّاً منهما — رابطٌ خارجيٌّ لُصق بيدٍ مثلاً — فلا
 * يُحذف ولا يُرحَّل، ويُحصى في تقرير الترحيل حتى يُنظر فيه.
 */
export function providerOf(url: string, publicBase?: string | null): StorageProvider | null {
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return null;
  }
  if (host === CLOUDINARY_HOST) return "cloudinary";
  if (publicBase) {
    try {
      if (host === new URL(publicBase).host) return "b2";
    } catch {
      /* عنوانٌ عامٌّ معطوب: يُعامل كأنْ لا عنوان، ولا يُسقط القراءة. */
    }
  }
  return null;
}

export type CloudinaryRef = {
  publicId: string;
  resourceType: "image" | "video" | "raw";
};

/**
 * استخراجُ مُعرِّف Cloudinary من رابطه.
 *
 * ويلزم لأنّ `MailAttachment` و`Charity.logoUrl` و`Employee.avatarUrl`
 * و`CustomSurveyResponse.attachments` تحفظ الرابطَ وحدَه بلا `publicId`.
 * فبلا هذه الدالّة لا تُرحَّل تلك الصفوفُ ولا تُحذف ملفّاتُها.
 *
 * والامتدادُ يُحذف للصور والفيديو ويُترك للخام: المُوقِّع يضع الامتدادَ داخل
 * `public_id` للخام عمداً، وإلّا خدمته Cloudinary بنوعِ محتوىً خاطئ.
 */
export function cloudinaryRefFromUrl(url: string): CloudinaryRef | null {
  let path: string;
  try {
    const parsed = new URL(url);
    if (parsed.host !== CLOUDINARY_HOST) return null;
    path = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }

  const match = path.match(/^\/[^/]+\/(image|video|raw)\/upload\/(.+)$/);
  if (!match) return null;

  const resourceType = match[1] as CloudinaryRef["resourceType"];
  // ما بعد `upload/` مقطعُ نسخةٍ `v123` ثمّ المجلَّدُ ثمّ المُعرِّف. ولا يُسقط
  // إلّا مقطعُ النسخة: جُرِّب إسقاطُ «مقاطع التحويل» بنمطٍ عامٍّ فأكل
  // `zad_design_requests` نفسَه — `zad` ثمّ `_` ثمّ بقيّةٌ — فضاع المجلَّد من
  // ١١٧ صفّاً. ولا تحويلاتِ في روابط هذا الموقع أصلاً، فالنمطُ العامُّ خطرٌ بلا ثمن.
  const segments = match[2].split("/").filter(Boolean);
  if (segments.length > 1 && /^v\d+$/.test(segments[0])) segments.shift();

  const joined = segments.join("/");
  if (!joined) return null;
  if (resourceType === "raw") return { publicId: joined, resourceType };

  const dot = joined.lastIndexOf(".");
  const slash = joined.lastIndexOf("/");
  return { publicId: dot > slash ? joined.slice(0, dot) : joined, resourceType };
}

/** الامتدادُ من اسم ملفٍّ أو مفتاح، بحروفٍ صغيرةٍ وبلا نقطة. */
export function extensionOf(name: string): string {
  const base = name.slice(name.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/**
 * مفتاحُ ملفٍّ جديدٍ في باك بليز.
 *
 * المستودعُ عامٌّ بقرارٍ صريح — وهو نموذجُ الأمان القائمُ اليوم حرفاً، إذ
 * روابطُ Cloudinary الحاليّة عامّةٌ كذلك. فالحمايةُ أن يكون المفتاحُ غيرَ
 * قابلٍ للتخمين: `rand` ستّةَ عشرَ حرفاً عشوائيّاً تُولَّد من `crypto`، لا
 * الوقتُ وحدَه — الوقتُ يُخمَّن، وملفّان في الثانية نفسِها يتصادمان.
 *
 * ويبقى اسمُ المجلَّد كما هو ليُعرف الملفُّ لأيِّ ميزةٍ هو من رابطه وحدَه.
 */
export function storageKeyOf(folder: string, fileName: string, rand: string): string {
  const ext = extensionOf(fileName);
  const base = fileName.slice(fileName.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  // يُبقى على الحروف اللاتينيّة والأرقام فقط: المفتاحُ يدخل في رابطٍ ويُوقَّع،
  // والاسمُ العربيُّ يصحّ لكنّه يُطيل الرابطَ ويُصعّب قراءتَه في السجلّات.
  // وتُقلَّم الشُّرَطُ من الطرفين ثمّ يُستبدل الاسمُ كلُّه بـ`file` إن لم يبق منه
  // شيء: اسمٌ عربيٌّ خالصٌ يصير شُرَطاً كلَّه، فيخرج مفتاحٌ كـ`__abc.png`.
  const slug =
    stem
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[_-]+|[_-]+$/g, "")
      .slice(0, 60) || "file";
  return `${folder}/${slug}_${rand}${ext ? `.${ext}` : ""}`;
}

/** رابطُ الملفِّ العامّ: العنوانُ الثابت ثمّ المفتاح. */
export function publicUrlOf(key: string, publicBase: string): string {
  const base = publicBase.replace(/\/+$/, "");
  const path = key.replace(/^\/+/, "");
  return `${base}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** المفتاحُ من رابطٍ عامّ — عكسُ `publicUrlOf`، و`null` إن لم يكن منه. */
export function keyFromPublicUrl(url: string, publicBase: string): string | null {
  let parsed: URL;
  let base: URL;
  try {
    parsed = new URL(url);
    base = new URL(publicBase);
  } catch {
    return null;
  }
  if (parsed.host !== base.host) return null;
  const prefix = base.pathname.replace(/\/+$/, "");
  const path = decodeURIComponent(parsed.pathname);
  if (prefix && !path.startsWith(prefix + "/")) return null;
  const key = path.slice(prefix.length).replace(/^\/+/, "");
  return key || null;
}

/** الملفُّ كما تعرفه قاعدةُ البيانات في أيِّ موضع. */
export type StoredFileRef = {
  /** العمودُ الذي يحمل الرابط — أصدقُ ما يُعرف منه المزوّد. */
  url?: string | null;
  /** `publicId` المخزَّن حيث يوجد؛ سبعةُ جداولَ تحفظه وأربعةٌ لا. */
  cloudinaryPublicId?: string | null;
  resourceType?: string | null;
};

export type DeletePlan =
  | { provider: "b2"; key: string }
  | { provider: "cloudinary"; publicId: string; resourceType: string }
  | { provider: null; reason: string };

/**
 * من أين يُحذف هذا الملفّ — قرارٌ خالصٌ يُختبر بلا شبكة.
 *
 * وهو أخطرُ قرارٍ في التعايش: من حذف الصفَّ دون أن يسأل عن المزوّد، حذف من
 * Cloudinary ملفّاً يسكن باك بليز — فتمضي العمليّةُ «بنجاح» ويبقى الملفُّ
 * أبداً، ولا شكوى تُسمع ولا حصّةٌ تُسترجع.
 *
 * والرتبةُ مقصودة:
 *   ١ الرابطُ أوّلاً — فالمضيفُ يقطع بالمزوّد.
 *   ٢ فإن لم يكن رابطٌ وكان `publicId`، فهو Cloudinary: هذا سلوكُ الموقع قبل
 *     النقل، وكلُّ ما رُفع قبله فيها. فالمواضعُ التي تنتقي `publicId` وحدَه
 *     تبقى على ما كانت، وإضافةُ عمود الرابط إليها تحسينٌ لا شرط.
 *   ٣ فإن لم يكن هذا ولا ذاك، لا يُحذف شيءٌ ويُقال السبب.
 */
export function deletePlanFor(ref: StoredFileRef, publicBase: string | null): DeletePlan {
  const url = ref.url?.trim();
  if (url) {
    const provider = providerOf(url, publicBase);
    if (provider === "b2") {
      const key = keyFromPublicUrl(url, publicBase as string);
      return key ? { provider: "b2", key } : { provider: null, reason: "رابطُ باك بليز بلا مفتاح" };
    }
    if (provider === "cloudinary") {
      const ref2 = cloudinaryRefFromUrl(url);
      const publicId = ref.cloudinaryPublicId?.trim() || ref2?.publicId;
      if (!publicId) return { provider: null, reason: "رابطُ Cloudinary بلا مُعرِّف" };
      return {
        provider: "cloudinary",
        publicId,
        resourceType: ref.resourceType?.trim() || ref2?.resourceType || "raw",
      };
    }
    // رابطٌ خارجيٌّ لُصق بيد: لا يُحذف، ولا يُعدّ خطأً.
    if (!ref.cloudinaryPublicId?.trim()) {
      return { provider: null, reason: "رابطٌ لا يخصّ مزوّدَينا" };
    }
  }

  const publicId = ref.cloudinaryPublicId?.trim();
  if (publicId) {
    return { provider: "cloudinary", publicId, resourceType: ref.resourceType?.trim() || "raw" };
  }
  return { provider: null, reason: "لا رابطَ ولا مُعرِّف" };
}
