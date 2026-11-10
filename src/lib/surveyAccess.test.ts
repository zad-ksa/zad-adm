import test from "node:test";
import assert from "node:assert/strict";
import { getSurveyScope, maySeeSurvey, surveyScopeWhere } from "./surveyAccess.ts";

const employee = (permissions: string[], id = "emp-1", role = "ADMINISTRATIVE_SECRETARIAT") => ({
  id,
  role,
  permissions,
});

test("بلا صلاحيةٍ: لا تبويبَ ولا استبيان", () => {
  const scope = getSurveyScope(employee([]));
  assert.equal(scope.canView, false);
  assert.equal(scope.seesAll, false);
});

test("«ما أنشأه وحده»: يرى ولا يرى الجميع", () => {
  const scope = getSurveyScope(employee(["manage_own_surveys"]));
  assert.equal(scope.canView, true);
  assert.equal(scope.seesAll, false);
  assert.equal(scope.employeeId, "emp-1");
});

test("«جميع الاستبيانات» تحمل «ما أنشأه وحده» تلقائياً", () => {
  // وهذا هو الشرطُ المطلوب: تفعيلُ الأولى يُفعّل الثانيةَ بلا مربّعٍ ثانٍ.
  const scope = getSurveyScope(employee(["manage_surveys"]));
  assert.equal(scope.canView, true);
  assert.equal(scope.seesAll, true);
});

test("ADMIN وdeveloper_mode يريان الجميع", () => {
  assert.equal(getSurveyScope(employee([], "emp-9", "ADMIN")).seesAll, true);
  assert.equal(getSurveyScope(employee(["developer_mode"])).seesAll, true);
});

test("حسابُ الجمعية خارجُ هذا: المستجيبُ يصل بالرابط لا بصلاحية", () => {
  const scope = getSurveyScope({ ...employee(["manage_surveys"]), userType: "CHARITY_USER" });
  assert.equal(scope.canView, false);
});

test("بلا جلسةٍ: مغلق", () => {
  assert.equal(getSurveyScope(null).canView, false);
  assert.equal(getSurveyScope(undefined).canView, false);
});

test("شرطُ الاستعلام: الكلُّ لمن يرى الكلّ، ومُنشئُه لمن سواه", () => {
  assert.deepEqual(surveyScopeWhere(getSurveyScope(employee(["manage_surveys"]))), {});
  assert.deepEqual(surveyScopeWhere(getSurveyScope(employee(["manage_own_surveys"]))), {
    createdById: "emp-1",
  });
});

test("ونطاقٌ مغلقٌ يُطابق لا شيء — فالنسيانُ يُغلق ولا يفتح", () => {
  const where = surveyScopeWhere(getSurveyScope(employee([])));
  assert.notDeepEqual(where, {});
  assert.equal(where.createdById, "__none__");
});

test("ملكيّةُ استبيانٍ بعينه", () => {
  const all = getSurveyScope(employee(["manage_surveys"]));
  const own = getSurveyScope(employee(["manage_own_surveys"]));
  const none = getSurveyScope(employee([]));

  assert.equal(maySeeSurvey(all, "emp-2"), true);
  assert.equal(maySeeSurvey(own, "emp-1"), true);
  assert.equal(maySeeSurvey(own, "emp-2"), false);
  assert.equal(maySeeSurvey(none, "emp-1"), false);
});

test("استبيانٌ بلا مالكٍ لا يملكه حاملُ «ما أنشأه وحده»", () => {
  // العشرةُ القائمةُ قبل عمود المالك: لا تُنسب لأحد، فلا يُحرّرها إلا من يرى
  // الجميع. وnull لا تُطابق null.
  const own = getSurveyScope(employee(["manage_own_surveys"]));
  assert.equal(maySeeSurvey(own, null), false);
  assert.equal(maySeeSurvey(own, undefined), false);
  assert.equal(maySeeSurvey(getSurveyScope(employee(["manage_surveys"])), null), true);
});

test("ولا يملك أحدٌ استبيانَ غيره بمعرِّفٍ فارغ", () => {
  const ghost = getSurveyScope(employee(["manage_own_surveys"], ""));
  assert.equal(ghost.canView, false);
  assert.equal(maySeeSurvey(ghost, ""), false);
});
