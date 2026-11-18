import { test } from "node:test";
import assert from "node:assert/strict";
import {
  POPUP_PAGES,
  isPopupLive,
  isPopupPage,
  popupMatchesPath,
  popupPageLabel,
  popupRepeatOf,
  popupTargetsCharity,
  portalPathSegment,
} from "./portalPopups.ts";

test("portalPathSegment: المقطعُ الثالثُ من مسار البوّابة", () => {
  assert.equal(portalPathSegment("/portal/مكين/fundraising"), "fundraising");
  assert.equal(portalPathSegment("/portal/%D9%85%D9%83%D9%8A%D9%86/mail/123"), "mail");
  // وصفحةُ البوّابة الأولى بلا مقطع.
  assert.equal(portalPathSegment("/portal/مكين"), "");
  // وما ليس من البوّابة لا مقطعَ له.
  assert.equal(portalPathSegment("/main/donors"), null);
  assert.equal(portalPathSegment("/"), null);
});

test("popupMatchesPath: الموضعُ يُطابق قسمَه، و«أي صفحة» تُطابق كلَّ البوّابة", () => {
  assert.equal(popupMatchesPath("FUNDRAISING", "/portal/مكين/fundraising"), true);
  assert.equal(popupMatchesPath("FUNDRAISING", "/portal/مكين/fundraising/donors/x"), true);
  assert.equal(popupMatchesPath("FUNDRAISING", "/portal/مكين/services"), false);
  assert.equal(popupMatchesPath("HOME", "/portal/مكين"), true);
  assert.equal(popupMatchesPath("HOME", "/portal/مكين/mail"), false);
  assert.equal(popupMatchesPath("ANY", "/portal/مكين/mail"), true);
  // ولا يظهر خارج البوّابة أصلاً — ولو كان «أي صفحة».
  assert.equal(popupMatchesPath("ANY", "/main/donors"), false);
  // ومفتاحٌ مجهولٌ لا يُطابق شيئاً.
  assert.equal(popupMatchesPath("NOPE", "/portal/مكين/mail"), false);
});

test("isPopupLive: التفعيلُ ثمّ الفترة", () => {
  const now = new Date("2026-11-18T10:00:00Z");
  const live = { isActive: true, startsAt: null, endsAt: null };
  assert.equal(isPopupLive(live, now), true);
  assert.equal(isPopupLive({ ...live, isActive: false }, now), false);
  assert.equal(isPopupLive({ ...live, startsAt: "2026-11-19T00:00:00Z" }, now), false);
  assert.equal(isPopupLive({ ...live, startsAt: "2026-11-01T00:00:00Z" }, now), true);
  assert.equal(isPopupLive({ ...live, endsAt: "2026-11-17T23:59:59Z" }, now), false);
  assert.equal(isPopupLive({ ...live, endsAt: "2026-11-30T23:59:59Z" }, now), true);
});

test("popupTargetsCharity: الفارغةُ تعني الكلّ", () => {
  assert.equal(popupTargetsCharity([], "c1"), true);
  assert.equal(popupTargetsCharity(["c1", "c2"], "c1"), true);
  assert.equal(popupTargetsCharity(["c2"], "c1"), false);
});

test("الكتالوج: مفاتيحُ معروفةٌ وأسماءٌ تُقرأ، والتكرارُ قيمتان", () => {
  assert.equal(isPopupPage("FUNDRAISING"), true);
  assert.equal(isPopupPage("NOPE"), false);
  assert.equal(popupPageLabel("MAIL"), "البريد");
  assert.equal(popupPageLabel("NOPE"), "NOPE");
  assert.equal(popupRepeatOf("EVERY"), "EVERY");
  assert.equal(popupRepeatOf("نصٌّ غريب"), "ONCE");
  // ولا مفتاحَ مكرَّرٌ في الكتالوج: الموضعُ يُحفظ في صفٍّ ويُقرأ منه.
  assert.equal(new Set(POPUP_PAGES.map((p) => p.key)).size, POPUP_PAGES.length);
});
