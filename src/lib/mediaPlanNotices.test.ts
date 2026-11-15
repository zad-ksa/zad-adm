import test from "node:test";
import assert from "node:assert/strict";
import { mediaNotice, portalMediaLink, zadMediaLink } from "./mediaPlanNotices.ts";

const CTX = { charityName: "مكين", day: "2026-11-15" };

test("حدثُ زادٍ يُنبَّه به الجمعيةُ، وحدثُ الجمعية يُنبَّه به زاد", () => {
  assert.equal(mediaNotice("CREATED", CTX)?.to, "CHARITY");
  assert.equal(mediaNotice("EDITED_BY_ZAD", CTX)?.to, "CHARITY");
  assert.equal(mediaNotice("REOPENED_BY_ZAD", CTX)?.to, "CHARITY");
  assert.equal(mediaNotice("REJECTED_BY_ZAD", CTX)?.to, "CHARITY");
  assert.equal(mediaNotice("CERTIFIED_BY_ZAD", CTX)?.to, "CHARITY");
  assert.equal(mediaNotice("APPROVED_BY_CHARITY", CTX)?.to, "ZAD");
  assert.equal(mediaNotice("EDITED_BY_CHARITY", CTX)?.to, "ZAD");
});

test("العنوانُ يقول ما يُنتظر من قارئه", () => {
  assert.match(mediaNotice("CREATED", CTX)!.title, /ينتظر اعتمادكم/);
  assert.match(mediaNotice("EDITED_BY_CHARITY", CTX)!.title, /ينتظر تعميدَك/);
  assert.match(mediaNotice("REJECTED_BY_ZAD", CTX)!.title, /رُدَّ/);
});

test("اليومُ يُكتب باسم يومه، فيُعرف الإشعارُ بلا فتح الصفحة", () => {
  assert.match(mediaNotice("CREATED", CTX)!.message, /الأحد 15 نوفمبر 2026/);
});

test("اسمُ الجمعية في إشعار زادٍ وحدَه — الجمعيةُ تعرف جمعيتَها", () => {
  assert.match(mediaNotice("EDITED_BY_CHARITY", CTX)!.message, /مكين/);
  assert.ok(!mediaNotice("CREATED", CTX)!.message.includes("مكين"));
});

test("السببُ يُنقل في الرسالة، ويُهمَل الفراغ", () => {
  const withNote = mediaNotice("REJECTED_BY_ZAD", { ...CTX, note: "  النصُّ لا يوافق الهويّة  " });
  assert.match(withNote!.message, /السبب: النصُّ لا يوافق الهويّة/);
  const blank = mediaNotice("REJECTED_BY_ZAD", { ...CTX, note: "   " });
  assert.ok(!blank!.message.includes("السبب"));
});

test("اسمُ الفاعل يُذكر إن عُرف", () => {
  const named = mediaNotice("APPROVED_BY_CHARITY", { ...CTX, actorName: "سعود" });
  assert.match(named!.message, /بيد سعود/);
  assert.ok(!mediaNotice("APPROVED_BY_CHARITY", CTX)!.message.includes("بيد"));
});

test("الروابطُ تُرمِّز اسمَ الجمعية", () => {
  assert.equal(zadMediaLink("نادي مسارات"), "/main/media/%D9%86%D8%A7%D8%AF%D9%8A%20%D9%85%D8%B3%D8%A7%D8%B1%D8%A7%D8%AA");
  assert.ok(portalMediaLink("مكين").startsWith("/portal/"));
  assert.ok(portalMediaLink("مكين").endsWith("/media"));
});
