import test from "node:test";
import assert from "node:assert/strict";
import {
  MEDIA_STATUS,
  allowedActions,
  can,
  compareByTime,
  diffSnapshots,
  eventKind,
  formatTime,
  isSafeLink,
  nextStatus,
  normalizeTime,
  platformKeyFrom,
  platformLetter,
  requiresNote,
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

test("النهائيُّ مقفولٌ على الجمعية — لا تعديلَ ولا اعتمادَ ثانياً", () => {
  assert.deepEqual(allowedActions(MEDIA_STATUS.FINAL, "CHARITY"), []);
  assert.equal(can("EDIT", MEDIA_STATUS.FINAL, "CHARITY"), false);
});

test("والنهائيُّ مفتوحٌ لزادٍ وحدَه، تعديلاً لا حذفاً", () => {
  assert.deepEqual(allowedActions(MEDIA_STATUS.FINAL, "ZAD"), ["EDIT"]);
  assert.equal(can("DELETE", MEDIA_STATUS.FINAL, "ZAD"), false);
});

test("اعتمادُ الجمعية وتعميدُ زادٍ كلاهما يُنهي المنشور", () => {
  assert.equal(nextStatus("APPROVE", MEDIA_STATUS.PENDING_CHARITY, "CHARITY"), MEDIA_STATUS.FINAL);
  assert.equal(nextStatus("CERTIFY", MEDIA_STATUS.PENDING_ZAD, "ZAD"), MEDIA_STATUS.FINAL);
});

test("تعديلُ الجمعية يرفعه إلى تعميد زاد، وردُّ زادٍ يُعيده إليها", () => {
  assert.equal(nextStatus("EDIT", MEDIA_STATUS.PENDING_CHARITY, "CHARITY"), MEDIA_STATUS.PENDING_ZAD);
  assert.equal(nextStatus("REJECT", MEDIA_STATUS.PENDING_ZAD, "ZAD"), MEDIA_STATUS.PENDING_CHARITY);
});

test("وتعديلُ زادٍ لنهائيٍّ يُعيده إلى اعتماد الجمعية — لا يُنشر باسمها ما لم ترَه", () => {
  assert.equal(nextStatus("EDIT", MEDIA_STATUS.FINAL, "ZAD"), MEDIA_STATUS.PENDING_CHARITY);
});

test("فعلٌ غيرُ مُجازٍ يُرمى ولا يُعيد حالةً صامتة", () => {
  assert.throws(() => nextStatus("APPROVE", MEDIA_STATUS.FINAL, "CHARITY"));
});

test("السببُ يلزم في ردِّ التعديل وفي فتح النهائيّ، لا في غيرهما", () => {
  assert.equal(requiresNote("REJECT", MEDIA_STATUS.PENDING_ZAD, "ZAD"), true);
  assert.equal(requiresNote("EDIT", MEDIA_STATUS.FINAL, "ZAD"), true);
  assert.equal(requiresNote("EDIT", MEDIA_STATUS.PENDING_CHARITY, "ZAD"), false);
  assert.equal(requiresNote("EDIT", MEDIA_STATUS.PENDING_CHARITY, "CHARITY"), false);
});

test("فتحُ النهائيِّ يُسمّى باسمه في السجلّ، لا «عدّله زاد»", () => {
  assert.equal(eventKind("EDIT", MEDIA_STATUS.FINAL, "ZAD"), "REOPENED_BY_ZAD");
  assert.equal(eventKind("EDIT", MEDIA_STATUS.PENDING_CHARITY, "ZAD"), "EDITED_BY_ZAD");
  assert.equal(eventKind("EDIT", MEDIA_STATUS.PENDING_CHARITY, "CHARITY"), "EDITED_BY_CHARITY");
});

test("الوسمُ يختلف بالجهة: «ينتظر اعتمادكم» للجمعية، «ينتظر الجمعية» لزاد", () => {
  assert.equal(statusLabel(MEDIA_STATUS.PENDING_CHARITY, "CHARITY"), "ينتظر اعتمادكم");
  assert.equal(statusLabel(MEDIA_STATUS.PENDING_CHARITY, "ZAD"), "ينتظر اعتماد الجمعية");
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
