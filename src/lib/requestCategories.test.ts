import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REQUEST_CATEGORIES,
  chainForCategory,
  cleanRequestCategories,
  isRequestCategory,
  requestCategory,
  unroutedCategories,
  withoutCategories,
} from "./requestCategories.ts";

const chain = (
  id: string,
  categories: string[],
  { isActive = false, stepCount = 2 }: { isActive?: boolean; stepCount?: number } = {}
) => ({ id, categories, isActive, stepCount });

test("isRequestCategory / requestCategory: المعروفُ وحدَه", () => {
  assert.equal(isRequestCategory("الحوكمة"), true);
  assert.equal(isRequestCategory("قسمٌ مخترع"), false);
  assert.equal(requestCategory("زاد")?.label, "إدارة زاد");
  assert.equal(requestCategory(null), null);
  assert.equal(requestCategory("قسمٌ مخترع"), null);
});

test("cleanRequestCategories: يُسقط الغريبَ والمكرّر ويرتّب على القائمة", () => {
  assert.deepEqual(
    cleanRequestCategories(["المالية", "قسمٌ مخترع", "الحوكمة", "المالية", " الإعلامية "]),
    ["الحوكمة", "المالية", "الإعلامية"]
  );
  assert.deepEqual(cleanRequestCategories([]), []);
});

test("withoutCategories: ينزع ما أُسند إلى غيرها", () => {
  assert.deepEqual(withoutCategories(["المالية", "الحوكمة"], ["الحوكمة"]), ["المالية"]);
  assert.deepEqual(withoutCategories(["المالية"], ["الإعلامية"]), ["المالية"]);
});

test("chainForCategory: القسمُ يسبق التفعيل", () => {
  const chains = [chain("def", [], { isActive: true }), chain("media", ["الإعلامية"])];
  assert.equal(chainForCategory("الإعلامية", chains)?.id, "media");
  // وقسمٌ لم يُسند يسلك المفعَّلة.
  assert.equal(chainForCategory("الحوكمة", chains)?.id, "def");
  // وبلا قسمٍ أصلاً تبقى المفعَّلةُ — الطلبات القديمةُ بلا قسم.
  assert.equal(chainForCategory(null, chains)?.id, "def");
});

test("chainForCategory: سلسلةٌ بلا مستوياتٍ لا تُقبل مساراً", () => {
  const chains = [
    chain("def", [], { isActive: true }),
    chain("empty", ["الإعلامية"], { stepCount: 0 }),
  ];
  assert.equal(chainForCategory("الإعلامية", chains)?.id, "def");

  // ولا افتراضيَّ بلا مستويات: لا مسارَ، فيُرفض الرفعُ بسببٍ مفهوم.
  assert.equal(chainForCategory("الحوكمة", [chain("def", [], { isActive: true, stepCount: 0 })]), null);
  assert.equal(chainForCategory("الحوكمة", []), null);
});

test("unroutedCategories: ما بقي بلا سلسلةٍ خاصّة", () => {
  const all = REQUEST_CATEGORIES.map((c) => c.key);
  assert.deepEqual(unroutedCategories([]), all);

  const left = unroutedCategories([
    chain("a", ["المالية", "الحوكمة"], { isActive: true }),
    chain("b", ["الإعلامية"], { stepCount: 0 }),
  ]);
  assert.equal(left.includes("المالية"), false);
  assert.equal(left.includes("الحوكمة"), false);
  // وسلسلةٌ بلا مستوياتٍ لا تُعدّ إسناداً: قسمُها ما زال بلا مسار.
  assert.equal(left.includes("الإعلامية"), true);
});
