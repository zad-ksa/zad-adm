/**
 * توقيعُ SigV4 بـWeb Crypto — نسخةُ Cloudflare Worker.
 *
 * ولم يُعَد استعمالُ `src/lib/sigv4.ts` لأنّها تستورد `node:crypto`، وهو ليس
 * في بيئة Worker إلّا بعلَمِ توافقٍ يُثقلها. وWeb Crypto غيرُ متزامنةٍ بطبعها،
 * فالدالّةُ هنا `async` بخلاف أختها.
 *
 * **وهما نسختان لمنطقٍ واحد، فخطرُ افتراقهما حقيقيّ** — ولذلك يُقابَلان في
 * `src/lib/workerSigv4.test.ts` على جملةٍ من المُدخلات، وهو اختبارٌ يسقط إن
 * عُدِّلت إحداهما دون الأخرى. وأصلُ المنطق مُقابَلٌ بحزمة أمازون نفسِها.
 */

const ALGORITHM = "AWS4-HMAC-SHA256";
const encoder = new TextEncoder();

const hex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256Hex(text) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? encoder.encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

/** ترميزُ RFC 3986: `encodeURIComponent` يترك `!'()*` وأمازون تُرمّزها. */
export function uriEncode(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

/** المسارُ كما يُوقَّع: كلُّ مقطعٍ مرمَّزٌ و`/` باقيةٌ فاصلة. */
export function canonicalUri(key) {
  const trimmed = String(key).replace(/^\/+/, "");
  if (!trimmed) return "/";
  return "/" + trimmed.split("/").map(uriEncode).join("/");
}

/** `20260102T030405Z` و`20260102`. */
export function amzDates(now) {
  const iso = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

/** الاستعلامُ المعياريُّ مرتَّبٌ على المفتاح المرمَّز. */
export function canonicalQueryOf(pairs) {
  return pairs
    .map(([k, v]) => [uriEncode(k), uriEncode(v)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

/** `UNSIGNED-PAYLOAD` ثابتٌ مقصود — ولا يُغيَّر إلّا مع أخته في src/lib. */
export function canonicalRequestOf(method, uri, canonicalQuery, host) {
  return [method, uri, canonicalQuery, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
}

/** رابطٌ مُوقَّتٌ يُقرأ منه مباشرةً بلا ترويسةِ استيثاق. */
export async function presignS3Url({
  method,
  host,
  path,
  region,
  accessKeyId,
  secretAccessKey,
  expiresIn,
  now,
  service = "s3",
  protocol = "https",
}) {
  const { amzDate, dateStamp } = amzDates(now);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalQuery = canonicalQueryOf([
    ["X-Amz-Algorithm", ALGORITHM],
    ["X-Amz-Credential", `${accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(Math.max(1, Math.round(expiresIn)))],
    ["X-Amz-SignedHeaders", "host"],
  ]);

  const uri = canonicalUri(path);
  const canonicalRequest = canonicalRequestOf(method, uri, canonicalQuery, host);
  const stringToSign = [ALGORITHM, amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");

  let key = await hmac(`AWS4${secretAccessKey}`, dateStamp);
  key = await hmac(key, region);
  key = await hmac(key, service);
  key = await hmac(key, "aws4_request");
  const signature = hex(await hmac(key, stringToSign));

  return `${protocol}://${host}${uri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
