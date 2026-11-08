import test from "node:test";
import assert from "node:assert/strict";
import { GRANT_PERSPECTIVE_PREFIXES, isGrantPerspective } from "./planPerspectives.ts";

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

test("والهجاءان كلاهما يمرّ: المطابقةُ بالبادئة لا بالاسم", () => {
  // «المستفيدون» في سبع جمعيات و«المستفيدين» في واحدة — وبادئتُهما `س`.
  for (const name of ["المستفيدون", "المستفيدين"]) {
    assert.equal(isGrantPerspective("س"), true, name);
  }
});
