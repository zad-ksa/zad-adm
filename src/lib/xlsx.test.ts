import test from "node:test";
import assert from "node:assert/strict";
import { columnLetter, escapeXml, safeFileName, sheetName, workbookFiles } from "./xlsx.ts";
import { grantReportCells, grantsReportFileName, grantsReportSheet } from "./grantsReport.ts";

test("حروفُ الأعمدة تتجاوز الزاي", () => {
  assert.equal(columnLetter(1), "A");
  assert.equal(columnLetter(26), "Z");
  assert.equal(columnLetter(27), "AA");
  assert.equal(columnLetter(28), "AB");
});

test("النصُّ يُهرَّب، والمحارفُ المتحكِّمةُ تُحذف لا تُهرَّب", () => {
  assert.equal(escapeXml('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
  // محرفٌ متحكِّمٌ يُدخله لصقٌ في حقلٍ نصّيّ، وإكسل يقول عنه «الملفُّ تالف».
  assert.equal(escapeXml("مشروع\u0001 سقيا"), "مشروع سقيا");
});

test("اسمُ الورقة يُنقّى ويُقصَر ولا يفرغ", () => {
  assert.equal(sheetName("المنح"), "المنح");
  assert.equal(sheetName("منح/2026[أ]"), "منح 2026 أ");
  assert.equal(sheetName("   "), "ورقة1");
  assert.equal(sheetName("ا".repeat(40)).length, 31);
});

test("واسمُ الملفِّ يقبله ويندوز", () => {
  assert.equal(safeFileName('تقرير: المنح/2026'), "تقرير المنح 2026");
  assert.equal(safeFileName(""), "تقرير");
});

test("الملفُّ يحمل أجزاءه الستّة كلَّها", () => {
  const files = workbookFiles({ name: "المنح", columns: [{ header: "الجمعية" }], rows: [["مكين"]] });
  assert.deepEqual(Object.keys(files).sort(), [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/workbook.xml",
    "xl/worksheets/sheet1.xml",
  ]);
});

test("المبلغُ خليّةُ عددٍ تُجمع، لا نصّاً مُنسَّقاً", () => {
  const files = workbookFiles({
    name: "المنح",
    columns: [{ header: "المشروع" }, { header: "المبلغ", kind: "number" }],
    rows: [["سقيا الماء", 1200000]],
  });
  const sheet = files["xl/worksheets/sheet1.xml"];
  assert.match(sheet, /<c r="B2" s="2"><v>1200000<\/v><\/c>/);
  assert.match(sheet, /<c r="A2" t="inlineStr"/);
});

test("والفارغُ خليّةٌ فارغةٌ لا صفرٌ ولا «غير محدد»", () => {
  const files = workbookFiles({
    name: "المنح",
    columns: [{ header: "المستفيدون", kind: "number" }],
    rows: [[null], [0]],
  });
  const sheet = files["xl/worksheets/sheet1.xml"];
  assert.match(sheet, /<c r="A2" s="3"\/>/);
  assert.match(sheet, /<c r="A3" s="2"><v>0<\/v><\/c>/);
});

test("الورقةُ من اليمين، ورأسُها مجمَّدٌ ومُرشَّح", () => {
  const files = workbookFiles({
    name: "المنح",
    columns: [{ header: "أ" }, { header: "ب" }],
    rows: [["1", "2"], ["3", "4"]],
  });
  const sheet = files["xl/worksheets/sheet1.xml"];
  assert.match(sheet, /rightToLeft="1"/);
  assert.match(sheet, /<pane ySplit="1"/);
  assert.match(sheet, /<autoFilter ref="A1:B3"\/>/);
});

test("صفوفُ تقرير المنح تُكتب بترتيب أعمدته", () => {
  const cells = grantReportCells({
    charityName: "مكين التعليمية",
    donorName: "منصة إحسان",
    donorMissing: false,
    initiativeName: "تعليم",
    requestedAmount: 50000,
    status: "APPROVED",
    collectedAmount: null,
    beneficiariesCount: 120,
    installmentsCount: null,
    installmentsNotes: null,
    createdAt: "2026-01-05",
    closureDate: null,
  });
  assert.equal(cells.length, grantsReportSheet([]).columns.length);
  assert.equal(cells[3], 50000);
  assert.equal(cells[5], "مقبولة");
  assert.equal(cells[6], 120);
});

test("والجهةُ بلا صفٍّ مرتبطٍ تُعلَّم ولا تُحذف", () => {
  const cells = grantReportCells({
    charityName: "ضماد",
    donorName: "جهةٌ قديمة",
    donorMissing: true,
    initiativeName: "إسعاف",
    requestedAmount: 1,
    status: "PENDING",
    collectedAmount: null,
    beneficiariesCount: null,
    installmentsCount: null,
    installmentsNotes: null,
    createdAt: "2026-01-05",
    closureDate: null,
  });
  assert.equal(cells[1], "جهةٌ قديمة (بلا جهةٍ مرتبطة)");
});

test("اسمُ الملفِّ يُرتَّب بتاريخه", () => {
  const name = grantsReportFileName(new Date("2026-11-11T10:00:00Z"));
  assert.equal(name, "تقرير المنح - 2026-11-11.xlsx");
});
