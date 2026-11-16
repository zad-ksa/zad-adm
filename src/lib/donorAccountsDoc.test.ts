import test from "node:test";
import assert from "node:assert/strict";
import { documentFiles, escapeXml, safeFileName } from "./docx.ts";
import {
  DONOR_DOC_COLUMNS,
  donorAccountsDoc,
  donorAccountsFileName,
  donorPageBlocks,
  type DonorDocOrg,
} from "./donorAccountsDoc.ts";

const org: DonorDocOrg = {
  name: "مؤسسة الراجحي",
  kindLabel: "مؤسسة",
  url: "https://example.org",
  fields: "التعليم والصحة",
  intake: "مفتوح حتى 2026-12-01",
  accounts: [
    { charityName: "مكين التعليمية", username: "makeen", password: "p@ss 1" },
    { charityName: "ضماد", username: "demad", password: "x&y<z" },
  ],
};

test("الجهة صفحة: اسمها ثم بياناتها ثم جدول حساباتها", () => {
  const blocks = donorPageBlocks(org);
  assert.equal(blocks[0].kind, "paragraph");
  assert.equal((blocks[0] as { text: string }).text, "مؤسسة الراجحي");
  const table = blocks.find((b) => b.kind === "table") as { head: string[]; rows: string[][] };
  assert.deepEqual(table.head, DONOR_DOC_COLUMNS);
  assert.deepEqual(table.rows, [
    ["مكين التعليمية", "makeen", "p@ss 1"],
    ["ضماد", "demad", "x&y<z"],
  ]);
});

test("وجهة بلا حسابات لها صفحتها وسطر يقول ذلك", () => {
  const blocks = donorPageBlocks({ ...org, accounts: [] });
  assert.ok(!blocks.some((b) => b.kind === "table"));
  assert.ok(blocks.some((b) => b.kind === "paragraph" && b.text.includes("لا حسابات")));
});

test("فاصل صفحة قبل كل جهة — ولا صفحة بيضاء في الاخر", () => {
  const spec = donorAccountsDoc([org, { ...org, name: "منصة إحسان" }], "2026-11-16");
  const breaks = spec.blocks.filter((b) => b.kind === "pageBreak").length;
  assert.equal(breaks, 2);
  assert.notEqual(spec.blocks[spec.blocks.length - 1].kind, "pageBreak");
});

test("والترويسة تقول إنه سري", () => {
  const spec = donorAccountsDoc([org], "2026-11-16");
  const head = spec.blocks.slice(0, 3).map((b) => (b as { text: string }).text).join(" ");
  assert.match(head, /حسابات الجهات المانحة/);
  assert.match(head, /سري/);
});

test("ملف وورد: اجزاؤه الستة، والمتن فيها", () => {
  const files = documentFiles(donorAccountsDoc([org], "2026-11-16"));
  for (const part of [
    "[Content_Types].xml",
    "_rels/.rels",
    "word/_rels/document.xml.rels",
    "word/styles.xml",
    "word/document.xml",
    "docProps/core.xml",
  ]) {
    assert.ok(files[part], part);
  }
  const document = files["word/document.xml"];
  assert.match(document, /مؤسسة الراجحي/);
  assert.match(document, /makeen/);
  // وفاصل الصفحة موجود، والمستند من اليمين.
  assert.match(document, /w:br w:type="page"/);
  assert.match(document, /<w:bidi\/>/);
});

test("وما لا يقبله XML يخرج منه — فلا يفتح الملف «تالفا»", () => {
  assert.equal(escapeXml("x&y<z>\"'"), "x&amp;y&lt;z&gt;&quot;&apos;");
  // حروف التحكم تحذف: كلمة مرور نسخت من ملف قد تحملها.
  assert.equal(escapeXml("ab\u0001c"), "abc");
  const files = documentFiles(donorAccountsDoc([org], "2026-11-16"));
  assert.ok(!files["word/document.xml"].includes("x&y<z"));
  assert.match(files["word/document.xml"], /x&amp;y&lt;z/);
});

test("واسم الملف نظيف وبامتداده", () => {
  assert.equal(donorAccountsFileName("2026-11-16"), "حسابات الجهات المانحة - 2026-11-16.docx");
  assert.ok(!safeFileName('a/b:c*?"<>|').match(/[\\/:*?"<>|]/));
});
