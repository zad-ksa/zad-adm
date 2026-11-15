import { getSession } from "@/lib/auth";
import { storagePublicBase } from "@/lib/b2";
import { providerOf } from "@/lib/storage";

/**
 * تنزيلُ ملفٍّ مرفوعٍ تنزيلاً لا عرضاً.
 *
 * فخاصيّةُ `download` في الرابط لا تعمل عبر النطاقات: المتصفِّحُ يتجاهلها لملفٍّ
 * من Cloudinary أو باك بليز ويعرض الـPDF في تبويب. فيمرّ الملفُّ من هنا ويعود
 * بـ`Content-Disposition: attachment`، فيُحفظ مباشرة.
 *
 * والحارسان: جلسةٌ قائمة، و**مخزنُنا وحدَه** (`providerOf`) — فلا يصير المسارُ
 * وكيلاً يجلب أيَّ رابطٍ في الشبكة باسم الخادم.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.id) return new Response("غير مصرح", { status: 401 });

  const params = new URL(request.url).searchParams;
  const url = params.get("url") ?? "";
  if (!providerOf(url, storagePublicBase())) {
    return new Response("رابطٌ خارج مخزن الملفات", { status: 400 });
  }

  const upstream = await fetch(url, { redirect: "follow" });
  if (!upstream.ok || !upstream.body) {
    return new Response("تعذّر جلب الملف", { status: 502 });
  }

  const name = fileNameFor(params.get("name"), url);
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
    // اسمٌ ASCII احتياطيّ، والعربيُّ في `filename*` كما في RFC 6266.
    "Content-Disposition": `attachment; filename="${asciiName(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    "Cache-Control": "private, no-store",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { headers });
}

/** نسخةٌ ASCII من الاسم لـ`filename` القديم: ما سوى ذلك وعلامتا التنصيص شرطة. */
function asciiName(name: string): string {
  return name.replace(/[^\x20-\x7e]|["\\]/g, "_");
}

/** الاسمُ المطلوب إن صلح، وإلّا آخرُ مقطعٍ في الرابط. */
function fileNameFor(requested: string | null, url: string): string {
  const clean = (value: string) => value.replace(/[/\\\r\n\0]/g, "_").trim().slice(0, 150);
  const fromUrl = (() => {
    try {
      return decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    } catch {
      return "";
    }
  })();
  const ext = /\.[a-z0-9]{1,8}$/i.exec(fromUrl)?.[0] ?? "";
  if (requested && clean(requested)) {
    const name = clean(requested);
    return /\.[a-z0-9]{1,8}$/i.test(name) ? name : name + ext;
  }
  return clean(fromUrl) || "file";
}
