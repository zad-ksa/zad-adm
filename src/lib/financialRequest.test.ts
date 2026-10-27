import test from "node:test";
import assert from "node:assert/strict";
import {
  AMOUNT_MAX,
  amounts,
  formatAmount,
  isPlausibleIban,
  isValidVatRate,
  normaliseIban,
  parseAmount,
  serialLabel,
  taxAmount,
  totalWithTax,
  typeLabelFor,
} from "./financialRequest.ts";

// ── الضريبة والإجمالي ─────────────────────────────────────────────────────

test("مبلغ الضريبة بنسبة خمسة عشر", () => {
  assert.equal(taxAmount(1000, 15), 150);
  assert.equal(totalWithTax(1000, 15), 1150);
});

test("تقريبٌ إلى هللتين", () => {
  // ٣٣٣٣٣٫٣٣ × ١٥٪ = ٤٩٩٩٫٩٩٩٥
  assert.equal(taxAmount(33333.33, 15), 5000);
  assert.equal(taxAmount(100.07, 15), 15.01);
});

test("بلا ضريبة: الإجمالي هو المبلغ", () => {
  assert.equal(taxAmount(1000, null), 0);
  assert.equal(totalWithTax(1000, null), 1000);
  assert.equal(taxAmount(1000, 0), 0);
});

test("مبلغٌ صفر أو سالب لا ضريبة له", () => {
  assert.equal(taxAmount(0, 15), 0);
  assert.equal(taxAmount(-500, 15), 0);
});

test("قيمٌ غير رقمية لا تُسقط الحساب", () => {
  assert.equal(taxAmount(Number.NaN, 15), 0);
  assert.equal(totalWithTax(Number.NaN, 15), 0);
  assert.equal(taxAmount(1000, Number.NaN), 0);
});

// ── ملخّص الصفّ ───────────────────────────────────────────────────────────

test("الملخّص من حقول الصفّ، والمبلغ قد يأتي نصاً", () => {
  // Decimal لا يعبر إلى مكوّن العميل فيُحوَّل نصاً في الطريق.
  assert.deepEqual(amounts({ amount: "80000.00", isTaxable: true, taxRate: "15.00" }), {
    amount: 80000,
    taxRate: 15,
    taxAmount: 12000,
    total: 92000,
  });
});

test("الملخّص يُهمل النسبة حين لا ضريبة على الطلب", () => {
  // نسبةٌ مخزَّنةٌ في صفٍّ أُلغيت ضريبتُه لا تُحتسب.
  assert.deepEqual(amounts({ amount: 500, isTaxable: false, taxRate: 15 }), {
    amount: 500,
    taxRate: null,
    taxAmount: 0,
    total: 500,
  });
});

test("الملخّص بمبلغٍ مفقود يُعطي أصفاراً لا يسقط", () => {
  assert.deepEqual(amounts({ amount: null, isTaxable: true, taxRate: 15 }), {
    amount: 0,
    taxRate: 15,
    taxAmount: 0,
    total: 0,
  });
});

test("فاصلةُ الآلاف في المبلغ المُدخَل تُقرأ", () => {
  assert.equal(amounts({ amount: "12,500.50" }).amount, 12500.5);
});

// ── الصياغة ───────────────────────────────────────────────────────────────

test("صياغة المبلغ بهللتين وفاصلة", () => {
  assert.equal(formatAmount(92000), "92,000.00");
  assert.equal(formatAmount(15.5), "15.50");
});

test("رقم الوثيقة بثلاث خانات", () => {
  assert.equal(serialLabel(7), "ZAD_FR_007");
  assert.equal(serialLabel(1234), "ZAD_FR_1234");
});

// ── الآيبان ───────────────────────────────────────────────────────────────

test("تطبيع الآيبان: بلا فراغاتٍ وبحروفٍ كبيرة", () => {
  assert.equal(normaliseIban("sa03 8000 0000 6080 1016 7519"), "SA0380000000608010167519");
  assert.equal(normaliseIban("sa03-8000-0000"), "SA0380000000");
});

test("آيبانٌ معقول", () => {
  assert.equal(isPlausibleIban("SA0380000000608010167519"), true);
  assert.equal(isPlausibleIban("sa03 8000 0000 6080 1016 7519"), true);
  // غير سعوديٍّ مقبول: الحراسة خفيفةٌ عن قصد.
  assert.equal(isPlausibleIban("GB29NWBK60161331926819"), true);
});

test("آيبانٌ غير معقول", () => {
  assert.equal(isPlausibleIban("12345678901234567"), false); // لا يبدأ بحرفين
  assert.equal(isPlausibleIban("SA03"), false); // أقصر من اللازم
  assert.equal(isPlausibleIban(""), false);
});

// ── مسمّى النوع ───────────────────────────────────────────────────────────

test("مسمّى النوع كما هو لغير «أخرى»", () => {
  assert.equal(typeLabelFor("طلب شراء"), "طلب شراء");
  assert.equal(typeLabelFor("طلب شراء", "نصٌّ مهمل"), "طلب شراء");
});

test("«أخرى» تُدمج مع ما كُتب، فالوثيقة تقول نوعها بلا حقلٍ ثانٍ", () => {
  assert.equal(typeLabelFor("أخرى", "رسوم حكومية"), "أخرى — رسوم حكومية");
  assert.equal(typeLabelFor("أخرى", "  "), "أخرى");
  assert.equal(typeLabelFor("أخرى"), "أخرى");
});

// ── نسبة الإعداد ──────────────────────────────────────────────────────────

test("نسبةٌ مقبولة بين صفر ومئة", () => {
  assert.equal(isValidVatRate(15), true);
  assert.equal(isValidVatRate("0"), true);
  assert.equal(isValidVatRate(100), true);
  assert.equal(isValidVatRate(-1), false);
  assert.equal(isValidVatRate(101), false);
  assert.equal(isValidVatRate("خمسة"), false);
  assert.equal(isValidVatRate(null), false);
});

// ── قراءة المبلغ ──────────────────────────────────────────────────────────

test("المبلغ يُقرأ بفاصلته ويُقرَّب لهللتين", () => {
  assert.equal(parseAmount("12,500.509"), 12500.51);
  assert.equal(parseAmount(" 80000 "), 80000);
});

test("مبلغٌ لا يصلح يردّ null لا صفراً", () => {
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount(-5), null);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("كثير"), null);
  assert.equal(parseAmount(null), null);
});

test("فوق سعة العمود يُرفض", () => {
  assert.equal(parseAmount(AMOUNT_MAX), AMOUNT_MAX);
  assert.equal(parseAmount(AMOUNT_MAX + 1), null);
});
