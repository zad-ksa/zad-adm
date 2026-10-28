import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanDonorName,
  donorKindOf,
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
