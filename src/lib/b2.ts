/**
 * باك بليز B2 عبر واجهتها المتوافقة مع S3.
 *
 * وهذا الملفُّ وحدَه يقرأ البيئة، فتبقى `storage.ts` خالصةً تُختبر بلا بيئةٍ
 * ولا شبكة. وهو خادميٌّ محض: المفتاحُ السرِّيُّ لا يعبر إلى المتصفِّح أبداً —
 * المتصفِّحُ يأخذ رابطاً مُوقَّعاً قصيرَ العمر، لا مفتاحاً.
 *
 * ومضيفان لا واحد:
 *   - **الرفع** إلى نقطةِ نهاية S3 (`s3.<region>.backblazeb2.com`)، فالتوقيعُ
 *     يشمل المضيفَ ولا يصحّ على غيره.
 *   - **القراءة** من النطاق الخاصِّ أمام Cloudflare — وهو ما يُحفظ في القاعدة.
 * ومن خلط بينهما ظهرت له «SignatureDoesNotMatch» بلا بيانٍ عن السبب.
 */

import { randomBytes } from "node:crypto";
import { presignS3Url } from "./sigv4.ts";
import { publicUrlOf, storageKeyOf, type StorageProvider } from "./storage.ts";

export type B2Config = {
  /** مضيفُ نقطةِ نهاية S3، بلا بروتوكول. */
  endpointHost: string;
  region: string;
  bucket: string;
  keyId: string;
  appKey: string;
  /** العنوانُ العامُّ الذي يُحفظ في القاعدة، بلا شُرطةٍ أخيرة. */
  publicBase: string;
};

/** العنوانُ العامُّ وحدَه — تحتاجه القراءةُ ولا تحتاج مفتاحاً. */
export function storagePublicBase(): string | null {
  const raw = process.env.STORAGE_PUBLIC_BASE?.trim();
  if (!raw) return null;
  try {
    new URL(raw);
  } catch {
    return null;
  }
  return raw.replace(/\/+$/, "");
}

/**
 * الإعدادُ كاملاً، أو `null` إن لم يُضبط بعد.
 *
 * و`null` لا استثناء: الموقعُ يعمل اليوم على Cloudinary وحدَها، فصفحةٌ تُفتح
 * قبل ضبط باك بليز يجب أن تُفتح لا أن تسقط. ومن يحتاج الإعدادَ حقّاً — الرفعُ
 * والحذفُ — ينادي `requireB2Config` فيُخطئ بعبارةٍ تقول ما ينقص بالاسم.
 */
export function b2Config(): B2Config | null {
  const endpoint = process.env.B2_ENDPOINT?.trim();
  const region = process.env.B2_REGION?.trim();
  const bucket = process.env.B2_BUCKET?.trim();
  const keyId = process.env.B2_KEY_ID?.trim();
  const appKey = process.env.B2_APP_KEY?.trim();
  const publicBase = storagePublicBase();
  if (!endpoint || !region || !bucket || !keyId || !appKey || !publicBase) return null;

  let endpointHost: string;
  try {
    endpointHost = new URL(endpoint).host;
  } catch {
    return null;
  }
  return { endpointHost, region, bucket, keyId, appKey, publicBase };
}

/** ما ينقص من الإعداد، بالاسم — ليُقرأ في السجلّ لا يُخمَّن. */
export function missingB2Keys(): string[] {
  const needed: [string, string | undefined][] = [
    ["B2_ENDPOINT", process.env.B2_ENDPOINT],
    ["B2_REGION", process.env.B2_REGION],
    ["B2_BUCKET", process.env.B2_BUCKET],
    ["B2_KEY_ID", process.env.B2_KEY_ID],
    ["B2_APP_KEY", process.env.B2_APP_KEY],
    ["STORAGE_PUBLIC_BASE", process.env.STORAGE_PUBLIC_BASE],
  ];
  return needed.filter(([, v]) => !v?.trim()).map(([k]) => k);
}

/**
 * إلى أيِّ مزوّدٍ تُرفع الملفّاتُ **الجديدة**.
 *
 * ومفتاحٌ صريحٌ (`STORAGE_UPLOAD_PROVIDER=b2`) لا استنباطٌ من اكتمال الإعداد،
 * وهذا الفرقُ هو ما يمنع كسرَ الموقع: مفاتيحُ باك بليز موضوعةٌ في البيئة
 * منذ أن جُرِّبت السلسلة، والبوّابةُ التي تُقرأ منها الملفّاتُ قد لا تكون
 * نُشرت بعد. فلو كان الاستنباطُ هو الحكم، لانتقل الرفعُ من تلقائه إلى
 * مستودعٍ **لا يُقرأ منه**: الرفعُ ينجح، والصفُّ يُحفظ، والملفُّ لا يظهر.
 *
 * فالتحوُّلُ قرارٌ يُتَّخذ بعد أن يقول `npm run check:b2` إنّ السلسلةَ سليمة،
 * والرجوعُ عنه إزالةُ متغيّرٍ واحد. وما رُفع إلى أحدهما يبقى مقروءاً من
 * أيٍّ منهما: المزوّدُ يُعرف من الرابط المحفوظ، لا من هذا المفتاح.
 */
export function uploadProvider(): StorageProvider {
  if (process.env.STORAGE_UPLOAD_PROVIDER?.trim().toLowerCase() !== "b2") return "cloudinary";
  if (b2Config()) return "b2";
  // طُلبت باك بليز ونقص إعدادُها: يُرجع إلى Cloudinary كي لا يتعطّل الرفع،
  // **ويُقال في السجلّ ما نقص بالاسم** — وإلّا بقي أحدُهم يُبدّل متغيّراً
  // ويرى الملفّاتَ تذهب حيث لم يُردها بلا سببٍ ظاهر.
  console.error("STORAGE_UPLOAD_PROVIDER=b2 ونقص الإعداد:", missingB2Keys().join("، "));
  return "cloudinary";
}

export function requireB2Config(): B2Config {
  const config = b2Config();
  if (config) return config;
  const missing = missingB2Keys();
  throw new Error(
    missing.length
      ? `إعدادُ التخزين ناقص: ${missing.join("، ")}`
      : "إعدادُ التخزين غير صالح — راجع B2_ENDPOINT وSTORAGE_PUBLIC_BASE"
  );
}

/** مسارُ S3 للمفتاح: نمطُ المسار لا النطاقِ الفرعيّ — وهو ما تدعمه باك بليز. */
const pathOf = (config: B2Config, key: string) => `${config.bucket}/${key.replace(/^\/+/, "")}`;

export type UploadTarget = {
  /** الرابطُ الذي يرفع عليه المتصفِّحُ بـ`PUT`. */
  uploadUrl: string;
  /** الرابطُ الذي يُحفظ في القاعدة ويُقرأ منه بعد ذلك. */
  publicUrl: string;
  key: string;
  expiresIn: number;
};

/** مفتاحٌ غيرُ قابلٍ للتخمين: ستّةَ عشرَ حرفاً من `crypto` لا من الوقت. */
export function newStorageKey(folder: string, fileName: string): string {
  return storageKeyOf(folder, fileName, randomBytes(8).toString("hex"));
}

/**
 * هدفُ رفعٍ مُوقَّتٌ لملفٍّ واحد.
 *
 * وعشرُ دقائقَ عمراً لا أكثر: الرابطُ يُجيز الكتابةَ على مفتاحٍ بعينه، فطولُ
 * عمره نافذةٌ لمن التقطه. وعشرُ دقائقَ تكفي ملفّاً كبيراً على شبكةٍ بطيئة.
 */
export function presignUpload(key: string, expiresIn = 600): UploadTarget {
  const config = requireB2Config();
  return {
    uploadUrl: presignS3Url({
      method: "PUT",
      host: config.endpointHost,
      path: pathOf(config, key),
      region: config.region,
      accessKeyId: config.keyId,
      secretAccessKey: config.appKey,
      expiresIn,
      now: new Date(),
    }),
    publicUrl: publicUrlOf(key, config.publicBase),
    key,
    expiresIn,
  };
}

/**
 * حذفُ ملفٍّ من باك بليز.
 *
 * ويُردّ `true` للمفقود أيضاً: الغايةُ ألّا يبقى الملفّ، وملفٌّ غيرُ موجودٍ
 * غايةٌ محقَّقة. ولو رُدَّ `false` للمفقود، لعلَّق كلُّ صفٍّ حُذف ملفُّه مرّتين.
 */
export async function deleteFromB2(key: string): Promise<boolean> {
  const config = requireB2Config();
  const url = presignS3Url({
    method: "DELETE",
    host: config.endpointHost,
    path: pathOf(config, key),
    region: config.region,
    accessKeyId: config.keyId,
    secretAccessKey: config.appKey,
    expiresIn: 60,
    now: new Date(),
  });
  const res = await fetch(url, { method: "DELETE" });
  return res.ok || res.status === 404;
}

/**
 * حالةُ `HEAD` على مفتاح — ويُفرَّق بها **المفقودُ عن المرفوض**.
 *
 * و٤٠٤ تعني أنّ الملفَّ غيرُ موجود، أمّا ٤٠٣ فتعني أنّ **التوقيعَ نفسَه
 * مرفوض** — مفتاحٌ خاطئ، أو إقليمٌ خاطئ، أو ساعةُ جهازٍ منحرفةٌ عن
 * الحقيقة بأكثرَ من دقائق. وهما عطبان لا يُجمعان في جوابٍ واحد: الأوّلُ
 * حالةٌ عاديّةٌ تُسأل عنها، والثاني يُسقط كلَّ رفعٍ وحذفٍ في الموقع.
 *
 * > وكان هنا تعليلٌ خاطئٌ يقول إنّ ٤٠٣ جوابُ المفقود لأنّ المفتاحَ بلا
 * > `listFiles`. والمفتاحُ يحمل `listFiles` فعلاً، و`HEAD` مُوقَّعاً
 * > صحيحاً على مفقودٍ يردُّ ٤٠٤. وإنّما جاءت ٤٠٣ من فحصٍ كان يُرسل `HEAD`
 * > إلى رابطٍ مُوقَّعٍ لـ`PUT`: **الطريقةُ داخلَ التوقيع**، فتضارُبُها
 * > يُبطله.
 */
export async function b2HeadStatus(key: string): Promise<number> {
  const config = requireB2Config();
  const url = presignS3Url({
    method: "HEAD",
    host: config.endpointHost,
    path: pathOf(config, key),
    region: config.region,
    accessKeyId: config.keyId,
    secretAccessKey: config.appKey,
    expiresIn: 60,
    now: new Date(),
  });
  const res = await fetch(url, { method: "HEAD" });
  return res.status;
}

/** هل الملفُّ موجودٌ فعلاً — يُسأل قبل استبدال رابطٍ في القاعدة. */
export async function b2ObjectExists(key: string): Promise<boolean> {
  const status = await b2HeadStatus(key);
  return status >= 200 && status < 300;
}
