/**
 * حساب أداء المؤشرات الاستراتيجية — دالّاتٌ خالصة لا تمسّ قاعدة البيانات.
 *
 * جُمعت هنا لأنها أكثر موضعٍ في النظام يُسأل عن رقمه: «لماذا هذا المؤشر ٦٠٪؟».
 * ولأنها خالصةٌ تُختبر بلا قاعدةٍ ولا شاشة — ملفّها المجاور فيه الحالات الحدّية.
 *
 * والقواعد منقولة عن سطر التعليمات في ورقة «متابعة الأداء» في ملف الجمعية،
 * وعن سلوك جدول مقياس الأداء القائم (`PerformanceTable`) — فالمرحلة الخامسة
 * نقلٌ أمينٌ له لا إعادة اختراع، ومواضع اختلاف الملف عنه موسومة أدناه.
 */

export type Period = "YEAR" | "Q1" | "Q2" | "Q3" | "Q4";

/** الأرباع الأربعة بترتيبها الزمني. أربعةٌ لا اثنان: ملف ٢٠٢٦ اقتصر على الثالث والرابع. */
export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
export type Quarter = (typeof QUARTERS)[number];

/**
 * حالة المؤشر في فترةٍ ما:
 * - `ACTIVE`: يُحتسب عادةً.
 * - `POSTPONED` (مؤجل): يُستثنى كلياً من المتوسطات، ويُظلَّل صفّه أزرق.
 * - `NO_DATA` (لا توجد بيانات): يُحتسب صفراً، ويُظلَّل صفّه رمادياً.
 */
export type ResultState = "ACTIVE" | "POSTPONED" | "NO_DATA";

/** اتجاه التحسن: `UP` للزيادة، `DOWN` للنقص. */
export type Polarity = "UP" | "DOWN";

export type PeriodResult = {
  target: number | null;
  actual: number | null;
  state: ResultState;
  /** للفترة السنوية وحدها: متحققٌ أُدخل يدوياً فيتجاوز الحساب التراكمي. */
  isOverride?: boolean;
};

export type IndicatorScoreInput = {
  /**
   * التراكمية، وهي مصدر قاعدة المحقق السنوي لا وحدة القياس:
   * - `false` («غير تراكمي»): يبدأ المؤشر من الصفر كل ربع، فالسنوي مجموع الأرباع.
   * - `true` («تراكمي»): القيمة مستوًى قائم يحتوي آخرُ قياسٍ له ما قبله، فالسنوي
   *   آخرُ ربعٍ له متحقق. وجمع النسب يُخرج أرقاماً كـ٣٤٠٪.
   */
  cumulative: boolean;
  polarity?: Polarity;
  year: PeriodResult;
  quarters: Partial<Record<Quarter, PeriodResult>>;
};

export const EMPTY_RESULT: PeriodResult = { target: null, actual: null, state: "ACTIVE" };

/** تصنيف الأداء بحدوده المعتمدة في الجدول القائم. */
export type Grade = "EXCELLENT" | "GOOD" | "WEAK" | "NO_DATA" | "POSTPONED";

const hasValue = (v: number | null | undefined): v is number =>
  v !== null && v !== undefined && Number.isFinite(v);

/** تقريبٌ إلى منزلةٍ عشرية واحدة — كما يفعل الجدول القائم. */
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * نسبة إنجاز فترةٍ واحدة على مستهدفها وحده، بحدٍّ أقصى ١٠٠٪.
 *
 * ويُعاد `null` حين لا يكون للنسبة معنى: فترةٌ مؤجلة، أو لا مستهدفَ لها. وهذا
 * فرقٌ عن الجدول القائم الذي يُرجع صفراً في الحالتين — والصفر يُنزل المتوسط
 * ويُظهر مؤشراً بلا مستهدفٍ «ضعيف الأداء». فمن أراد سلوك الجدول الحرفي
 * فليعامل `null` معاملة الصفر عند العرض.
 */
export function periodPercent(result: PeriodResult, polarity: Polarity = "UP"): number | null {
  if (result.state === "POSTPONED") return null;
  if (!hasValue(result.target)) return null;

  const actual = result.state === "NO_DATA" || !hasValue(result.actual) ? 0 : result.actual;

  // مستهدفٌ صفر: لا شيء مطلوب، فكلّ ما تحقّق كافٍ. (وهذا سلوك الجدول القائم؛
  // وملف Excel يُظهرها صفراً، فأربعون مؤشراً فيه «ضعيف» لأن مستهدفاتها أصفار.)
  if (result.target === 0) return actual >= 0 ? 100 : 0;

  // في مؤشرات النقص يكون التحسن نزولاً، فالنسبة مقلوبة.
  const ratio = polarity === "DOWN" ? safeDown(result.target, actual) : (actual / result.target) * 100;

  return Math.min(round1(ratio), 100);
}

/** مؤشر نقص: بلوغ صفرٍ أو أقلّ من المستهدف إنجازٌ تام. */
function safeDown(target: number, actual: number): number {
  if (actual <= 0) return 100;
  return (target / actual) * 100;
}

export type AnnualActual = {
  value: number | null;
  /** من أين جاء الرقم — يُعرض في الجدول كي لا يتغيّر رقمٌ أُدخل يدوياً بلا بيان. */
  source: "override" | "sum" | "last" | "none";
};

/**
 * المحقق السنوي محسوباً من الأرباع لا مُدخلاً:
 * - غير تراكمي ← مجموع متحقق الأرباع (تُتجاهل الأرباع المؤجلة).
 * - تراكمي ← آخر ربعٍ له متحقق، بحثاً من الرابع إلى الأول.
 *
 * ويتقدّم عليهما التجاوز اليدوي إن وُجد.
 */
export function annualActual(input: IndicatorScoreInput): AnnualActual {
  if (input.year.isOverride && hasValue(input.year.actual)) {
    return { value: input.year.actual, source: "override" };
  }

  const counted = QUARTERS.map((q) => input.quarters[q]).filter(
    (r): r is PeriodResult => !!r && r.state !== "POSTPONED" && hasValue(r.actual)
  );
  if (counted.length === 0) return { value: null, source: "none" };

  if (input.cumulative) {
    for (let i = QUARTERS.length - 1; i >= 0; i--) {
      const r = input.quarters[QUARTERS[i]];
      if (r && r.state !== "POSTPONED" && hasValue(r.actual)) {
        return { value: r.actual, source: "last" };
      }
    }
    return { value: null, source: "none" };
  }

  const sum = counted.reduce((acc, r) => acc + (r.actual as number), 0);
  return { value: round1(sum), source: "sum" };
}

/** نسبة الإنجاز السنوية: المحقق المحسوب على المستهدف السنوي، بحدٍّ أقصى ١٠٠٪. */
export function annualPercent(input: IndicatorScoreInput): number | null {
  if (input.year.state === "POSTPONED") return null;
  const { value } = annualActual(input);
  return periodPercent(
    { target: input.year.target, actual: value, state: input.year.state },
    input.polarity
  );
}

/** تصنيف نسبةٍ إلى درجةٍ بحدود الجدول: ٩٠٪+ ممتاز، ٧٠-٩٠ جيد جداً، أقلّ ضعيف. */
export function grade(percent: number | null, state: ResultState = "ACTIVE"): Grade {
  if (state === "POSTPONED") return "POSTPONED";
  if (state === "NO_DATA") return "NO_DATA";
  if (percent === null) return "NO_DATA";
  if (percent >= 90) return "EXCELLENT";
  if (percent >= 70) return "GOOD";
  return "WEAK";
}

export const GRADE_LABEL: Record<Grade, string> = {
  EXCELLENT: "أداء ممتاز",
  GOOD: "أداء جيد جداً",
  WEAK: "أداء ضعيف",
  NO_DATA: "لا توجد بيانات",
  POSTPONED: "مؤجل",
};

/** نبرة الشارة لكل درجة — من نبرات `Badge` القائمة، فلا لونَ جديد. */
export const GRADE_TONE: Record<Grade, "good" | "warn" | "danger" | "muted"> = {
  EXCELLENT: "good",
  GOOD: "warn",
  WEAK: "danger",
  NO_DATA: "muted",
  POSTPONED: "muted",
};

/**
 * متوسط نسبٍ لمجموعة: يُستثنى منها المؤجل (`null`)، وتُحتسب «لا توجد بيانات»
 * صفراً — فهي عند الحساب صفرٌ لا فراغ. وبها يُحسب أداء الهدف، ثم أداء المحور
 * من أهدافه، ثم أداء الجمعية من محاورها — كما في الجدول القائم.
 */
export function averagePercent(percents: Array<number | null>): number | null {
  const counted = percents.filter((p): p is number => p !== null);
  if (counted.length === 0) return null;
  return round1(counted.reduce((a, b) => a + b, 0) / counted.length);
}

/** توزيع الدرجات على فئاتها — أرقام بطاقات لوحة المعلومات. */
export function gradeTally(grades: Grade[]): Record<Grade, number> {
  const tally: Record<Grade, number> = {
    EXCELLENT: 0,
    GOOD: 0,
    WEAK: 0,
    NO_DATA: 0,
    POSTPONED: 0,
  };
  for (const g of grades) tally[g]++;
  return tally;
}

/**
 * نسبة اكتمال إدخال النتائج: كم مؤشراً له متحققٌ مُدخل من إجمالي غير المؤجل.
 * وهي رقمُ «نسبة اكتمال إدخال النتائج» في لوحة المعلومات.
 */
export function entryCompletion(inputs: IndicatorScoreInput[]): number | null {
  const active = inputs.filter((i) => i.year.state !== "POSTPONED");
  if (active.length === 0) return null;
  const filled = active.filter((i) => annualActual(i).value !== null).length;
  return round1((filled / active.length) * 100);
}
