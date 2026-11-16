import { PHASES } from "./strategyOptions.ts";

/**
 * فحصُ حقول خطوة التنفيذ وتحويلُها — خالصاً، بلا قاعدةٍ ولا شاشة.
 *
 * **وموضعٌ واحدٌ للفحص**: الخطوةُ تُحفظ من بابين — نافذتُها كاملةً، وخليّةٌ
 * واحدةٌ تُحرَّر في الجدول. ولو فُحص كلُّ بابٍ في مكانه لاختلف المقبولُ منهما
 * عند أوّل تعديل: نافذةٌ ترفض أسبوعاً خارج المدى وخليّةٌ تقبله.
 *
 * والرسائلُ هنا هي التي تُقرأ على الشاشة، فتُكتب بلغة صاحبها لا بلغة الحقل:
 * «أسبوع البداية بين ١ و٢٢» لا «planStartWeek invalid».
 */

export const STEP_FIELDS = [
  "phase",
  "title",
  "evidence",
  "owner",
  "cost",
  "actualCost",
  "planStartWeek",
  "planWeeks",
  "actualStartWeek",
  "actualWeeks",
  "progress",
] as const;

export type StepField = (typeof STEP_FIELDS)[number];

export type StepFieldValue = string | number | null;

export type StepFieldResult = { value: StepFieldValue } | { error: string };

/** أهو حقلٌ معروف؟ — يُسأل عمّا يأتي من الشاشة قبل أن يُكتب في عمود. */
export function isStepField(value: string): value is StepField {
  return (STEP_FIELDS as readonly string[]).includes(value);
}

/** الحقولُ التي تقبل الفراغ: فراغُها «لا قيمة» لا خطأ. */
const WEEK_LABELS: Record<string, string> = {
  planStartWeek: "أسبوع البداية",
  planWeeks: "مدة الخطة",
  actualStartWeek: "أسبوع البداية الفعلي",
  actualWeeks: "مدة التنفيذ",
};

function parseMoney(raw: string, label: string): StepFieldResult {
  if (!raw) return { value: null };
  // والفواصلُ تُحذف: رقمٌ يُنسخ من جدولٍ يأتي «١٢,٥٠٠».
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? { value: n } : { error: `${label} يجب أن تكون رقماً` };
}

function parseWeekNumber(raw: string, weekCount: number, field: string): StepFieldResult {
  if (!raw) return { value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > weekCount) {
    return { error: `${WEEK_LABELS[field]} بين ١ و${weekCount}` };
  }
  return { value: n };
}

/** قيمةُ حقلٍ واحدٍ كما تُكتب في عموده، أو سببُ ردِّها. */
export function parseStepField(field: StepField, raw: string, weekCount: number): StepFieldResult {
  const text = (raw ?? "").trim();

  switch (field) {
    case "title":
      // النصُّ وحدَه لا يقبل الفراغ: خطوةٌ بلا نصٍّ صفٌّ لا يُقرأ.
      return text ? { value: text } : { error: "نصّ الخطوة مطلوب" };

    case "evidence":
    case "owner":
      return { value: text || null };

    case "phase":
      // ومرحلةٌ ليست من المراحل تُقرأ «بلا مرحلة»: القائمةُ مغلقةٌ، فما خرج عنها
      // لا يُكتب ولا يُردّ به العمل.
      return { value: (PHASES as readonly string[]).includes(text) ? text : null };

    case "cost":
      return parseMoney(text, "التكلفة");
    case "actualCost":
      return parseMoney(text, "التكلفة الفعلية");

    case "planStartWeek":
    case "planWeeks":
    case "actualStartWeek":
    case "actualWeeks":
      return parseWeekNumber(text, weekCount, field);

    case "progress": {
      if (!text) return { value: 0 };
      const n = Number(text.endsWith("%") ? text.slice(0, -1) : text);
      if (!Number.isFinite(n) || n < 0 || n > 100) return { error: "نسبة الإنجاز بين ٠ و١٠٠" };
      return { value: Math.round(n) };
    }
  }
}

export type StepFieldInput = Partial<Record<StepField, string>>;

/**
 * الحقولُ كلُّها دفعةً — لحفظ النافذة.
 *
 * وتُفحص بترتيب `STEP_FIELDS`، فيُقال أوّلُ سببٍ لا آخرُه: من كتب ثلاثة أخطاء
 * يُقرأ له واحدٌ في كلِّ محاولة، وهو ما كانت النافذةُ تفعله قبل أن يُجمع الفحصُ
 * هنا.
 */
export function parseStepFields(
  input: StepFieldInput,
  weekCount: number
): { values: Record<StepField, StepFieldValue> } | { error: string } {
  const values = {} as Record<StepField, StepFieldValue>;
  for (const field of STEP_FIELDS) {
    const result = parseStepField(field, input[field] ?? "", weekCount);
    if ("error" in result) return { error: result.error };
    values[field] = result.value;
  }
  return { values };
}
