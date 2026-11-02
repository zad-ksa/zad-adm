/**
 * بوّابةُ الملفّات: `files.zad-co.sa` أمام مستودعٍ **خاصٍّ** في باك بليز.
 *
 * ولماذا Worker بدل تعميم المستودع:
 *   - المستودعُ يبقى خاصّاً، فلا شرطَ تعميمٍ ولا تحقُّقَ بطاقة.
 *   - الرابطُ المحفوظُ في القاعدة **ثابتٌ** (`files.zad-co.sa/<key>`)، فلا
 *     تُستبدل ٤٣٧ صفّاً كلَّما تغيّر شيء، ولا يُمسّ موضعُ قراءةٍ واحدٌ في
 *     الموقع — وهي ثمانيةٌ وسبعون ملفّاً، اثنان وثلاثون منها مكوّناتُ عميلٍ
 *     لا تستطيع التوقيعَ أصلاً.
 *   - وCloudflare تُخزِّن الجوابَ مؤقَّتاً، وهو ما يكسِره الرابطُ المُوقَّعُ
 *     المتغيّرُ في كلِّ عرض.
 *
 * **وما لا يفعله:** لا يُخفي الملفَّ عن من يعرف رابطَه — فهو كالمستودع العامّ
 * في ذلك، وكحال روابط Cloudinary اليوم حرفاً. فمن أراد منعاً حقيقيّاً فموضعُه
 * هنا: يُفحص في هذه الدالّة كعكُ جلسةٍ أو توقيعُ تطبيقٍ قبل أن يُجلب الملفّ.
 *
 * ولا يقبل إلّا القراءة: الرفعُ يذهب من المتصفِّح إلى نقطة نهاية S3 برابطٍ
 * مُوقَّعٍ من الخادم، والحذفُ من الخادم. فلا كتابةَ تمرّ من هنا بحال.
 */

import { presignS3Url } from "./sigv4.mjs";

/** عمرُ الرابط المُوقَّع إلى باك بليز — ثوانٍ تكفي جلبةً واحدة. */
const SIGN_TTL = 60;

/** ما تُخبر به المتصفِّحَ والحافّة. والملفّاتُ لا تُستبدل في مكانها أصلاً. */
const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800";

/** ترويساتٌ لا تخرج إلى الزائر: تُفصح عن المزوّد وعن تفاصيله. */
const STRIP = [
  "x-amz-request-id",
  "x-amz-id-2",
  "x-amz-version-id",
  "x-bz-content-sha1",
  "x-bz-file-id",
  "x-bz-file-name",
  "x-bz-upload-timestamp",
  "server",
];

const deny = (status, message) =>
  new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });

const gateway = {
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return deny(405, "القراءة فقط");
    }

    for (const name of ["B2_ENDPOINT", "B2_REGION", "B2_BUCKET", "B2_KEY_ID", "B2_APP_KEY"]) {
      if (!env[name]) return deny(500, `إعدادٌ ناقص: ${name}`);
    }

    const url = new URL(request.url);
    let key;
    try {
      key = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    } catch {
      return deny(400, "مسارٌ غيرُ صالح");
    }
    // لا صعودَ بالمسار ولا مسارٌ فارغ: المفتاحُ يُركَّب في مسارٍ يُوقَّع، فـ`..`
    // فيه قد يُخرج الطلبَ من المستودع إلى غيره.
    if (!key || key.includes("..") || key.startsWith(".")) return deny(404, "غير موجود");

    const cache = caches.default;
    // مفتاحُ التخزين بالرابط وحدَه: الطلبُ قد يحمل ترويساتٍ تختلف بين زائرٍ
    // وآخرَ فتُفرِّق النسخَ بلا داعٍ.
    const cacheKey = new Request(url.toString(), { method: "GET" });
    const cached = await cache.match(cacheKey);
    if (cached && !request.headers.get("range")) return cached;

    let endpointHost;
    try {
      endpointHost = new URL(env.B2_ENDPOINT).host;
    } catch {
      return deny(500, "B2_ENDPOINT غيرُ صالح");
    }

    const signed = await presignS3Url({
      method: "GET",
      host: endpointHost,
      path: `${env.B2_BUCKET}/${key}`,
      region: env.B2_REGION,
      accessKeyId: env.B2_KEY_ID,
      secretAccessKey: env.B2_APP_KEY,
      expiresIn: SIGN_TTL,
      now: new Date(),
    });

    // الـrange يُمرَّر كما هو: الفيديو والصوتُ يُطلبان مقاطعَ، ومن أسقطها
    // أرسل الملفَّ كلَّه في كلِّ قفزة.
    const range = request.headers.get("range");
    const upstream = await fetch(signed, {
      method: "GET",
      headers: range ? { range } : undefined,
    });

    if (!upstream.ok && upstream.status !== 206) {
      // لا يُعاد نصُّ خطأ باك بليز: فيه اسمُ المستودع وتفاصيلُ الطلب.
      return deny(upstream.status === 404 || upstream.status === 403 ? 404 : 502, "غير موجود");
    }

    const headers = new Headers(upstream.headers);
    for (const name of STRIP) headers.delete(name);
    headers.set("cache-control", CACHE_CONTROL);
    headers.set("x-content-type-options", "nosniff");
    // ملفٌّ يُفتح في المتصفِّح لا يُنفَّذ فيه شيء: المفاتيحُ من اختيار الموقع
    // لا من اختيار الرافع، لكنّ هذا سدٌّ ثانٍ لا يُعتمد عليه وحدَه.
    headers.set("content-security-policy", "default-src 'none'; sandbox");

    const response = new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers,
    });

    if (!range && upstream.status === 200) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
    return response;
  },
};

export default gateway;
