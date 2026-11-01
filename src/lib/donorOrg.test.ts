import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanCredential,
  cleanDonorName,
  donorKindOf,
  looksLikeNote,
  grantStatusLabel,
  effectiveIntake,
  intakeFromInputs,
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
const now = d("2026-06-15T09:00:00Z");

test("بلا تاريخين تبقى الحالةُ يدويّة", () => {
  assert.deepEqual(effectiveIntake("OPEN", null, null, now), {
    status: "OPEN",
    mode: "MANUAL",
    reason: "مفتوحٌ بضبطٍ يدوي",
  });
  assert.equal(effectiveIntake("CLOSED", null, null, now).status, "CLOSED");
});

test("داخلَ النافذة مفتوحٌ تلقائياً ولو كان المخزَّن مغلقاً", () => {
  const r = effectiveIntake("CLOSED", d("2026-06-01"), d("2026-07-01"), now);
  assert.equal(r.status, "OPEN");
  assert.equal(r.mode, "AUTO");
  assert.equal(r.reason, "مفتوحٌ حتى 2026-07-01");
});

test("قبل الفتح مغلقٌ ولو كان المخزَّن مفتوحاً", () => {
  const r = effectiveIntake("OPEN", d("2026-09-01"), null, now);
  assert.equal(r.status, "CLOSED");
  assert.equal(r.reason, "يُفتح في 2026-09-01");
});

test("بعد الإغلاق مغلق", () => {
  const r = effectiveIntake("OPEN", null, d("2026-03-01"), now);
  assert.equal(r.status, "CLOSED");
  assert.equal(r.reason, "أُغلق في 2026-03-01");
});

test("يومُ الإغلاق مفتوحٌ كلُّه — لا يُغلق في منتصف ليلته", () => {
  assert.equal(effectiveIntake("CLOSED", null, d("2026-06-15"), now).status, "OPEN");
  // الحادية عشرة مساءً بالرياض من يوم الإغلاق — لا الحادية عشرة بـUTC، فتلك
  // صباحُ اليوم الذي بعده هناك.
  assert.equal(effectiveIntake("CLOSED", null, d("2026-06-15"), d("2026-06-15T20:00:00Z")).status, "OPEN");
  assert.equal(effectiveIntake("CLOSED", null, d("2026-06-14"), now).status, "CLOSED");
});

test("يومُ الفتح مفتوحٌ من أوّله", () => {
  assert.equal(effectiveIntake("CLOSED", d("2026-06-15"), null, d("2026-06-15T00:10:00Z")).status, "OPEN");
});

test("بتاريخِ فتحٍ وحده: السببُ يقول منذ متى", () => {
  assert.equal(effectiveIntake("CLOSED", d("2026-01-01"), null, now).reason, "مفتوحٌ من 2026-01-01");
});

// ── حالاتُ المنحة ──────────────────────────────────────────────────────────

test("حالةُ المنحة تُعرَّب، والمجهولُ يُعرض كما هو", () => {
  assert.equal(grantStatusLabel("APPROVED"), "مقبولة");
  assert.equal(grantStatusLabel("ODD"), "ODD");
});

// ── حدُّ اليوم بتوقيت الرياض ────────────────────────────────────────────────

test("اليومُ يُقلب عند منتصف ليل الرياض لا غرينتش", () => {
  // ١٣ نوفمبر الثانية فجراً بالرياض = ١٢ نوفمبر الحادية عشرة مساءً بـUTC.
  // والجهةُ تُغلق في ١٢، فالصبحُ الذي بعده مغلقٌ ولو كان UTC لا يزال في ١٢.
  const at2amRiyadh = new Date("2026-11-12T23:00:00Z");
  assert.equal(effectiveIntake("CLOSED", null, d("2026-11-12"), at2amRiyadh).status, "CLOSED");
  // وفي الحادية عشرة مساءً بالرياض من ١٢ نوفمبر: مفتوحٌ بعد.
  const at11pmRiyadh = new Date("2026-11-12T20:00:00Z");
  assert.equal(effectiveIntake("CLOSED", null, d("2026-11-12"), at11pmRiyadh).status, "OPEN");
});

test("يومُ الفتح يبدأ بمنتصف ليل الرياض", () => {
  // ١ ديسمبر الواحدة صباحاً بالرياض = ٣٠ نوفمبر العاشرة مساءً بـUTC.
  const at1amRiyadh = new Date("2026-11-30T22:00:00Z");
  assert.equal(effectiveIntake("CLOSED", d("2026-12-01"), null, at1amRiyadh).status, "OPEN");
});

// ── الحالةُ من حقلَي النموذج ───────────────────────────────────────────────

test("الحالةُ تُحسب من نصّ الحقلين كما تُحسب من التاريخين", () => {
  const at = new Date("2026-11-01T07:00:00Z");
  assert.equal(intakeFromInputs("CLOSED", "", "2026-11-19", at).status, "OPEN");
  assert.equal(intakeFromInputs("CLOSED", "2026-12-01", "", at).status, "CLOSED");
  assert.equal(intakeFromInputs("OPEN", "", "", at).mode, "MANUAL");
});

test("حقلٌ نصفُ مكتوبٍ لا يُقلب الحالة", () => {
  const at = new Date("2026-11-01T07:00:00Z");
  // المتصفّحُ يُرسل قيمةً ناقصةً أثناء الكتابة، فلا تُقرأ تاريخاً.
  assert.equal(intakeFromInputs("CLOSED", "", "2026-11", at).mode, "MANUAL");
  assert.equal(intakeFromInputs("CLOSED", "", "غير تاريخ", at).mode, "MANUAL");
});
