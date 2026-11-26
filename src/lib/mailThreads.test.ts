import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  groupMailThreads,
  threadIdOf,
  threadPage,
  type ThreadSeed,
} from "./mailThreads.ts";

function seed(over: Partial<ThreadSeed> & { mailId: string; threadId: string; createdAt: string }): ThreadSeed {
  return {
    rowId: `row-${over.mailId}`,
    isRead: true,
    isStarred: false,
    ...over,
  };
}

test("جذرُ السلسلة: الرسالةُ نفسُها إن لم تكن ردّاً", () => {
  assert.equal(threadIdOf({ id: "m1", parentId: null }), "m1");
  assert.equal(threadIdOf({ id: "m2", parentId: "m1" }), "m1");
  assert.equal(threadIdOf({ id: "m3" }), "m3");
});

test("الردُّ ورسالتُه سلسلةٌ واحدة، لا صفّان", () => {
  const threads = groupMailThreads([
    seed({ mailId: "m2", threadId: "m1", createdAt: "2026-11-02T10:00:00Z" }),
    seed({ mailId: "m1", threadId: "m1", createdAt: "2026-11-01T10:00:00Z" }),
  ]);
  assert.equal(threads.length, 1);
  assert.equal(threads[0].count, 2);
  // المعروضُ في السطر هو الأحدث، كجيميل.
  assert.equal(threads[0].latestMailId, "m2");
  // والقائمةُ من الأقدم إلى الأحدث: ترتيبُ المحادثة كما تُقرأ.
  assert.deepEqual(threads[0].mailIds, ["m1", "m2"]);
  assert.deepEqual(threads[0].rowIds, ["row-m1", "row-m2"]);
});

test("الأحدثُ يُحسب بالمقارنة لا بأوّل ما وصل", () => {
  // الصفوفُ هنا تصاعديّة، وفي الاستعلام تنازليّة — والجوابُ واحد.
  const ascending = groupMailThreads([
    seed({ mailId: "m1", threadId: "m1", createdAt: "2026-11-01T10:00:00Z" }),
    seed({ mailId: "m2", threadId: "m1", createdAt: "2026-11-02T10:00:00Z" }),
  ]);
  assert.equal(ascending[0].latestMailId, "m2");
});

test("سلسلةٌ فيها رسالةٌ لم تُقرأ: غيرُ مقروءة", () => {
  const threads = groupMailThreads([
    seed({ mailId: "m1", threadId: "m1", createdAt: "2026-11-01T10:00:00Z", isRead: true }),
    seed({ mailId: "m2", threadId: "m1", createdAt: "2026-11-02T10:00:00Z", isRead: false }),
  ]);
  assert.equal(threads[0].isUnread, true);
});

test("وسلسلةٌ قُرئت كلُّها: مقروءة", () => {
  const threads = groupMailThreads([
    seed({ mailId: "m1", threadId: "m1", createdAt: "2026-11-01T10:00:00Z", isRead: true }),
    seed({ mailId: "m2", threadId: "m1", createdAt: "2026-11-02T10:00:00Z", isRead: true }),
  ]);
  assert.equal(threads[0].isUnread, false);
});

test("النجمةُ على رسالةٍ تُميِّز السلسلة", () => {
  const threads = groupMailThreads([
    seed({ mailId: "m1", threadId: "m1", createdAt: "2026-11-01T10:00:00Z", isStarred: false }),
    seed({ mailId: "m2", threadId: "m1", createdAt: "2026-11-02T10:00:00Z", isStarred: true }),
  ]);
  assert.equal(threads[0].isStarred, true);
});

test("الترتيبُ بالأحدث نشاطاً: سلسلةٌ قديمةٌ ردٌّ عليها اليوم تتقدَّم", () => {
  const threads = groupMailThreads([
    seed({ mailId: "new", threadId: "new", createdAt: "2026-11-10T10:00:00Z" }),
    seed({ mailId: "old", threadId: "old", createdAt: "2026-01-01T10:00:00Z" }),
    seed({ mailId: "old-reply", threadId: "old", createdAt: "2026-11-20T10:00:00Z" }),
  ]);
  assert.deepEqual(
    threads.map((t) => t.threadId),
    ["old", "new"]
  );
});

test("وعند تساوي الوقت ترتيبٌ ثابت، فلا يختلف من طلبٍ إلى آخر", () => {
  const at = "2026-11-10T10:00:00Z";
  const first = groupMailThreads([
    seed({ mailId: "b", threadId: "b", createdAt: at }),
    seed({ mailId: "a", threadId: "a", createdAt: at }),
  ]);
  const second = groupMailThreads([
    seed({ mailId: "a", threadId: "a", createdAt: at }),
    seed({ mailId: "b", threadId: "b", createdAt: at }),
  ]);
  assert.deepEqual(
    first.map((t) => t.threadId),
    second.map((t) => t.threadId)
  );
});

test("لا صفوفَ: لا سلاسل", () => {
  assert.deepEqual(groupMailThreads([]), []);
});

test("تاريخٌ غيرُ مقروءٍ لا يُسقط الصفّ", () => {
  const threads = groupMailThreads([
    seed({ mailId: "m1", threadId: "m1", createdAt: "ليس تاريخاً" }),
  ]);
  assert.equal(threads.length, 1);
  assert.equal(threads[0].lastAt, 0);
});

test("الترقيمُ على السلاسل", () => {
  const list = [1, 2, 3, 4, 5];
  assert.deepEqual(threadPage(list, 1, 2), [1, 2]);
  assert.deepEqual(threadPage(list, 3, 2), [5]);
  assert.deepEqual(threadPage(list, 4, 2), []);
  // صفحةٌ صفرٌ أو سالبةٌ تُقرأ أولى، فلا تُرجع قائمةً فارغةً بلا سبب.
  assert.deepEqual(threadPage(list, 0, 2), [1, 2]);
});
