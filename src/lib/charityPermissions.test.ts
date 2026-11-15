import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_CHARITY_PERMISSION_IDS,
  CHARITY_SERVICE_PERMISSIONS,
  CHARITY_USER_TITLES,
  GRANTABLE_CHARITY_PERMISSION_IDS,
  RETIRED_CHARITY_PERMISSION_IDS,
  charityPermissionGroups,
  charityPermissionLabel,
  charityPermissionsOfService,
  charityServicesWithPermissions,
  charityTitleLabel,
  effectiveCharityPermissions,
  grantableCharityPermissions,
  hasCharityPermission,
  sanitizeCharityPermissions,
  seesCharityServicesTab,
  serviceOfCharityPermission,
  visibleCharityServices,
} from "./charityPermissions.ts";

const MEDIA = "الإعلامية";
const GOVERNANCE = "الحوكمة";

/** خدماتُ زادٍ التسع كما في `SECTION_SERVICES` وصفوف `Service`. */
const NINE = [
  "الإدارية",
  "الإسناد الحكومي",
  MEDIA,
  "التخطيط الاستراتيجي",
  "التسويق وتنمية الموارد المالية",
  "التقنية",
  GOVERNANCE,
  "المالية",
  "خدمات المشاريع",
];

test("كلُّ صلاحيّةِ خدمةٍ تتبع خدمةً من خدمات زاد المعروفة", () => {
  for (const p of CHARITY_SERVICE_PERMISSIONS) {
    assert.ok(p.service, `${p.id} بلا خدمة`);
    assert.ok(NINE.includes(p.service!), `${p.id} يتبع خدمةً مجهولة: ${p.service}`);
  }
  assert.deepEqual(charityServicesWithPermissions(), [MEDIA, GOVERNANCE]);
});

test("صلاحيّاتُ الإعلاميّة: طلباتُ التصاميم وتحريرُ الخطة", () => {
  const ids = charityPermissionsOfService(MEDIA).map((p) => p.id);
  assert.deepEqual(ids, ["view_design_requests", "edit_media_plan"]);
  assert.equal(serviceOfCharityPermission("edit_media_plan"), MEDIA);
  assert.equal(serviceOfCharityPermission("manage_charity_users"), null);
});

test("حسابُ الجمعية يحمل كلَّ شيءٍ محسوباً — ولو كان صفُّه فارغاً", () => {
  const effective = effectiveCharityPermissions([], [], true);
  assert.deepEqual([...effective].sort(), [...ALL_CHARITY_PERMISSION_IDS].sort());
  // «مهما زدنا»: كلُّ معرّفٍ في الكتالوج داخلٌ عنده، ومنه المخفيُّ بعلَم.
  for (const id of ALL_CHARITY_PERMISSION_IDS) {
    assert.ok(hasCharityPermission(effective, id), id);
  }
});

test("صلاحيّةُ خدمةٍ لا تعمل إلا والخدمةُ مفوَّضة — ولا تُحذف من صفِّه", () => {
  const stored = ["view_design_requests", "edit_media_plan", "view_governance", "manage_charity_mail"];
  const withMedia = effectiveCharityPermissions(stored, [MEDIA], false);
  assert.deepEqual(withMedia, ["view_design_requests", "edit_media_plan", "manage_charity_mail"]);

  // رُفعت الخدمةُ: خمدت صلاحيّاتُها وبقيت الإداريّة.
  assert.deepEqual(effectiveCharityPermissions(stored, [], false), ["manage_charity_mail"]);
  // وأُعيدت: عادت كما كانت، فالصفُّ لم يُمَسّ.
  assert.deepEqual(effectiveCharityPermissions(stored, [MEDIA, GOVERNANCE], false), stored);
});

test("لا شيءَ يُنال بالصفة: المصفوفةُ الفعليّةُ وحدَها هي المقياس", () => {
  const member = effectiveCharityPermissions(["view_design_requests"], [MEDIA], false);
  assert.ok(hasCharityPermission(member, "view_design_requests"));
  assert.ok(!hasCharityPermission(member, "edit_media_plan"));
  assert.ok(!hasCharityPermission(member, "manage_charity_users"));
});

test("المتقاعدُ يُسقَط: «الخدمات» و«الخطة الإعلامية» صارتا مشتقّتين", () => {
  for (const id of ["view_services", "view_media_plan", "view_hr", "create_design_requests"]) {
    assert.ok(RETIRED_CHARITY_PERMISSION_IDS.includes(id), id);
    assert.ok(!ALL_CHARITY_PERMISSION_IDS.includes(id), `${id} ما زال في الكتالوج`);
  }
  assert.deepEqual(
    sanitizeCharityPermissions(["view_services", "view_media_plan", "view_governance", "view_governance"]),
    ["view_governance"]
  );
  assert.deepEqual(effectiveCharityPermissions(["view_services", "view_media_plan"], NINE, false), []);
});

test("المنحُ لحساب الجمعية وحدَه", () => {
  assert.deepEqual(grantableCharityPermissions(true), GRANTABLE_CHARITY_PERMISSION_IDS);
  assert.deepEqual(grantableCharityPermissions(false), []);
  assert.deepEqual(grantableCharityPermissions(null), []);
  // ولا يُمنح متقاعدٌ ولا مجهول.
  for (const id of GRANTABLE_CHARITY_PERMISSION_IDS) {
    assert.ok(ALL_CHARITY_PERMISSION_IDS.includes(id), id);
    assert.ok(!RETIRED_CHARITY_PERMISSION_IDS.includes(id), id);
  }
});

test("المُنتقي يُبنى من خدمات الجمعية: ما لا تشمله لا يُعرض", () => {
  const all = charityPermissionGroups(NINE).map((g) => g.title);
  assert.deepEqual(all, [MEDIA, GOVERNANCE, "صلاحيات الإدارة"]);

  const mediaOnly = charityPermissionGroups([MEDIA]);
  assert.deepEqual(mediaOnly.map((g) => g.title), [MEDIA, "صلاحيات الإدارة"]);
  assert.deepEqual(mediaOnly[0].permissions.map((p) => p.id), ["view_design_requests", "edit_media_plan"]);

  // جمعيةٌ بلا خدمةٍ ذاتِ صلاحيّات: الإدارةُ وحدَها.
  assert.deepEqual(charityPermissionGroups(["التقنية"]).map((g) => g.title), ["صلاحيات الإدارة"]);
  assert.deepEqual(charityPermissionGroups([]).map((g) => g.title), ["صلاحيات الإدارة"]);
});

test("تبويبُ «الخدمات»: خدمةٌ له فيها صلاحيّةٌ واحدةٌ تُعرض بتمامها", () => {
  const effective = effectiveCharityPermissions(["view_design_requests"], [MEDIA], false);
  assert.ok(seesCharityServicesTab(false, effective));
  assert.deepEqual(visibleCharityServices({ isOfficialAccount: false, effective, charityServices: NINE }), [MEDIA]);
});

test("ومن له صلاحيّاتُ خدمتين يرى الخدمتين — لا التسع", () => {
  const effective = effectiveCharityPermissions(
    ["edit_media_plan", "view_governance"],
    [MEDIA, GOVERNANCE],
    false
  );
  assert.deepEqual(visibleCharityServices({ isOfficialAccount: false, effective, charityServices: NINE }), [
    MEDIA,
    GOVERNANCE,
  ]);
});

test("ومن لا صلاحيّةَ خدمةٍ له لا يرى التبويب", () => {
  const effective = effectiveCharityPermissions(["manage_charity_mail"], NINE, false);
  assert.ok(!seesCharityServicesTab(false, effective));
  assert.deepEqual(visibleCharityServices({ isOfficialAccount: false, effective, charityServices: NINE }), []);
});

test("وحسابُ الجمعية يرى خدماتِ جمعيتِه كلَّها ولا يرى ما ليس فيها", () => {
  assert.ok(seesCharityServicesTab(true, []));
  assert.deepEqual(
    visibleCharityServices({ isOfficialAccount: true, effective: [], charityServices: [MEDIA, "التقنية"] }),
    [MEDIA, "التقنية"]
  );
});

test("الوسومُ عربيّةٌ، و«مدير النظام» صار «حساب الجمعية»", () => {
  assert.equal(charityTitleLabel("SYSTEM_ADMIN"), "حساب الجمعية");
  for (const t of CHARITY_USER_TITLES) {
    assert.equal(charityTitleLabel(t.id), t.label);
    assert.ok(!/[A-Za-z_]/.test(t.label), t.id);
  }
  for (const id of ALL_CHARITY_PERMISSION_IDS) {
    assert.ok(!/[A-Za-z_]/.test(charityPermissionLabel(id)), id);
  }
});
