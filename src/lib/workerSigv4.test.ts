import { strict as assert } from "node:assert";
import { test } from "node:test";
import { presignS3Url as nodeSign } from "./sigv4.ts";
// جافاسكربت خالصةٌ في مجلّد Worker: يُنشر إلى Cloudflare ولا يُبنى مع الموقع.
import { presignS3Url as workerSign } from "../../workers/files/sigv4.mjs";

/**
 * المُوقِّعان نسختان لمنطقٍ واحد — واحدةٌ بـ`node:crypto` للموقع، وأخرى
 * بـWeb Crypto لبوّابة الملفّات في Cloudflare (وهي بيئةٌ بلا `node:crypto`).
 *
 * وخطرُ افتراقهما حقيقيّ: من عدّل واحدةً ونسي الأخرى، صار الموقعُ يرفع إلى
 * مفتاحٍ والبوّابةُ تقرأ من غيره — أو تردّ ٤٠٣ على كلِّ ملفّ. فهذا الاختبارُ
 * يُقابلهما حرفاً على جملةٍ من المُدخلات، ويسقط عند أوّل افتراق.
 *
 * وأصلُ المنطق مُقابَلٌ بحزمة أمازون نفسِها في `sigv4.test.ts`، فمطابقةُ
 * هذه لتلك مطابقةٌ للحزمة بالتبعيّة.
 */
const CASES = [
  {
    label: "مثالُ أمازون المنشور",
    method: "GET" as const,
    host: "examplebucket.s3.amazonaws.com",
    path: "test.txt",
    region: "us-east-1",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
    expiresIn: 86400,
    now: new Date("2013-05-24T00:00:00Z"),
  },
  {
    label: "قراءةٌ من باك بليز بنمط المسار",
    method: "GET" as const,
    host: "s3.eu-central-003.backblazeb2.com",
    path: "zad-site/zad_avatars/a_9f3c1d2e.png",
    region: "eu-central-003",
    accessKeyId: "0038abcdef0000000000000",
    secretAccessKey: "K003SeCrEtKeyValue",
    expiresIn: 60,
    now: new Date("2026-11-02T12:34:56Z"),
  },
  {
    label: "مفتاحٌ بعربيٍّ ومسافة",
    method: "GET" as const,
    host: "s3.eu-central-003.backblazeb2.com",
    path: "zad-site/zad_mail_attachments/تقرير نهائي.pdf",
    region: "eu-central-003",
    accessKeyId: "KEY",
    secretAccessKey: "SECRET",
    expiresIn: 300,
    now: new Date("2027-01-01T00:00:00Z"),
  },
  {
    label: "مفتاحٌ بحروفٍ تُرمّزها أمازون وحدَها",
    method: "GET" as const,
    host: "s3.us-west-004.backblazeb2.com",
    path: "b/f/g(1)'s*copy!.zip",
    region: "us-west-004",
    accessKeyId: "K",
    secretAccessKey: "S",
    expiresIn: 3600,
    now: new Date("2026-06-15T23:59:59Z"),
  },
  {
    label: "HEAD، ومجلّداتٌ متداخلة",
    method: "HEAD" as const,
    host: "s3.us-east-005.backblazeb2.com",
    path: "bk/tasks_proofs/2026/09/fkxcncferls94v6bn11l.png",
    region: "us-east-005",
    accessKeyId: "KID",
    secretAccessKey: "APPKEY",
    expiresIn: 120,
    now: new Date("2026-09-30T08:00:00Z"),
  },
];

for (const input of CASES) {
  test(`المُوقِّعان يتّفقان: ${input.label}`, async () => {
    const { label, ...args } = input;
    void label;
    assert.equal(await workerSign(args), nodeSign(args));
  });
}

test("توقيعُ البوّابة رابطٌ صالحٌ بكلِّ ما تطلبه أمازون", async () => {
  const url: string = await workerSign({
    method: "GET",
    host: "s3.eu-central-003.backblazeb2.com",
    path: "zad-site/a/b.png",
    region: "eu-central-003",
    accessKeyId: "KID",
    secretAccessKey: "SECRET",
    expiresIn: 60,
    now: new Date("2026-11-02T12:00:00Z"),
  });
  const q = new URL(url).searchParams;
  assert.equal(q.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256");
  assert.equal(q.get("X-Amz-Expires"), "60");
  assert.equal(q.get("X-Amz-SignedHeaders"), "host");
  assert.match(q.get("X-Amz-Signature") ?? "", /^[0-9a-f]{64}$/);
  assert.equal(new URL(url).pathname, "/zad-site/a/b.png");
});
