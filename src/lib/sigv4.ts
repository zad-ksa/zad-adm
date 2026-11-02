/**
 * توقيعُ AWS SigV4 لروابطَ مؤقَّتة — خالصٌ، بلا شبكةٍ ولا حزمةٍ خارجية.
 *
 * ولم نُضِف `@aws-sdk/client-s3` عن قصد: الحاجةُ رابطٌ مُوقَّعٌ واحد، والحزمةُ
 * تجرّ مئاتِ الكيلوبايتات إلى كل دالّةِ خادمٍ تلمسها.
 *
 * وباك بليز متوافقةٌ مع S3، فالخدمةُ `s3` والإقليمُ إقليمُ المستودع.
 */

import { createHash, createHmac } from "node:crypto";

const ALGORITHM = "AWS4-HMAC-SHA256";

const sha256Hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data, "utf8").digest();

/**
 * ترميزُ RFC 3986 — وهو ما يُوقَّع، لا ترميزُ `encodeURIComponent` وحدَه.
 *
 * فالأخيرُ يترك `!'()*` كما هي، وأمازون تُرمّزها. وحرفٌ واحدٌ يختلف يعني
 * `SignatureDoesNotMatch` بلا بيانٍ عن السبب — وهو أعنتُ خطأٍ يُشخَّص هنا.
 */
export function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

/** المسارُ كما يُوقَّع: كلُّ مقطعٍ مرمَّزٌ و`/` باقيةٌ فاصلة. */
export function canonicalUri(key: string): string {
  const trimmed = key.replace(/^\/+/, "");
  if (!trimmed) return "/";
  return "/" + trimmed.split("/").map(uriEncode).join("/");
}

/** `20260102T030405Z` و`20260102` — صيغةُ أمازون الأساسيّة. */
export function amzDates(now: Date): { amzDate: string; dateStamp: string } {
  const iso = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function signingKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

/**
 * الطلبُ المعياريُّ كما يُهشَّم — مُصدَّرٌ ليُختبر نصُّه لا نتيجتُه وحدَها.
 *
 * و`UNSIGNED-PAYLOAD` ثابتٌ مقصود: المتصفِّحُ هو من يرفع البايتات، فبصمتُها
 * مجهولةٌ للخادم حين يُوقِّع. ولو وُضع مكانَها هشُّ الجسم الفارغ (`e3b0c442…`)
 * لصحَّ التوقيعُ على طلبٍ بلا جسمٍ وحدَه، ورُفض كلُّ رفعٍ حقيقيّ.
 *
 * وهذا بعينه الفرقُ الوحيدُ بين هذا المُوقِّع وحزمةِ أمازون حين تُوقِّع بلا
 * جسم: قُوبل الاثنان حرفاً بحرفٍ عند كتابته — الترميزُ وترتيبُ المعاملات
 * وسلسلةُ المفتاح — فاتَّفقا في كلِّ شيءٍ سواه.
 */
export function canonicalRequestOf(
  method: string,
  uri: string,
  canonicalQuery: string,
  host: string
): string {
  return [method, uri, canonicalQuery, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
}

export type PresignInput = {
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  /** مضيفُ نقطةِ النهاية، مثل `s3.eu-central-003.backblazeb2.com`. */
  host: string;
  /** المسارُ بعد المضيف: `bucket/key`. */
  path: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** عمرُ الرابط بالثواني. */
  expiresIn: number;
  now: Date;
  service?: string;
  protocol?: "https" | "http";
};

/** الاستعلامُ المعياريُّ: مرتَّبٌ على المفتاح المرمَّز، فأيُّ ترتيبٍ آخرَ يُرفض. */
export function canonicalQueryOf(pairs: [string, string][]): string {
  return pairs
    .map(([k, v]) => [uriEncode(k), uriEncode(v)] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

/** رابطٌ مُوقَّتٌ يُفتح أو يُرفع عليه مباشرةً بلا ترويسةِ استيثاق. */
export function presignS3Url(input: PresignInput): string {
  const service = input.service ?? "s3";
  const protocol = input.protocol ?? "https";
  const { amzDate, dateStamp } = amzDates(input.now);
  const scope = `${dateStamp}/${input.region}/${service}/aws4_request`;

  const canonicalQuery = canonicalQueryOf([
    ["X-Amz-Algorithm", ALGORITHM],
    ["X-Amz-Credential", `${input.accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(Math.max(1, Math.round(input.expiresIn)))],
    ["X-Amz-SignedHeaders", "host"],
  ]);

  const uri = canonicalUri(input.path);
  const canonicalRequest = canonicalRequestOf(input.method, uri, canonicalQuery, input.host);
  const stringToSign = [ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const signature = hmac(
    signingKey(input.secretAccessKey, dateStamp, input.region, service),
    stringToSign
  ).toString("hex");

  return `${protocol}://${input.host}${uri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
