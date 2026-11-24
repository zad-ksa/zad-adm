import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DOC_REQUEST_SETTINGS,
  DOC_QUEUE_MODES,
  DOC_REQUEST_STATUSES,
  MAX_DOC_DAYS,
  MIN_DOC_DAYS,
  cleanDocDate,
  cleanDocRequest,
  docQueueModeLabel,
  docRequestCan,
  docRequestStatusHint,
  docRequestStatusLabel,
  docRequestStatusOf,
  docRequestStatusTone,
  normalizeDocRequestSettings,
} from "./docRequests.ts";

// ── الأحوال ────────────────────────────────────────────────────────────────

test("الأحوالُ أربعٌ لكلٍّ تسميةٌ ونبرةٌ وسطرٌ للجمعية", () => {
  assert.equal(DOC_REQUEST_STATUSES.length, 4);
  for (const s of DOC_REQUEST_STATUSES) {
    assert.ok(s.label.length > 0);
    assert.ok(s.charityHint.length > 0);
  }
});

test("حالٌ مجهولةٌ تعود إلى «قيد التنفيذ» لا تُسقط الشاشة", () => {
  assert.equal(docRequestStatusOf("WAT"), "PENDING");
  assert.equal(docRequestStatusOf("COMPLETED"), "COMPLETED");
  assert.equal(docRequestStatusLabel("WAT"), "قيد التنفيذ");
  assert.equal(docRequestStatusTone("COMPLETED"), "good");
  assert.ok(docRequestStatusHint("RETURNED").length > 0);
});

// ── ما يجوز ────────────────────────────────────────────────────────────────

test("الكتابةُ والتسليمُ والردُّ ما دام في الدور", () => {
  const can = docRequestCan("PENDING");
  assert.deepEqual(
    { g: can.generate, d: can.deliver, r: can.returnToCharity },
    { g: true, d: true, r: true }
  );
  assert.equal(can.approve, false);
});

test("والتعميدُ لما سُلّم وحدَه", () => {
  assert.equal(docRequestCan("AWAITING_REVIEW").approve, true);
  assert.equal(docRequestCan("PENDING").approve, false);
  assert.equal(docRequestCan("COMPLETED").approve, false);
});

test("وإعادةُ الإرسال لما رُدّ وحدَه", () => {
  assert.equal(docRequestCan("RETURNED").resubmit, true);
  assert.equal(docRequestCan("PENDING").resubmit, false);
});

test("والمعمَّدُ لا يُفعل به شيء", () => {
  const can = docRequestCan("COMPLETED");
  assert.deepEqual(Object.values(can).filter(Boolean), []);
});

test("والتعديلُ ما لم يُسلَّم", () => {
  assert.equal(docRequestCan("PENDING").edit, true);
  assert.equal(docRequestCan("RETURNED").edit, true);
  assert.equal(docRequestCan("AWAITING_REVIEW").edit, false);
});

// ── التنظيف ────────────────────────────────────────────────────────────────

test("الفكرةُ وحدَها إلزاميّة", () => {
  const bad = cleanDocRequest({ programIdea: "   " });
  assert.equal(bad.ok, false);
  const good = cleanDocRequest({ programIdea: "برنامج لتأهيل الأسر المنتجة" });
  assert.equal(good.ok, true);
});

test("وما عداها يُنظَّف ويصير عدماً إن فرغ", () => {
  const res = cleanDocRequest({ programIdea: "فكرة", programName: "   ", targetCategory: "  الأيتام  " });
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.value.programName, null);
  assert.equal(res.value.targetCategory, "الأيتام");
});

test("التاريخُ يُفحص شكلاً", () => {
  assert.equal(cleanDocDate("2026-11-23"), "2026-11-23");
  assert.equal(cleanDocDate("23/11/2026"), null);
  assert.equal(cleanDocDate(""), null);
  assert.equal(cleanDocDate(undefined), null);
});

test("ونهايةٌ قبل بدايةٍ تُردّ", () => {
  const res = cleanDocRequest({ programIdea: "فكرة", startDate: "2026-12-01", endDate: "2026-11-01" });
  assert.equal(res.ok, false);
  if (res.ok) return;
  assert.match(res.error, /النهاية/);
});

test("وتاريخان متساويان يجوزان — يومٌ واحد", () => {
  const res = cleanDocRequest({ programIdea: "فكرة", startDate: "2026-12-01", endDate: "2026-12-01" });
  assert.equal(res.ok, true);
});

test("المبلغُ لا يُحفظ بلا تضمين الميزانية", () => {
  const off = cleanDocRequest({ programIdea: "فكرة", budgetInclude: false, budgetTotal: "50000" });
  assert.equal(off.ok, true);
  if (!off.ok) return;
  assert.equal(off.value.budgetTotal, null);
  assert.equal(off.value.budgetInclude, false);

  const on = cleanDocRequest({ programIdea: "فكرة", budgetInclude: true, budgetTotal: " 50000 " });
  assert.equal(on.ok, true);
  if (!on.ok) return;
  assert.equal(on.value.budgetTotal, "50000");
});

test("والنصُّ الطويلُ يُقَصّ ولا يُردّ", () => {
  const res = cleanDocRequest({ programIdea: "ف".repeat(9000), note: "ن".repeat(5000) });
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.value.programIdea.length, 4000);
  assert.equal(res.value.note?.length, 1000);
});

// ── الإعدادات ──────────────────────────────────────────────────────────────

test("إعدادٌ فارغٌ أو فاسدٌ يعود إلى الافتراضي", () => {
  assert.deepEqual(normalizeDocRequestSettings(null), DEFAULT_DOC_REQUEST_SETTINGS);
  assert.deepEqual(normalizeDocRequestSettings("نص"), DEFAULT_DOC_REQUEST_SETTINGS);
  assert.deepEqual(normalizeDocRequestSettings({ defaultWorkingDays: "كثير" }), DEFAULT_DOC_REQUEST_SETTINGS);
});

test("والأيامُ تُحصر بين الحدّين وتُدوَّر", () => {
  assert.equal(normalizeDocRequestSettings({ defaultWorkingDays: 0 }).defaultWorkingDays, MIN_DOC_DAYS);
  assert.equal(normalizeDocRequestSettings({ defaultWorkingDays: 999 }).defaultWorkingDays, MAX_DOC_DAYS);
  assert.equal(normalizeDocRequestSettings({ defaultWorkingDays: 4.6 }).defaultWorkingDays, 5);
});

test("والدورُ هو الافتراضيّ، ولا يُقبل إلّا المعروفان", () => {
  assert.equal(normalizeDocRequestSettings({}).queueMode, "QUEUE");
  assert.equal(normalizeDocRequestSettings({ queueMode: "PARALLEL" }).queueMode, "PARALLEL");
  assert.equal(normalizeDocRequestSettings({ queueMode: "RANDOM" }).queueMode, "QUEUE");
});

test("ولكلِّ نمطٍ تسميةٌ وشرح", () => {
  assert.equal(DOC_QUEUE_MODES.length, 2);
  assert.equal(docQueueModeLabel("QUEUE"), "بالدور");
  assert.equal(docQueueModeLabel("PARALLEL"), "في وقت واحد");
  for (const m of DOC_QUEUE_MODES) assert.ok(m.hint.length > 0);
});

// ── نوعُ الطلب ومرفقاته ────────────────────────────────────────────────────

const FILE = { url: "https://files.example/a.docx", name: "وثيقتنا.docx", size: 1200 };

test("طلبُ المراجعة يلزمه مرفق، ولا يلزمه فكرة", () => {
  const empty = cleanDocRequest({ kind: "REVIEW", note: "راجعوا الميزانية" });
  assert.equal(empty.ok, false);

  const res = cleanDocRequest({ kind: "REVIEW", attachments: [FILE], note: " راجعوا الميزانية " });
  assert.ok(res.ok);
  assert.equal(res.value.kind, "REVIEW");
  assert.equal(res.value.programIdea, "");
  assert.equal(res.value.note, "راجعوا الميزانية");
  assert.deepEqual(res.value.attachments, [FILE]);
});

test("والمراجعةُ لا تحمل حقولَ مبادرةٍ ولو أُرسلت", () => {
  const res = cleanDocRequest({
    kind: "REVIEW",
    attachments: [FILE],
    programName: "اسم",
    budgetInclude: true,
    budgetTotal: "1000",
  });
  assert.ok(res.ok);
  assert.equal(res.value.programName, null);
  assert.equal(res.value.budgetInclude, false);
  assert.equal(res.value.budgetTotal, null);
});

test("طلبُ الإنشاء: المرفقُ اختياريّ، والنوعُ الافتراضيّ إنشاء", () => {
  const plain = cleanDocRequest({ programIdea: "فكرة" });
  assert.ok(plain.ok);
  assert.equal(plain.value.kind, "CREATE");
  assert.equal(plain.value.attachments, null);

  const withFile = cleanDocRequest({ programIdea: "فكرة", attachments: [FILE] });
  assert.ok(withFile.ok);
  assert.deepEqual(withFile.value.attachments, [FILE]);

  // والفكرةُ ما زالت إلزاميّةً في الإنشاء ولو أُرفق ملف.
  assert.equal(cleanDocRequest({ attachments: [FILE] }).ok, false);
});

test("المرفقاتُ الفاسدةُ تُسقط، ولا تتجاوز خمسة", () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ ...FILE, url: `${FILE.url}?${i}` }));
  const res = cleanDocRequest({
    kind: "REVIEW",
    attachments: [{ url: "", name: "x", size: null }, { url: "u" } as never, ...many],
  });
  assert.ok(res.ok);
  assert.equal(res.value.attachments!.length, 5);
});
