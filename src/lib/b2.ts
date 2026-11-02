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
import { publicUrlOf, storageKeyOf } from "./storage.ts";

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
 * هل الملفُّ موجودٌ فعلاً — يُسأل قبل استبدال رابطٍ في القاعدة.
 *
 * ويُردّ `false` للـ٤٠٣ كما للـ٤٠٤: مفتاحُ التطبيق بلا صلاحيّة `listFiles`،
 * فباك بليز — كـS3 — تردّ ٤٠٣ على المفقود كي لا تُفصح عن وجوده. فالغايةُ
 * محقَّقةٌ في الحالين: ليس هناك ملفٌّ نتأكّد منه.
 */
export async function b2ObjectExists(key: string): Promise<boolean> {
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
  return res.ok;
}
