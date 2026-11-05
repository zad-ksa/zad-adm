import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  SERVICE_LINKED_CHARITY_PERMISSION_IDS,
  effectiveCharityPermissions,
  hasCharityPermission,
} from "./charityPermissions.ts";

/** الربطُ القائمُ اليوم عند زاد، مختصَراً. */
const LINKS = [
  { permissionId: "view_services", serviceName: "المالية" },
  { permissionId: "view_services", serviceName: "الحوكمة" },
  { permissionId: "view_services", serviceName: "الإعلامية" },
  { permissionId: "view_governance", serviceName: "الحوكمة" },
  { permissionId: "view_design_requests", serviceName: "الإعلامية" },
];

test("الموظَّفُ الجديد: التبويباتُ تُنال بالتفويض لا بالمصفوفة", () => {
  // هذه هي الحالةُ التي ظهر فيها العطب: الحفظُ يُسقط تبويباتَ البوابة من
  // المصفوفة عن قصد، فيبقى معه صلاحيّتا الإدارة وتسعُ خدماتٍ مفوَّضة.
  const effective = effectiveCharityPermissions(
    ["manage_charity_users", "manage_charity_mail"],
    ["المالية", "الحوكمة", "الإعلامية"],
    LINKS
  );
  assert.ok(effective.includes("view_services"));
  assert.ok(effective.includes("view_governance"));
  assert.ok(effective.includes("view_design_requests"));
  // وما ليس تبويباً يمرّ كما هو.
  assert.ok(effective.includes("manage_charity_users"));
  assert.ok(effective.includes("manage_charity_mail"));
});

/**
 * ما يسأله الحارسُ قبل كلِّ فعل — تركيبُ الدالّتين كما في
 * `requireCharityPermission`.
 *
 * ولزم اختبارُه مُركَّباً لا مفرَّقاً: كلتاهما كانت صحيحةً وحدَها، والعطبُ
 * كان أنّ الحارسَ لم يُركِّبهما — قرأ المخزّنةَ وتجاوز الفعليّة. فعضوٌ مفوَّضٌ
 * بـ«الإعلامية» يَفتح تبويبَ طلبات التصاميم ثمّ يُرَدّ عند الإرسال.
 */
const guardAllows = (
  isAdmin: boolean,
  stored: string[],
  services: string[],
  permission: string
) => hasCharityPermission(isAdmin, effectiveCharityPermissions(stored, services, LINKS), permission);

test("الحارسُ يأذن للمفوَّض برفع طلب تصميم — وهو العطبُ الذي وقع", () => {
  // عبدالرحمن في الرأفة الإنسانية: مصفوفتُه صلاحيّتا إدارةٍ لا غير، وتفويضُه
  // ثماني خدماتٍ منها «الإعلامية».
  assert.ok(
    guardAllows(
      false,
      ["manage_charity_users", "manage_charity_mail"],
      ["الإعلامية", "الإدارية", "المالية"],
      "view_design_requests"
    )
  );
});

test("ولا يأذن لمن في مصفوفته قيمةٌ قديمةٌ بلا تفويض", () => {
  // قيمةٌ باقيةٌ من قبل الربط: الصفحةُ تمنعه أصلاً، فكان الفعلُ أوسعَ من
  // الشاشة. وبعد الإصلاح يتّفقان.
  assert.equal(guardAllows(false, ["view_design_requests"], [], "view_design_requests"), false);
});

test("ومديرُ الجمعية يأذن له بلا تفويض", () => {
  assert.ok(guardAllows(true, [], [], "view_design_requests"));
});

test("ومصفوفةٌ مليئةٌ بلا تفويضٍ لا تُنيل تبويباً مربوطاً", () => {
  // الاتّجاهُ الآخرُ من العطب: عضوٌ قديمٌ يحمل القيمَ المخزّنةَ ولا خدمةَ له،
  // كان الشريطُ يُظهر له التبويبَ ثمّ تردُّه الصفحةُ إلى «لا صلاحية».
  const effective = effectiveCharityPermissions(
    ["view_services", "view_governance", "view_design_requests"],
    [],
    LINKS
  );
  for (const tab of SERVICE_LINKED_CHARITY_PERMISSION_IDS) {
    assert.equal(effective.includes(tab), false, tab);
  }
});

test("والتفويضُ الجزئيُّ يُنيل تبويبَه وحدَه", () => {
  const effective = effectiveCharityPermissions([], ["الإعلامية"], LINKS);
  assert.deepEqual(effective.sort(), ["view_design_requests", "view_services"].sort());
  // الحوكمةُ لم تُفوَّض، فتبويبُها لا يُنال — ولو كانت الإعلاميّةُ تكفي
  // لتبويب الخدمات.
  assert.equal(effective.includes("view_governance"), false);
});

test("وتبويبٌ لم يُربط بعد يبقى على المخزّن", () => {
  // الربطُ يُفعَّل تدريجيّاً عند زاد، فما لم يُربط لا ينقطع عن حامله.
  const linksWithoutGovernance = LINKS.filter((l) => l.permissionId !== "view_governance");
  const effective = effectiveCharityPermissions(
    ["view_governance"],
    [],
    linksWithoutGovernance
  );
  assert.ok(effective.includes("view_governance"));
  // وغيرُه مربوطٌ بلا تفويض، فلا يُنال.
  assert.equal(effective.includes("view_services"), false);
});

test("ولا تُضاعف قيمةٌ ولا تُقحَم خدمةٌ ليست تبويباً", () => {
  const effective = effectiveCharityPermissions(
    ["manage_charity_users", "manage_charity_users"],
    ["المالية"],
    [...LINKS, { permissionId: "manage_finance", serviceName: "المالية" }]
  );
  assert.deepEqual([...new Set(effective)], effective);
  // `manage_finance` مربوطةٌ بخدمةٍ لكنّها ليست من تبويبات البوابة، فلا
  // تُمنَح بالتفويض — صلاحياتُ زاد لا تُنال من هنا.
  assert.equal(effective.includes("manage_finance"), false);
});

test("والعدمُ لا يُسقطها", () => {
  assert.deepEqual(effectiveCharityPermissions(null, null, []), []);
  assert.deepEqual(effectiveCharityPermissions(undefined, undefined, LINKS), []);
});
