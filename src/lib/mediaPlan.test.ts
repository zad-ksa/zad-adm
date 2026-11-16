import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_LABELS,
  MEDIA_STATUS,
  allowedActions,
  attentionMark,
  can,
  compareByTime,
  diffSnapshots,
  lineHunks,
  eventKind,
  formatTime,
  isSafeLink,
  nextStatus,
  normalizeTime,
  platformKeyFrom,
  platformLetter,
  transition,
  samePlatforms,
  statusLabel,
  statusTone,
  toStatus,
  type MediaSnapshot,
} from "./mediaPlan.ts";

const SNAPSHOT: MediaSnapshot = {
  content: "نصٌّ أوّل",
  platforms: ["x", "instagram"],
  imageUrl: null,
  linkUrl: null,
  scheduledOn: "2026-12-11",
  scheduledAt: "13:00",
};

test("الجمعيةُ تعتمد أو تعدّل ما ينتظرها، ولا شيءَ غير ذلك", () => {
  assert.deepEqual(allowedActions(MEDIA_STATUS.PENDING_CHARITY, "CHARITY"), ["APPROVE", "EDIT"]);
});

test("المعتمدُ يعدّله أيُّ الطرفين، ولا يحذفه زاد", () => {
  assert.deepEqual(allowedActions(MEDIA_STATUS.FINAL, "CHARITY"), ["EDIT"]);
  assert.deepEqual(allowedActions(MEDIA_STATUS.FINAL, "ZAD"), ["EDIT"]);
  assert.equal(can("DELETE", MEDIA_STATUS.FINAL, "ZAD"), false);
});

test("تعديلُ المعتمد ينتظر الطرفَ الآخر، والمعتمدُ أصلُه", () => {
  const byCharity = transition("EDIT", MEDIA_STATUS.FINAL, "CHARITY", null);
  assert.equal(byCharity.status, MEDIA_STATUS.PENDING_ZAD);
  assert.equal(byCharity.base, "capture");
  assert.equal(byCharity.baseKind, "FINAL");
  assert.equal(nextStatus("EDIT", MEDIA_STATUS.FINAL, "ZAD"), MEDIA_STATUS.PENDING_CHARITY);
});

test("المراجِعُ يعتمد أو يردّ، ولا يعدّل فوق تعديل غيره", () => {
  assert.deepEqual(allowedActions(MEDIA_STATUS.PENDING_ZAD, "ZAD", "FINAL"), ["CERTIFY", "REJECT"]);
  assert.deepEqual(allowedActions(MEDIA_STATUS.PENDING_CHARITY, "CHARITY", "FINAL"), ["APPROVE", "REJECT"]);
  assert.equal(can("EDIT", MEDIA_STATUS.PENDING_ZAD, "ZAD", "DRAFT"), false);
});

test("ومنشورٌ جديدٌ من زاد: تعتمده الجمعيةُ أو تعدّله", () => {
  assert.deepEqual(allowedActions(MEDIA_STATUS.PENDING_CHARITY, "CHARITY"), ["APPROVE", "EDIT"]);
  const edit = transition("EDIT", MEDIA_STATUS.PENDING_CHARITY, "CHARITY", null);
  assert.equal(edit.status, MEDIA_STATUS.PENDING_ZAD);
  assert.equal(edit.baseKind, "DRAFT");
});

test("صاحبُ التعديل يزيد عليه ما شاء — طلبٌ واحدٌ لا يُنبَّه به مرّتين", () => {
  const again = transition("EDIT", MEDIA_STATUS.PENDING_ZAD, "CHARITY", "FINAL");
  assert.equal(again.status, MEDIA_STATUS.PENDING_ZAD);
  assert.equal(again.base, "keep");
  assert.equal(again.notify, false);
});

test("الردُّ يعيد الأصل: المعتمدُ معتمداً، وما وضعه زادٌ إلى انتظار الجمعية", () => {
  assert.equal(nextStatus("REJECT", MEDIA_STATUS.PENDING_ZAD, "ZAD", "FINAL"), MEDIA_STATUS.FINAL);
  assert.equal(nextStatus("REJECT", MEDIA_STATUS.PENDING_CHARITY, "CHARITY", "FINAL"), MEDIA_STATUS.FINAL);
  assert.equal(nextStatus("REJECT", MEDIA_STATUS.PENDING_ZAD, "ZAD", "DRAFT"), MEDIA_STATUS.PENDING_CHARITY);
  assert.equal(can("REJECT", MEDIA_STATUS.PENDING_CHARITY, "CHARITY", null), false);
});

test("الاعتمادُ من أيِّ الطرفين يجعله معتمداً ويمحو الأصل", () => {
  const t = transition("CERTIFY", MEDIA_STATUS.PENDING_ZAD, "ZAD", "DRAFT");
  assert.equal(t.status, MEDIA_STATUS.FINAL);
  assert.equal(t.base, "clear");
  assert.equal(nextStatus("APPROVE", MEDIA_STATUS.PENDING_CHARITY, "CHARITY"), MEDIA_STATUS.FINAL);
});

test("الحذفُ لزادٍ فيما لم يُعتمد قطّ", () => {
  assert.equal(can("DELETE", MEDIA_STATUS.PENDING_CHARITY, "ZAD"), true);
  assert.equal(can("DELETE", MEDIA_STATUS.PENDING_ZAD, "ZAD", "DRAFT"), true);
  assert.equal(can("DELETE", MEDIA_STATUS.PENDING_CHARITY, "ZAD", "FINAL"), false);
  assert.equal(can("DELETE", MEDIA_STATUS.PENDING_ZAD, "CHARITY", "DRAFT"), false);
});

test("فعلٌ غيرُ مُجازٍ يُرمى ولا يُعيد حالةً صامتة", () => {
  assert.throws(() => nextStatus("APPROVE", MEDIA_STATUS.FINAL, "CHARITY"));
});

test("فتحُ النهائيِّ يُسمّى باسمه في السجلّ، لا «عدّله زاد»", () => {
  assert.equal(eventKind("EDIT", MEDIA_STATUS.FINAL, "ZAD"), "REOPENED_BY_ZAD");
  assert.equal(eventKind("EDIT", MEDIA_STATUS.PENDING_CHARITY, "ZAD"), "EDITED_BY_ZAD");
  assert.equal(eventKind("EDIT", MEDIA_STATUS.PENDING_CHARITY, "CHARITY"), "EDITED_BY_CHARITY");
});

test("الوسمُ يختلف بالجهة: «بانتظار اعتمادكم» للجمعية، و«اعتماد الجمعية» لزاد", () => {
  assert.equal(statusLabel(MEDIA_STATUS.PENDING_CHARITY, "CHARITY"), "بانتظار اعتمادكم");
  assert.equal(statusLabel(MEDIA_STATUS.PENDING_CHARITY, "ZAD"), "بانتظار اعتماد الجمعية");
});

test("ولا تشكيلَ في وسمٍ يقرؤه المستخدم", () => {
  // التشكيلُ في النصِّ المعروض طلبُ صاحب الموقع: يُكتب كما يكتب الناس.
  const shown = [
    statusLabel(MEDIA_STATUS.FINAL, "CHARITY"),
    statusLabel(MEDIA_STATUS.PENDING_CHARITY, "CHARITY"),
    statusLabel(MEDIA_STATUS.PENDING_ZAD, "CHARITY"),
    statusLabel(MEDIA_STATUS.PENDING_ZAD, "ZAD"),
    attentionMark(MEDIA_STATUS.PENDING_CHARITY, "CHARITY") ?? "",
    attentionMark(MEDIA_STATUS.PENDING_ZAD, "ZAD") ?? "",
    ...Object.values(EVENT_LABELS),
  ];
  for (const text of shown) {
    assert.ok(!/[ً-ْ]/.test(text), `فيه تشكيل: ${text}`);
  }
});

test("والكهرمانيُّ لمن ينتظره الفعل وحدَه", () => {
  assert.equal(statusTone(MEDIA_STATUS.PENDING_ZAD, "ZAD"), "warn");
  assert.equal(statusTone(MEDIA_STATUS.PENDING_ZAD, "CHARITY"), "neutral");
  assert.equal(statusTone(MEDIA_STATUS.FINAL, "ZAD"), "good");
});

test("حالةٌ مجهولةٌ تُقرأ منتظِرةً لا نهائيّة", () => {
  assert.equal(toStatus("WHATEVER"), MEDIA_STATUS.PENDING_CHARITY);
  assert.equal(toStatus(null), MEDIA_STATUS.PENDING_CHARITY);
  assert.equal(toStatus("FINAL"), MEDIA_STATUS.FINAL);
});

test("الفرقُ يُحسب حقلاً حقلاً، ويُسمّي المنصّات لا مفاتيحها", () => {
  const changes = diffSnapshots(
    SNAPSHOT,
    { ...SNAPSHOT, content: "نصٌّ ثانٍ", platforms: ["x"], linkUrl: "https://zad-co.sa" },
    (key) => (key === "x" ? "إكس" : "إنستغرام")
  );
  assert.deepEqual(
    changes.map((c) => c.field),
    ["content", "platforms", "linkUrl"]
  );
  assert.equal(changes[1].before, "إكس، إنستغرام");
  assert.equal(changes[1].after, "إكس");
  assert.equal(changes[2].before, "—");
});

test("وإعادةُ ترتيب المنصّات ليست تعديلاً يُعمَّد", () => {
  assert.deepEqual(diffSnapshots(SNAPSHOT, { ...SNAPSHOT, platforms: ["instagram", "x"] }), []);
  assert.equal(samePlatforms(["a", "b"], ["b", "a", "a"]), true);
  assert.equal(samePlatforms(["a"], ["a", "b"]), false);
});

test("الوقتُ يُقوَّم أو يُهمَل، ولا يكسر الحفظ", () => {
  assert.equal(normalizeTime("9:5"), "09:05");
  assert.equal(normalizeTime("23:59"), "23:59");
  assert.equal(normalizeTime("24:00"), null);
  assert.equal(normalizeTime("مساءً"), null);
  assert.equal(normalizeTime(""), null);
});

test("ويُقرأ باثنتي عشرة", () => {
  assert.equal(formatTime("13:00"), "1:00 م");
  assert.equal(formatTime("00:30"), "12:30 ص");
  assert.equal(formatTime(null), "");
});

test("ما لا وقتَ له يأتي في آخر اليوم لا في أوّله", () => {
  const sorted = [{ scheduledAt: null }, { scheduledAt: "08:00" }, { scheduledAt: "20:00" }].sort(compareByTime);
  assert.deepEqual(
    sorted.map((p) => p.scheduledAt),
    ["08:00", "20:00", null]
  );
});

test("الرابطُ http(s) وحدَه", () => {
  assert.equal(isSafeLink("https://allmylinks.com/krmalwfada"), true);
  assert.equal(isSafeLink("http://zad-co.sa"), true);
  assert.equal(isSafeLink("javascript:alert(1)"), false);
  assert.equal(isSafeLink("zad-co.sa"), false);
  assert.equal(isSafeLink(null), false);
});

test("مفتاحُ منصّةٍ جديدةٍ لا يدهس مفتاحاً قائماً", () => {
  assert.equal(platformKeyFrom("Threads"), "threads");
  assert.equal(platformKeyFrom("Threads", ["threads"]), "threads-2");
  assert.equal(platformKeyFrom("Threads", ["threads", "threads-2"]), "threads-3");
  // اسمٌ عربيٌّ خالصٌ لا يُخرج مفتاحاً فارغاً.
  assert.equal(platformKeyFrom("منصّة محلّية", ["platform"]), "platform-2");
});

test("وحرفُ البديل أوّلُ حرفٍ لا أوّلُ بايت", () => {
  assert.equal(platformLetter("إنستغرام"), "إ");
  assert.equal(platformLetter("  "), "؟");
});

test("attentionMark: الوسمُ لمن ينتظره فعلٌ منه وحدَه", () => {
  assert.equal(attentionMark(MEDIA_STATUS.PENDING_CHARITY, "CHARITY"), "للاعتماد");
  assert.equal(attentionMark(MEDIA_STATUS.PENDING_CHARITY, "ZAD"), null);
  assert.equal(attentionMark(MEDIA_STATUS.PENDING_ZAD, "ZAD"), "معدل");
  assert.equal(attentionMark(MEDIA_STATUS.PENDING_ZAD, "CHARITY"), null);
  assert.equal(attentionMark(MEDIA_STATUS.FINAL, "ZAD"), null);
  assert.equal(attentionMark(MEDIA_STATUS.FINAL, "CHARITY"), null);
});

test("السجلُّ يعرض المقطعَ المعدَّل وحدَه لا النصَّ كلَّه", () => {
  assert.deepEqual(lineHunks("أ\nب\nج", "أ\nب٢\nج"), [{ removed: ["ب"], added: ["ب٢"] }]);
  assert.deepEqual(lineHunks("أ\nب", "أ\n\nب"), [{ removed: [], added: [""] }]);
  assert.deepEqual(lineHunks("نص", "نص"), []);
});

test("حقلٌ لم يلتقطه سجلٌّ قديم لا يظهر محذوفاً", () => {
  const old = { ...SNAPSHOT };
  delete (old as { title?: string | null }).title;
  const changes = diffSnapshots(old, { ...SNAPSHOT, title: "عنوان" });
  assert.deepEqual(changes.map((c) => c.field), []);
});
