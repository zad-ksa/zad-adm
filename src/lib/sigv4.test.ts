import { strict as assert } from "node:assert";
import { createHash, createHmac } from "node:crypto";
import { test } from "node:test";
import {
  amzDates,
  canonicalQueryOf,
  canonicalRequestOf,
  canonicalUri,
  presignS3Url,
  uriEncode,
} from "./sigv4.ts";

const DOC = {
  host: "examplebucket.s3.amazonaws.com",
  key: "test.txt",
  region: "us-east-1",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  expiresIn: 86400,
  now: new Date("2013-05-24T00:00:00Z"),
};

/**
 * الطلبُ المعياريُّ كما تنشره أمازون في مثال «Query String Requests».
 *
 * وهو أصدقُ ما يُختبر هنا: التوقيعُ رقمٌ لا يُقرأ، أمّا هذا النصُّ فيُقابَل
 * بالمنشور سطراً سطراً. فإن صحَّ وصحَّت سلسلةُ المفتاح صحَّ التوقيعُ لزوماً.
 */
test("الطلبُ المعياريُّ يطابق مثال أمازون المنشور", () => {
  const query = canonicalQueryOf([
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${DOC.accessKeyId}/20130524/us-east-1/s3/aws4_request`],
    ["X-Amz-Date", "20130524T000000Z"],
    ["X-Amz-Expires", "86400"],
    ["X-Amz-SignedHeaders", "host"],
  ]);
  assert.equal(
    query,
    "X-Amz-Algorithm=AWS4-HMAC-SHA256" +
      "&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request" +
      "&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host"
  );
  assert.equal(
    canonicalRequestOf("GET", "/test.txt", query, DOC.host),
    "GET\n/test.txt\n" + query + "\nhost:" + DOC.host + "\n\nhost\nUNSIGNED-PAYLOAD"
  );
});

/**
 * قيمةٌ ذهبيّة، أصلُها مُقابلةٌ مع `@aws-sdk/signature-v4` عند كتابة الملفّ:
 * وُقِّع المثالُ نفسُه بالحزمة وبهذا الملفّ فاتَّفق الترميزُ والترتيبُ وسلسلةُ
 * المفتاح، ولم يفترقا إلّا في ثابت الحِمل. وتثبيتُها هنا يمسك أيَّ انحرافٍ لاحق.
 */
test("توقيعُ مثال أمازون — قيمةٌ ذهبيّةٌ مُقابَلةٌ بحزمة أمازون", () => {
  const url = presignS3Url({ method: "GET", path: DOC.key, ...DOC });
  assert.equal(
    new URL(url).searchParams.get("X-Amz-Signature"),
    "3ed0be64024db54d5574a27da223529635c383f911f80e636f0ccc13890053d2"
  );
});

/**
 * برهانُ أنّ الفرقَ عن الحزمة ثابتُ الحِمل وحدَه، لا خللٌ في الخوارزميّة.
 *
 * يُعاد البناءُ هنا بهشِّ الجسم الفارغ بدل `UNSIGNED-PAYLOAD` — وهو ما تُوقِّعه
 * الحزمةُ حين لا جسم — فيخرج توقيعُها هي بعينه. فلو كان في الترميز أو الترتيب
 * أو سلسلة المفتاح خللٌ، ما خرج.
 */
test("بثابتِ الحِمل الفارغ يخرج توقيعُ حزمةِ أمازون نفسُه", () => {
  const sha = (d: string) => createHash("sha256").update(d).digest("hex");
  const hmac = (k: Buffer | string, d: string) => createHmac("sha256", k).update(d, "utf8").digest();
  const query = canonicalQueryOf([
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${DOC.accessKeyId}/20130524/us-east-1/s3/aws4_request`],
    ["X-Amz-Date", "20130524T000000Z"],
    ["X-Amz-Expires", "86400"],
    ["X-Amz-SignedHeaders", "host"],
  ]);
  const emptyBody = canonicalRequestOf("GET", "/test.txt", query, DOC.host).replace(
    "UNSIGNED-PAYLOAD",
    sha("")
  );
  const sts = [
    "AWS4-HMAC-SHA256",
    "20130524T000000Z",
    "20130524/us-east-1/s3/aws4_request",
    sha(emptyBody),
  ].join("\n");
  let k = hmac(`AWS4${DOC.secretAccessKey}`, "20130524");
  k = hmac(k, "us-east-1");
  k = hmac(k, "s3");
  k = hmac(k, "aws4_request");
  assert.equal(
    hmac(k, sts).toString("hex"),
    "13fc8027a56468fb415ec48e7f90beb819e5c6b2308109bb5fe2400f6b704a3a"
  );
});

test("الرابطُ يحمل كلَّ ما تطلبه أمازون", () => {
  const url = presignS3Url({
    method: "PUT",
    host: "s3.eu-central-003.backblazeb2.com",
    path: "zad-files/zad_avatars/a_1.png",
    region: "eu-central-003",
    accessKeyId: "KEY",
    secretAccessKey: "SECRET",
    expiresIn: 600,
    now: new Date("2026-01-02T03:04:05Z"),
  });
  const q = new URL(url).searchParams;
  assert.equal(q.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256");
  assert.equal(q.get("X-Amz-Credential"), "KEY/20260102/eu-central-003/s3/aws4_request");
  assert.equal(q.get("X-Amz-Date"), "20260102T030405Z");
  assert.equal(q.get("X-Amz-Expires"), "600");
  assert.equal(q.get("X-Amz-SignedHeaders"), "host");
  assert.match(q.get("X-Amz-Signature") ?? "", /^[0-9a-f]{64}$/);
  assert.equal(new URL(url).pathname, "/zad-files/zad_avatars/a_1.png");
});

test("ترميزُ RFC 3986 يُرمّز ما يتركه encodeURIComponent", () => {
  assert.equal(uriEncode("a!b'c(d)e*f"), "a%21b%27c%28d%29e%2Af");
  assert.equal(uriEncode("مرفق.pdf"), encodeURIComponent("مرفق.pdf"));
  assert.equal(uriEncode("a b"), "a%20b");
});

test("المسارُ يُرمّز مقاطعَه ويُبقي الفواصل", () => {
  assert.equal(canonicalUri("bucket/a b/c.pdf"), "/bucket/a%20b/c.pdf");
  assert.equal(canonicalUri("/leading"), "/leading");
  assert.equal(canonicalUri(""), "/");
});

test("التاريخُ بصيغة أمازون الأساسيّة", () => {
  assert.deepEqual(amzDates(new Date("2026-11-02T10:20:30.456Z")), {
    amzDate: "20261102T102030Z",
    dateStamp: "20261102",
  });
});

test("التوقيعُ يتغيّر بتغيّر اللحظة", () => {
  const base = {
    method: "PUT" as const,
    host: "h.example.com",
    path: "b/k",
    region: "r",
    accessKeyId: "K",
    secretAccessKey: "S",
    expiresIn: 60,
  };
  assert.notEqual(
    presignS3Url({ ...base, now: new Date("2026-01-02T03:04:05Z") }),
    presignS3Url({ ...base, now: new Date("2026-01-02T03:04:06Z") })
  );
});
