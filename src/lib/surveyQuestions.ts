/**
 * أسئلةُ الاستبيان المخصَّص: صيغتُها على السلك، ومنطقُ إجاباتها.
 *
 * وجدولُ `CustomSurveyQuestion` فيه `type` نصّاً و`options` JSON — فلا هِجرةَ
 * قاعدةٍ لنوعٍ جديد، بل خانةُ الخيارات تحمل ما يُناسب النوع:
 *
 * | النوع | ما في `options` |
 * |---|---|
 * | `OPTIONS` · `MULTI_OPTIONS` | `[{ id, text, allowText? }]` |
 * | `YES_NO` | `{ followUpQuestions, followUpOn }` — لا قائمةَ خيارات |
 * | `MATRIX` | `{ rows, columns, max, labels? }` — درجةٌ في كل خليّة |
 * | `CHOICE_MATRIX` | الصيغةُ نفسُها — علامةُ صحٍّ واحدةٌ في كل صف |
 * | غيرها | `null` |
 *
 * وكانت ترجمةُ هذه الصيغة مكتوبةً ثلاثَ مرّات (التحرير، والتعبئة، والنتائج)
 * وناقصةً في الطباعة — فنوعٌ رابعٌ يعني أربعَ نسخٍ تفترق عند أوّل تعديل. فصارت
 * هنا مرّةً واحدةً مُختبَرة.
 */

export type ChoiceOption = {
  id: string;
  text: string;
  /** خيارٌ يفتح مربّعَ نصٍّ يُكتب فيه — «أخرى: ....». */
  allowText?: boolean;
};

export type MatrixHeading = { id: string; text: string };

export type MatrixSpec = {
  /** الصفوف: ما يُقيَّم (الخدماتُ مثلاً). */
  rows: MatrixHeading[];
  /** الأعمدة: ما يُقيَّم به (المعايير). */
  columns: MatrixHeading[];
  /** أعلى درجةٍ — من ١ إلى `max`. */
  max: number;
  /** تسميةُ درجةٍ بعينها: `labels["5"] = "ممتاز"`. */
  labels?: Record<string, string>;
};

export type FollowUpQuestion = { id: string; text: string; isRequired: boolean };

/**
 * مربّعُ نصٍّ على سؤال الخيارات نفسِه — بعنوانه، إجباريٌّ أو اختياريّ.
 *
 * وهو غيرُ نصِّ «أخرى» (`allowText` على خيارٍ بعينه): ذاك لا يظهر إلّا إذا
 * اختير خيارُه ويقول «ما هو الخيارُ الآخر؟»، وهذا يظهر دائماً مع السؤال ويسأل
 * عن شيءٍ آخر — «ولماذا؟» أو «اذكر مثالاً».
 *
 * ويُخزَّن في خانة `options` نفسِها: تصير `{ choices, extra }` مكان المصفوفة
 * المجرّدة. والقراءةُ تقبل الشكلين، والكتابةُ تُبقي المصفوفةَ ما لم يكن ثَمّ
 * مربّع — فالاستبياناتُ القائمةُ لا تُهاجر ولا تُمَسّ.
 */
export type ExtraTextSpec = {
  /** عنوانُ المربّع كما يُعرض فوقه. */
  label: string;
  required: boolean;
};

export type SurveyQuestion = {
  id: string;
  text: string;
  type: string;
  isRequired: boolean;
  allowAttachment: boolean;
  requireAttachmentIfYes?: boolean;
  options?: ChoiceOption[];
  followUpQuestions?: FollowUpQuestion[];
  /** الجوابُ الذي تظهر عنده الأسئلةُ التابعة — افتراضُه «نعم». */
  followUpOn?: "yes" | "no";
  matrix?: MatrixSpec;
  /** مربّعُ نصٍّ على السؤال — لأسئلة الخيارات وحدَها. */
  extraText?: ExtraTextSpec;
};

export const MATRIX_MIN_SCALE = 2;
export const MATRIX_MAX_SCALE = 10;
export const DEFAULT_MATRIX_SCALE = 5;

const SEP = "::";
/**
 * علامةُ النوع في المفتاح — ولكلٍّ علامتُه.
 *
 * وكانت الخليّةُ بلا علامة (`سؤال::صفّ::عمود`) ونصُّ «أخرى» بعلامة، فصفٌّ
 * اسمُه `@text` يُولّد مفتاحَ خليّةٍ هو نفسُه مفتاحُ نصِّ خيار: إجابةٌ تمحو
 * أخرى. والاختبارُ كشفه.
 */
const CELL_MARK = "@cell";
const TEXT_MARK = "@text";
const ROW_MARK = "@row";
const EXTRA_MARK = "@extra";

/** النوعان اللذان يحملان صفوفاً وأعمدة. */
export function isMatrixType(type: string): boolean {
  return type === "MATRIX" || type === "CHOICE_MATRIX";
}

/** مفتاحُ خليّةٍ في المصفوفة: سؤالٌ وصفٌّ وعمود. */
export function matrixCellKey(questionId: string, rowId: string, columnId: string): string {
  return `${questionId}${SEP}${CELL_MARK}${SEP}${rowId}${SEP}${columnId}`;
}

/** مفتاحُ صفٍّ في جدول الاختيار: قيمتُه معرِّفُ العمود المختار. */
export function choiceRowKey(questionId: string, rowId: string): string {
  return `${questionId}${SEP}${ROW_MARK}${SEP}${rowId}`;
}

/** مفتاحُ نصِّ خيارِ «أخرى». */
export function otherTextKey(questionId: string, optionId: string): string {
  return `${questionId}${SEP}${TEXT_MARK}${SEP}${optionId}`;
}

/** مفتاحُ مربّعِ النصِّ الذي على السؤال — واحدٌ للسؤال، فلا معرِّفَ بعده. */
export function extraTextKey(questionId: string): string {
  return `${questionId}${SEP}${EXTRA_MARK}`;
}

/** الأنواعُ التي تقبل مربّعَ نصٍّ على السؤال: أسئلةُ الخيارات. */
export function supportsExtraText(type: string): boolean {
  return type === "OPTIONS" || type === "MULTI_OPTIONS";
}

/** يقرأ وصفَ المربّع من خانة الخيارات — وبلا عنوانٍ لا مربّع. */
export function parseExtraText(value: unknown): ExtraTextSpec | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const bag = value as Record<string, unknown>;
  const label = String(bag.label ?? "").trim();
  if (!label) return undefined;
  return { label, required: bag.required === true };
}

/** ما كُتب في مربّع السؤال. */
export function extraTextValue(question: SurveyQuestion, answers: Answers): string {
  if (!question.extraText) return "";
  return (answers[extraTextKey(question.id)] || "").trim();
}

/** مربّعٌ إجباريٌّ لم يُكتب فيه شيء. */
export function extraTextMissing(question: SurveyQuestion, answers: Answers): boolean {
  if (!question.extraText?.required) return false;
  return extraTextValue(question, answers) === "";
}

function headings(value: unknown): MatrixHeading[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({ id: String(item.id ?? ""), text: String(item.text ?? "") }))
    .filter((item) => item.id !== "");
}

/** يقرأ وصفَ المصفوفة من خانة الخيارات، ويُصلح ما جاء ناقصاً. */
export function parseMatrix(value: unknown): MatrixSpec {
  const bag = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  const asked = Number(bag.max);
  const max = Number.isFinite(asked)
    ? Math.min(MATRIX_MAX_SCALE, Math.max(MATRIX_MIN_SCALE, Math.trunc(asked)))
    : DEFAULT_MATRIX_SCALE;
  const labels =
    bag.labels && typeof bag.labels === "object" && !Array.isArray(bag.labels)
      ? Object.fromEntries(Object.entries(bag.labels as Record<string, unknown>).map(([key, value]) => [key, String(value)]))
      : undefined;
  return { rows: headings(bag.rows), columns: headings(bag.columns), max, ...(labels ? { labels } : {}) };
}

function choices(value: unknown): ChoiceOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      text: String(item.text ?? ""),
      ...(item.allowText ? { allowText: true } : {}),
    }));
}

/** صفُّ السؤال كما يأتي من المسار — خانةُ `options` فيه JSON لا شكلَ له. */
export type QuestionRow = Record<string, unknown>;

/** من صيغة القاعدة إلى السؤال كما تقرأه الصفحات. */
export function questionFromApi(raw: QuestionRow): SurveyQuestion {
  const base: SurveyQuestion = {
    id: String(raw.id),
    text: String(raw.text ?? ""),
    type: String(raw.type ?? "TEXT"),
    isRequired: raw.isRequired !== false,
    allowAttachment: raw.allowAttachment === true,
    requireAttachmentIfYes: raw.requireAttachmentIfYes === true,
  };

  if (base.type === "YES_NO") {
    const bag = (
      raw.options && typeof raw.options === "object" && !Array.isArray(raw.options) ? raw.options : {}
    ) as { followUpQuestions?: unknown; followUpOn?: unknown };
    return {
      ...base,
      followUpQuestions: Array.isArray(bag.followUpQuestions) ? (bag.followUpQuestions as FollowUpQuestion[]) : [],
      followUpOn: bag.followUpOn === "no" ? "no" : "yes",
    };
  }

  if (isMatrixType(base.type)) return { ...base, matrix: parseMatrix(raw.options) };

  // وخانةُ الخيارات تقبل شكلين: مصفوفةً مجرّدةً كما كانت، أو `{ choices, extra }`
  // لمن أُضيف إليه مربّعُ نصّ. فلا هجرةَ بيانٍ ولا صفٌّ قديمٌ يُقرأ خطأً.
  const bag =
    raw.options && typeof raw.options === "object" && !Array.isArray(raw.options)
      ? (raw.options as Record<string, unknown>)
      : null;
  if (bag) {
    const extraText = parseExtraText(bag.extra);
    return {
      ...base,
      options: choices(bag.choices),
      ...(extraText ? { extraText } : {}),
    };
  }

  return { ...base, options: choices(raw.options) };
}

export function questionsFromApi(questions: QuestionRow[]): SurveyQuestion[] {
  return (questions || []).map(questionFromApi);
}

/** ومن السؤال إلى صيغة القاعدة. */
export function questionForApi(question: SurveyQuestion): QuestionRow {
  const { options, followUpQuestions, followUpOn, matrix, extraText, ...rest } = question;

  if (question.type === "YES_NO") {
    return {
      ...rest,
      options:
        followUpQuestions && followUpQuestions.length > 0
          ? { followUpQuestions, followUpOn: followUpOn === "no" ? "no" : "yes" }
          : null,
    };
  }

  if (isMatrixType(question.type)) {
    const spec = matrix ?? { rows: [], columns: [], max: DEFAULT_MATRIX_SCALE };
    return {
      ...rest,
      options: {
        rows: spec.rows,
        columns: spec.columns,
        max: spec.max,
        ...(spec.labels ? { labels: spec.labels } : {}),
      },
    };
  }

  // والمربّعُ يُكتب في الخانة نفسِها، ولا تُغيَّر صيغةُ من لا مربّعَ له: صفٌّ
  // قديمٌ يُحفظ من المحرِّر يبقى مصفوفةً كما كان.
  const extra = supportsExtraText(question.type) && extraText?.label.trim() ? extraText : null;
  if (extra) {
    return {
      ...rest,
      options: {
        choices: options ?? [],
        extra: { label: extra.label.trim(), required: extra.required === true },
      },
    };
  }

  return { ...rest, options: options && options.length > 0 ? options : null };
}

export function questionsForApi(questions: SurveyQuestion[]): QuestionRow[] {
  return (questions || []).map(questionForApi);
}

// ── المصفوفة: حسابُ ما مُلئ وما نقص ─────────────────────────────────────────

export type Answers = Record<string, string | undefined>;

/** مفاتيحُ خلايا صفٍّ واحد. */
export function matrixRowKeys(question: SurveyQuestion, rowId: string): string[] {
  return (question.matrix?.columns ?? []).map((column) => matrixCellKey(question.id, rowId, column.id));
}

/** عددُ خلايا المصفوفة كلِّها — وفي جدول الاختيار عددُ صفوفه. */
export function matrixCellCount(question: SurveyQuestion): number {
  const matrix = question.matrix;
  if (question.type === "CHOICE_MATRIX") return matrix?.rows.length ?? 0;
  return matrix ? matrix.rows.length * matrix.columns.length : 0;
}

/** صفوفُ جدول الاختيار التي لم يُختر فيها خيارٌ قائم. */
export function choiceMatrixMissingRows(question: SurveyQuestion, answers: Answers): MatrixHeading[] {
  const matrix = question.matrix;
  if (!matrix) return [];
  return matrix.rows.filter((row) => {
    const picked = answers[choiceRowKey(question.id, row.id)];
    return !matrix.columns.some((column) => column.id === picked);
  });
}

/** عددُ الخلايا المُقيَّمة — وفي جدول الاختيار عددُ الصفوف المُجاب عنها. */
export function matrixFilledCount(question: SurveyQuestion, answers: Answers): number {
  const matrix = question.matrix;
  if (!matrix) return 0;
  if (question.type === "CHOICE_MATRIX") return matrix.rows.length - choiceMatrixMissingRows(question, answers).length;
  let count = 0;
  for (const row of matrix.rows) {
    for (const key of matrixRowKeys(question, row.id)) {
      if (answers[key]) count += 1;
    }
  }
  return count;
}

/**
 * الصفوفُ المملوءةُ نصفَ ملء.
 *
 * فالخدمةُ التي لم تُستفد تُترك فارغةً كلَّها — والصفُّ الذي قُيّم بعضُه وتُرك
 * بعضُه يُفسد المتوسّطَ ولا يقول أحدٌ إنه ناقص.
 */
export function matrixPartialRows(question: SurveyQuestion, answers: Answers): MatrixHeading[] {
  const matrix = question.matrix;
  if (!matrix) return [];
  return matrix.rows.filter((row) => {
    const keys = matrixRowKeys(question, row.id);
    const filled = keys.filter((key) => !!answers[key]).length;
    return filled > 0 && filled < keys.length;
  });
}

// ── الخيارات ونصُّ «أخرى» ──────────────────────────────────────────────────

/** الخياراتُ المختارة: واحدٌ في `OPTIONS`، وعدّةٌ مفصولةٌ بفاصلةٍ في `MULTI_OPTIONS`. */
export function selectedOptionIds(question: SurveyQuestion, raw: string | undefined): string[] {
  if (!raw) return [];
  if (question.type === "MULTI_OPTIONS") return raw.split(",").filter(Boolean);
  return [raw];
}

/** خياراتٌ اختيرت وتفتح نصّاً ولم يُكتب فيها شيء. */
export function optionsAwaitingText(question: SurveyQuestion, answers: Answers): ChoiceOption[] {
  const picked = new Set(selectedOptionIds(question, answers[question.id]));
  return (question.options ?? []).filter(
    (option) =>
      option.allowText && picked.has(option.id) && !(answers[otherTextKey(question.id, option.id)] || "").trim()
  );
}

/** نصُّ الإجابة مقروءاً — ومعه ما كُتب في «أخرى». */
export function answerText(question: SurveyQuestion, raw: unknown, answers: Answers = {}): string {
  // ومربّعُ السؤال يُضمّ إلى الجواب حيث يُقرأ: النتائجُ والطباعةُ تقرآن من هنا،
  // فنصٌّ كتبه المشاركُ ولا يظهر في التقرير نصٌّ ضائع.
  const extra = extraTextValue(question, answers);
  const withExtra = (text: string) =>
    extra ? (text ? `${text} — ${question.extraText!.label}: ${extra}` : `${question.extraText!.label}: ${extra}`) : text;

  if (raw === undefined || raw === null || raw === "") return withExtra("");
  const value = String(raw);

  const withTyped = (option: ChoiceOption | undefined, fallback: string) => {
    if (!option) return fallback;
    if (!option.allowText) return option.text;
    const typed = (answers[otherTextKey(question.id, option.id)] || "").trim();
    return typed ? `${option.text}: ${typed}` : option.text;
  };

  if (question.type === "OPTIONS") {
    return withExtra(withTyped(question.options?.find((option) => option.id === value), value));
  }

  if (question.type === "MULTI_OPTIONS") {
    return withExtra(
      value
        .split(",")
        .filter(Boolean)
        .map((id) => withTyped(question.options?.find((option) => option.id === id), id))
        .join("، ")
    );
  }

  if (question.type === "YES_NO") return value === "yes" ? "نعم" : "لا";

  return value;
}

/**
 * هل أُجيب عن السؤال؟ ولا تدخل المرفقاتُ هنا: شأنُها الصفحةُ التي ترفعها.
 */
export function isAnswered(question: SurveyQuestion, answers: Answers): boolean {
  if (question.type === "MATRIX") return matrixFilledCount(question, answers) > 0;
  // بخلاف المصفوفة: جدولُ الاختيار الإجباريُّ لا يكتمل إلّا بصفوفه كلِّها.
  if (question.type === "CHOICE_MATRIX") return choiceMatrixMissingRows(question, answers).length === 0;
  if (optionsAwaitingText(question, answers).length > 0) return false;
  // ومربّعٌ إجباريٌّ على السؤال كالخيار: اختيارٌ بلا جوابه ليس جواباً.
  if (extraTextMissing(question, answers)) return false;
  return !!answers[question.id];
}
