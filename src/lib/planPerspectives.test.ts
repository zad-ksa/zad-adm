import test from "node:test";
import assert from "node:assert/strict";
import { GRANT_PERSPECTIVE_PREFIXES, isGrantPerspective, perspectiveLabel } from "./planPerspectives.ts";

test("المنظوران اثنان: المستفيدون والعمليات الداخلية", () => {
  assert.deepEqual([...GRANT_PERSPECTIVE_PREFIXES], ["س", "ل"]);
  assert.equal(isGrantPerspective("س"), true);
  assert.equal(isGrantPerspective("ل"), true);
});

test("وما عداهما يُستثنى — التعلّمُ والنموُّ والماليُّ وأصحابُ المصلحة", () => {
  assert.equal(isGrantPerspective("ت"), false);
  assert.equal(isGrantPerspective("م"), false);
  assert.equal(isGrantPerspective("ص"), false);
  assert.equal(isGrantPerspective(""), false);
  assert.equal(isGrantPerspective(null), false);
  assert.equal(isGrantPerspective(undefined), false);
});

test("الاسمُ المحفوظُ أوّلاً، فالهجاءان كلاهما يُعرض كما كُتب", () => {
  assert.equal(perspectiveLabel("س", "المستفيدون"), "المستفيدون");
  assert.equal(perspectiveLabel("س", "المستفيدين"), "المستفيدين");
  // ولا يُعرض فراغٌ حيث يُنتظر اسم.
  assert.equal(perspectiveLabel("س", "   "), "المستفيدون");
  assert.equal(perspectiveLabel("ل", null), "العمليات الداخلية");
  assert.equal(perspectiveLabel("ك", null), "منظور غير معروف");
});
