/**
 * حساب الطلب المالي — دالّاتٌ خالصة لا تمسّ قاعدة البيانات.
 *
 * ولا رقمَ منها مخزَّن: في الصفّ المبلغُ والنسبة وحدهما، والضريبةُ والإجمالي
 * يُشتقّان. وهذا ما فعلناه في مؤشرات الأداء ونِسب المبادرات، وهو ما منع اختلاف
 * الأرقام بين صفحةٍ وأخرى.
 *
 * لكن **النسبة نفسها مخزَّنةٌ في الصفّ** لا مقروءةً من الإعداد العام عند العرض:
 * الطلب وثيقةٌ تُعتمد وتُختم، فتغييرُ النسبة نظاماً لا يجوز أن يُعيد حساب ما
 * اعتُمد بغيرها.
 */

/** أنواع الطلب المالي الافتراضية — تُبذر في الجدول ثم تُدار من الإعدادات. */
export const DEFAULT_FINANCIAL_TYPES = [
  "طلب شراء",
  "مدفوعات الموردين والجهات",
  "عهدة نقدية",
  "استرداد مصروفات",
  "طلب صرف",
  "أخرى",
] as const;

/** اسمُ النوع الذي يفتح حقل «حدّد». */
export const OTHER_TYPE_NAME = "أخرى";

/** مفتاح نسبة الضريبة في الإعدادات العامة. */
export const VAT_RATE_SETTING_KEY = "financial_vat_rate";

/** النسبة الافتراضية حين لا يكون في الإعدادات شيء. */
export const DEFAULT_VAT_RATE = 15;

const round2 = (n: number) => Math.round(n * 100) / 100;

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

export type FinancialAmounts = {
  amount: number;
  /** `null` حين لا ضريبة على الطلب. */
  taxRate: number | null;
  taxAmount: number;
  total: number;
};

/** مبلغُ الضريبة، مقرَّباً إلى هللتين. */
export function taxAmount(amount: number, rate: number | null | undefined): number {
  if (!Number.isFinite(amount) || rate === null || rate === undefined || !Number.isFinite(rate)) return 0;
  if (amount <= 0 || rate <= 0) return 0;
  return round2((amount * rate) / 100);
}

/** الإجمالي بعد الضريبة. */
export function totalWithTax(amount: number, rate: number | null | undefined): number {
  if (!Number.isFinite(amount)) return 0;
  return round2(amount + taxAmount(amount, rate));
}

/**
 * ملخّصُ مبالغ الطلب من حقوله كما هي في الصفّ.
 *
 * ويقبل النصّ والرقم و`Decimal` المحوَّلة نصاً: الصفّ يأتي من Prisma بـDecimal
 * لا يعبر إلى مكوّن العميل، فيُحوَّل نصاً في الطريق.
 */
export function amounts(detail: {
  amount: unknown;
  isTaxable?: boolean | null;
  taxRate?: unknown;
}): FinancialAmounts {
  const amount = toNumber(detail.amount) ?? 0;
  const rate = detail.isTaxable ? toNumber(detail.taxRate) : null;
  return {
    amount: round2(amount),
    taxRate: rate,
    taxAmount: taxAmount(amount, rate),
    total: totalWithTax(amount, rate),
  };
}

/** صياغةُ مبلغٍ بالريال بفاصلة الآلاف وهللتين. */
export function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** رقمُ الوثيقة كما يظهر في الـPDF والقائمة. */
export function serialLabel(serial: number): string {
  return `ZAD_FR_${String(serial).padStart(3, "0")}`;
}

/** بلا فراغاتٍ وبحروفٍ كبيرة — صيغةُ الآيبان المتعارفة. */
export function normaliseIban(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * حراسةٌ خفيفةٌ للآيبان: حرفان ثم أرقامٌ وحروف، وطولٌ بين ١٥ و٣٤.
 *
 * ولا أصرم من ذلك عن قصد: الحساب قد يكون غير سعودي، والحقل اختياريٌّ أصلاً،
 * فرفضٌ صارمٌ يمنع إدخالاً صحيحاً أكثر مما يمنع خطأً.
 */
export function isPlausibleIban(value: string): boolean {
  const iban = normaliseIban(value);
  return /^[A-Z]{2}[0-9A-Z]{13,32}$/.test(iban);
}

/**
 * مسمّى النوع كما يُثبَّت في الطلب.
 *
 * و«أخرى» تُدمج مع ما كُتب: «أخرى — رسوم حكومية». فالوثيقة تقول نوعها بلا
 * رجوعٍ إلى حقلٍ ثانٍ، ولو عُطّل النوع لاحقاً بقي المسمّى مفهوماً.
 */
export function typeLabelFor(typeName: string, other?: string | null): string {
  const base = typeName.trim();
  const detail = other?.trim();
  if (base !== OTHER_TYPE_NAME || !detail) return base;
  return `${base} — ${detail}`;
}

/** نسبةُ ضريبةٍ مقبولة: صفرٌ إلى مئة. */
export function isValidVatRate(value: unknown): boolean {
  const n = toNumber(value);
  return n !== null && n >= 0 && n <= 100;
}
