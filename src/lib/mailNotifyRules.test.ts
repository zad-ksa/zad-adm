import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  MAIL_SUBJECT_LIMIT,
  mailNotifySubject,
  mailNotifyTargets,
} from "./mailNotifyRules.ts";

test("الكاتبُ لا يُشعَر برسالته", () => {
  // المحادثةُ للفريقين والكاتبُ من فريقه، فلولا الاستثناءُ وصله إشعارٌ عن
  // رسالةٍ كتبها هو — ومرّةٌ واحدةٌ تكفي لأن يُهمَل الجُرسُ كلُّه.
  const targets = mailNotifyTargets(
    [{ employeeId: "a" }, { employeeId: "b" }, { employeeId: "c" }],
    "b"
  );
  assert.deepEqual(targets, ["a", "c"]);
});

test("ولا يُشعَر مرّتين وإن تكرّر صفُّه", () => {
  // موظَّفٌ في «إلى» و«نسخة» معاً له صفّان، فتُنشأ له إشعارتان عن رسالةٍ واحدة.
  const targets = mailNotifyTargets([
    { employeeId: "a" },
    { employeeId: "a" },
    { employeeId: "b" },
  ]);
  assert.deepEqual(targets, ["a", "b"]);
});

test("وأعضاءُ الجمعيات يُسقَطون: الجُرسُ لموظَّفي زاد", () => {
  const targets = mailNotifyTargets([
    { charityUserId: "x" },
    { employeeId: "a" },
    { charityUserId: "y" },
  ]);
  assert.deepEqual(targets, ["a"]);
});

test("ولا شيءَ من صفوفٍ خالية", () => {
  assert.deepEqual(mailNotifyTargets([]), []);
  assert.deepEqual(mailNotifyTargets([{ charityUserId: "x" }]), []);
  // والكاتبُ وحدَه مستلماً: لا إشعارَ، ولا خطأ.
  assert.deepEqual(mailNotifyTargets([{ employeeId: "a" }], "a"), []);
});

test("والمعدومُ في الاستثناء لا يُسقط أحداً", () => {
  // `excludeEmployeeId` قد يأتي معدوماً من مسارٍ لا كاتبَ موظَّفاً له — بريدُ
  // جمعيةٍ إلى زاد. فلا يُقارَن بالعدم فيُسقط صفّاً بلا `employeeId`.
  assert.deepEqual(mailNotifyTargets([{ employeeId: "a" }], null), ["a"]);
  assert.deepEqual(mailNotifyTargets([{ employeeId: "a" }], undefined), ["a"]);
  assert.deepEqual(mailNotifyTargets([{ employeeId: "a" }], ""), ["a"]);
});

test("الموضوعُ الفارغُ يُسمّى ولا يُترك", () => {
  assert.equal(mailNotifySubject(""), "(بلا موضوع)");
  assert.equal(mailNotifySubject("   "), "(بلا موضوع)");
  assert.equal(mailNotifySubject(null), "(بلا موضوع)");
  assert.equal(mailNotifySubject(undefined), "(بلا موضوع)");
});

test("والطويلُ يُقصَّر بعلامةِ قطعٍ ولا يتجاوز الحدّ", () => {
  const long = "ع".repeat(200);
  const out = mailNotifySubject(long);
  assert.equal(out.length, MAIL_SUBJECT_LIMIT);
  assert.ok(out.endsWith("…"));
  // وما كان على الحدِّ تماماً لا يُمَسّ.
  const exact = "ع".repeat(MAIL_SUBJECT_LIMIT);
  assert.equal(mailNotifySubject(exact), exact);
});

test("ويُقلَّم الطرفان", () => {
  assert.equal(mailNotifySubject("  تقرير الربع  "), "تقرير الربع");
});
