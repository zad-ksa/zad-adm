import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FINANCIAL_CATEGORY,
  REQUEST_CATEGORIES,
  chainForCategory,
  cleanRequestCategories,
  defaultChains,
  isRequestCategory,
  requestCategory,
  unroutedCategories,
  withoutCategories,
} from "./requestCategories.ts";

const chain = (
  id: string,
  categories: string[],
  { isActive = true, stepCount = 2 }: { isActive?: boolean; stepCount?: number } = {}
) => ({ id, categories, isActive, stepCount });

test("isRequestCategory / requestCategory: المعروفُ وحدَه", () => {
  assert.equal(isRequestCategory("الحوكمة"), true);
  assert.equal(isRequestCategory("قسمٌ مخترع"), false);
  assert.equal(requestCategory("زاد")?.label, "إدارة زاد");
  assert.equal(requestCategory(null), null);
  assert.equal(requestCategory("قسمٌ مخترع"), null);
  // وخدمةُ الطلب المالي خدمةٌ من القائمة لا قيمةٌ خاصّة.
  assert.equal(isRequestCategory(FINANCIAL_CATEGORY), true);
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

test("chainForCategory: الخدمةُ تسبق الافتراضيّة، وتُفعَّل سلاسلُ معاً", () => {
  const chains = [chain("def", []), chain("media", ["الإعلامية"]), chain("money", ["المالية"])];
  assert.equal(chainForCategory("الإعلامية", chains)?.id, "media");
  assert.equal(chainForCategory(FINANCIAL_CATEGORY, chains)?.id, "money");
  // وخدمةٌ لم تُسند تسلك المفعَّلةَ بلا خدمات.
  assert.equal(chainForCategory("الحوكمة", chains)?.id, "def");
  // وبلا خدمةٍ أصلاً تبقى الافتراضيّةُ — الطلبات القديمةُ بلا قسم.
  assert.equal(chainForCategory(null, chains)?.id, "def");
});

test("chainForCategory: المعطَّلةُ لا تُمرّر، وخدماتُها تسقط إلى الافتراضيّة", () => {
  const chains = [chain("def", []), chain("media", ["الإعلامية"], { isActive: false })];
  assert.equal(chainForCategory("الإعلامية", chains)?.id, "def");

  // وبلا افتراضيّةٍ لا مسارَ: الرفعُ يُرفض بسببٍ مفهوم.
  assert.equal(chainForCategory("الإعلامية", [chain("media", ["الإعلامية"], { isActive: false })]), null);
});

test("chainForCategory: سلسلةٌ بلا مستوياتٍ لا تُقبل مساراً", () => {
  const chains = [chain("def", []), chain("empty", ["الإعلامية"], { stepCount: 0 })];
  assert.equal(chainForCategory("الإعلامية", chains)?.id, "def");

  assert.equal(chainForCategory("الحوكمة", [chain("def", [], { stepCount: 0 })]), null);
  assert.equal(chainForCategory("الحوكمة", []), null);
});

test("chainForCategory: مفعَّلةٌ بخدماتٍ لا تكون افتراضيّة", () => {
  // لو قيل «أيُّ مفعَّلةٍ» لصارت سلسلةُ الإعلاميةِ مسارَ كلِّ شيء.
  assert.equal(chainForCategory("الحوكمة", [chain("media", ["الإعلامية"])]), null);
});

test("defaultChains: المفعَّلةُ بلا خدمات، وأكثرُ من واحدةٍ خبرٌ ملتبس", () => {
  assert.deepEqual(defaultChains([chain("a", []), chain("b", ["المالية"])]).map((c) => c.id), ["a"]);
  assert.deepEqual(defaultChains([chain("a", []), chain("b", [])]).map((c) => c.id), ["a", "b"]);
  assert.deepEqual(defaultChains([chain("a", [], { isActive: false })]), []);
  assert.deepEqual(defaultChains([chain("a", [], { stepCount: 0 })]), []);
});

test("unroutedCategories: ما بقي بلا سلسلةٍ عاملة", () => {
  const all = REQUEST_CATEGORIES.map((c) => c.key);
  assert.deepEqual(unroutedCategories([]), all);

  const left = unroutedCategories([
    chain("a", ["المالية", "الحوكمة"]),
    chain("b", ["الإعلامية"], { stepCount: 0 }),
    chain("c", ["التقنية"], { isActive: false }),
  ]);
  assert.equal(left.includes("المالية"), false);
  assert.equal(left.includes("الحوكمة"), false);
  // وسلسلةٌ بلا مستوياتٍ أو معطَّلةٌ ليست إسناداً عاملاً.
  assert.equal(left.includes("الإعلامية"), true);
  assert.equal(left.includes("التقنية"), true);
});
