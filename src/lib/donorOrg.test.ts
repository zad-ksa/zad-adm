import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanCredential,
  cleanDonorName,
  donorKindOf,
  looksLikeNote,
  grantStatusLabel,
  intakeDateNote,
  intakeStatusOf,
  normalizeDonorName,
} from "./donorOrg.ts";

// ── تسوية الاسم ────────────────────────────────────────────────────────────

test("المسافاتُ الزائدةُ والأسطرُ تُسوّى", () => {
  assert.equal(normalizeDonorName("  بنك الجزيرة  "), normalizeDonorName("بنك الجزيرة"));
  assert.equal(normalizeDonorName("مؤسسة\nالعثيم  الخيرية"), normalizeDonorName("مؤسسة العثيم الخيرية"));
});

test("هجاءا «إحسان» يتساويان — وهما في القاعدة جهتان", () => {
  assert.equal(normalizeDonorName("منصة إحسان"), normalizeDonorName("منصة احسان "));
});

test("التاءُ المربوطةُ والياءُ المقصورةُ تُسوّيان", () => {
  assert.equal(normalizeDonorName("مؤسسة الملوى"), normalizeDonorName("مؤسسه الملوي"));
});

test("جهتان مختلفتان لا تتساويان بالتسوية", () => {
  assert.notEqual(normalizeDonorName("مؤسسة الماجد"), normalizeDonorName("مؤسسة المشعل"));
});

test("التسويةُ للمطابقة، والعرضُ يحفظ الهجاء", () => {
  assert.equal(cleanDonorName("  مؤسسة  غيث "), "مؤسسة غيث");
});

// ── بياناتُ الدخول ─────────────────────────────────────────────────────────

test("علاماتُ التنصيص تُحذف — وهي في الخلايا نصّاً لا عرضاً", () => {
  assert.equal(cleanCredential('"info@atharq.org"'), "info@atharq.org");
  assert.equal(cleanCredential('"@Athar5594"'), "@Athar5594");
});

test("كلُّ المسافات تُحذف، ومنها ما لا يُرى", () => {
  assert.equal(cleanCredential("  110112009366 "), "110112009366");
  assert.equal(cleanCredential("Aa@10 20‏30"), "Aa@102030");
});

test("رمزُ كلمة المرور لا يُمسّ", () => {
  assert.equal(cleanCredential("Alraafa#2000#"), "Alraafa#2000#");
  assert.equal(cleanCredential("Zz102030**"), "Zz102030**");
});

test("الخليّةُ العربيةُ ملاحظةٌ لا اسمَ دخول", () => {
  assert.equal(looksLikeNote("جاري الارسال"), true);
  assert.equal(looksLikeNote("almaaqd@gmail.com"), false);
  assert.equal(looksLikeNote("060111010027"), false);
});

// ── النوعُ والحالة ─────────────────────────────────────────────────────────

test("نوعٌ مجهولٌ يرتدّ إلى المؤسسات", () => {
  assert.equal(donorKindOf("EHSAN"), "EHSAN");
  assert.equal(donorKindOf("WHATEVER"), "FOUNDATION");
});

test("حالةٌ مجهولةٌ ترتدّ إلى مغلق — فالأصلُ ألّا يُرفع", () => {
  assert.equal(intakeStatusOf("OPEN"), "OPEN");
  assert.equal(intakeStatusOf(""), "CLOSED");
});

// ── التواريخُ والحالة ──────────────────────────────────────────────────────

const d = (iso: string) => new Date(iso);
const now = d("2026-06-15T00:00:00Z");

test("مفتوحٌ وتاريخُ الإغلاق مضى → سطرُ تنبيه", () => {
  assert.equal(
    intakeDateNote("OPEN", d("2026-01-01T00:00:00Z"), d("2026-03-01T00:00:00Z"), now),
    "الحالة مفتوحة وتاريخُ الإغلاق المعلن قد مضى"
  );
});

test("مغلقٌ والموعدُ المعلن قائم → سطرُ تنبيه", () => {
  assert.equal(
    intakeDateNote("CLOSED", d("2026-06-01T00:00:00Z"), d("2026-07-01T00:00:00Z"), now),
    "الحالة مغلقة وموعدُ الرفع المعلن قائم"
  );
});

test("مفتوحٌ بلا تاريخين → لا تناقض", () => {
  assert.equal(intakeDateNote("OPEN", null, null, now), null);
});

test("مغلقٌ وموعدُه لم يحضر → لا تناقض", () => {
  assert.equal(intakeDateNote("CLOSED", d("2026-09-01T00:00:00Z"), null, now), null);
});

test("مفتوحٌ داخل موعده → لا تناقض", () => {
  assert.equal(intakeDateNote("OPEN", d("2026-06-01T00:00:00Z"), d("2026-07-01T00:00:00Z"), now), null);
});

// ── حالاتُ المنحة ──────────────────────────────────────────────────────────

test("حالةُ المنحة تُعرَّب، والمجهولُ يُعرض كما هو", () => {
  assert.equal(grantStatusLabel("APPROVED"), "مقبولة");
  assert.equal(grantStatusLabel("ODD"), "ODD");
});
