/**
 * استبانةُ قياس تنفيذ الخطة التشغيلية — نصُّها وقواعدُها.
 *
 * وحدةٌ خالصةٌ بلا استيراد: نصُّ الاستبانة بيانٌ لا جدولٌ في القاعدة، لأنه
 * واحدٌ لكل الجمعيات ويُراجَع بنسخةٍ من المستودع لا بتعديلٍ في صفّ. والأجوبةُ
 * وحدها تُخزَّن، مفاتيحُها أرقامُ العبارات هنا — فتغييرُ نصّ عبارةٍ لا يُفقد
 * جوابَها، وحذفُها يُفقده.
 *
 * والمصدر: `docs/استبانة_قياس_تنفيذ_الخطة_التشغيلية_2026.docx`.
 */

export const SURVEY_TITLE = "استبانة قياس مستوى تنفيذ الخطة التشغيلية 2026";

export const SURVEY_INTRO = [
  "تقيس هذه الاستبانة ثلاثة أمور في تنفيذ الخطة التشغيلية لعام 2026 منذ بدء تنفيذها حتى تاريخه: مستوى الالتزام بالخطة، ومدى تنفيذ المهام المستحقة، والمتعثرات التي تعيق التنفيذ.",
  "الفئة المستهدفة: مديرو المشاريع والمبادرات، ومسؤولو التنفيذ في الإدارات والأقسام المعنية بالخطة.",
  "مدة التعبئة: نحو 10–15 دقيقة. تُستخدم الإجابات لأغراض التحسين والمتابعة فقط.",
  "نرجو الإجابة بدقة وشفافية، فالإفصاح عن التعثر مبكراً هو ما يتيح معالجته في الوقت المناسب.",
] as const;

/** عناوينُ الأقسام السبعة — ومنها يُبنى مسارُ النموذج. */
export const SECTIONS = [
  "الجمعية",
  "بيانات المستجيب",
  "مستوى الالتزام بالخطة",
  "تنفيذ المهام المستحقة",
  "المتعثرات والتحديات",
  "الجاهزية لما تبقّى",
  "أسئلة مفتوحة",
] as const;

export const SECTION_COUNT = SECTIONS.length;

/** سُلّمُ التقييم: خمسُ درجاتٍ بأسمائها. */
export const RATING_LABELS: Record<number, string> = {
  5: "موافق بشدة",
  4: "موافق",
  3: "محايد",
  2: "غير موافق",
  1: "غير موافق بشدة",
};

export type RatingStatement = { id: number; text: string };
export type RatingGroup = { title: string; statements: RatingStatement[] };

/** القسم الثالث: خمسَ عشرةَ عبارةً في أربع مجموعات. */
export const COMMITMENT_GROUPS: RatingGroup[] = [
  {
    title: "أ. الوضوح والمعرفة بالخطة",
    statements: [
      { id: 1, text: "اطّلعتُ على الخطة التشغيلية وأعرف المهام المسندة إلى إدارتي" },
      { id: 2, text: "مخرجات كل مهمة مسندة إليّ واضحة ومحددة" },
      { id: 3, text: "أعرف ارتباط مهامي بمؤشرات الأداء في الخطة" },
    ],
  },
  {
    title: "ب. الالتزام بالزمن والتكلفة",
    statements: [
      { id: 4, text: "نلتزم بتواريخ البداية والنهاية المحددة في الخطة" },
      { id: 5, text: "تبدأ المهمة التالية في موعدها لأن المهمة السابقة تُنجز في وقتها" },
      { id: 6, text: "نلتزم بالتكلفة المعتمدة لكل مهمة دون تجاوز" },
      { id: 7, text: "تُصرف المبالغ المعتمدة في الوقت المطلوب للتنفيذ" },
    ],
  },
  {
    title: "ج. المتابعة والتحديث",
    statements: [
      { id: 8, text: "تُحدَّث نسب الإنجاز وحالة المهام في ملف الخطة بشكل دوري" },
      { id: 9, text: "تُعقد اجتماعات متابعة منتظمة لمراجعة سير الخطة" },
      { id: 10, text: "يُبلَّغ مسؤول متابعة الخطة التشغيلية والاستراتيجية بأي تأخير فور حدوثه" },
      { id: 11, text: "تُوثَّق الملاحظات والقرارات المتعلقة بكل مهمة" },
    ],
  },
  {
    title: "د. الموارد والتنسيق",
    statements: [
      { id: 12, text: "عدد الموظفين المتاح كافٍ لتنفيذ مهامي في وقتها" },
      { id: 13, text: "التنسيق بين الإدارات في المهام المترابطة فعّال" },
      { id: 14, text: "الإدارة العليا تدعم تنفيذ الخطة وتتخذ القرارات اللازمة في وقتها" },
      { id: 15, text: "الأدوات والأنظمة اللازمة (المنصات، النماذج) متوفرة" },
    ],
  },
];

/** القسم السادس: ستُّ عباراتٍ عن الجاهزية. */
export const READINESS_STATEMENTS: RatingStatement[] = [
  { id: 16, text: "المهام المتبقية واضحة ومجدولة زمنياً" },
  { id: 17, text: "الموظفون اللازمون لتنفيذ المهام المتبقية متوفرون" },
  { id: 18, text: "الموازنة المتبقية كافية لإنجاز المهام المتبقية" },
  { id: 19, text: "الاعتمادات والقرارات اللازمة للمرحلة القادمة صادرة أو مجدولة" },
  { id: 20, text: "المتطلبات المعتمدة على إدارات أخرى منسقة مسبقاً" },
  { id: 21, text: "أدوات قياس مؤشرات الأداء المرتبطة بمهامي جاهزة" },
];

export const COMMITMENT_IDS = COMMITMENT_GROUPS.flatMap((g) => g.statements.map((s) => s.id));
export const READINESS_IDS = READINESS_STATEMENTS.map((s) => s.id);
export const ALL_RATING_IDS = [...COMMITMENT_IDS, ...READINESS_IDS];

export const ROLES = [
  "مدير مشروع / مبادرة",
  "مسؤول تنفيذ مهمة أو أكثر",
  "عضو فريق تنفيذ",
] as const;

/** الحالةُ الفعلية لكل مهمة في جدول القسم الرابع. */
export const TASK_STATUSES = ["مكتمل", "جاري التنفيذ", "متأخر", "لم يبدأ", "ملغى أو مؤجل"] as const;

export const PACE_OPTIONS = [
  "متقدم على الجدول الزمني",
  "وفق الجدول الزمني",
  "متأخر أقل من أسبوعين",
  "متأخر من أسبوعين إلى شهر",
  "متأخر أكثر من شهر",
  "لم أطّلع على الخطة وجدولها الزمني",
] as const;

/** أسبابُ التعثر — وآخرُها «أخرى» ومعها نصٌّ حرّ. */
export const CAUSES = [
  "عدم وضوح المهمة أو مخرجاتها المطلوبة",
  "نقص عدد الموظفين أو انشغالهم بمهام تشغيلية أخرى",
  "تأخر اعتماد أو قرار من جهة أخرى",
  "تأخر صرف الموازنة أو عدم كفايتها",
  "ضعف التنسيق بين الإدارات",
  "انتظار مهمة سابقة لم تُنجز في موعدها",
  "عدم جاهزية الأدوات أو الأنظمة (المنصات، النماذج)",
  "مدة زمنية غير واقعية في الخطة",
  "تغيّر الأولويات أثناء التنفيذ",
  "ضعف المتابعة الدورية",
  "لا توجد متعثرات",
] as const;

export const CAUSE_NONE = "لا توجد متعثرات";
export const CAUSE_OTHER = "أخرى";

export const OUTLOOK_OPTIONS = [
  "نعم، في موعدها",
  "نعم، مع تأخير بسيط لا يتجاوز أسبوعين",
  "مع تأخير كبير يتجاوز نهاية العام",
  "لا، تحتاج إلى إعادة جدولة",
] as const;

export const OPEN_QUESTIONS = [
  { id: "achievements", text: "ما أبرز ما تحقق من الخطة حتى الآن؟" },
  { id: "neededAction", text: "ما الإجراء الأهم الذي تحتاجه الخطة الآن لتعود إلى مسارها أو تحافظ عليه؟" },
  { id: "suggestions", text: "ما مقترحاتك لتحسين آلية التخطيط والمتابعة في الخطة القادمة؟" },
] as const;

/** أقصى عددٍ من الأسباب في «أبرز ثلاثة». */
export const TOP_CAUSES_MAX = 3;

// ── حسابات ──────────────────────────────────────────────────────────────────

/**
 * متوسطُ درجاتِ مجموعةٍ من العبارات، من ٥.
 *
 * وما لم يُجب عنه لا يُحسب صفراً: صفرٌ درجةٌ أدنى من «غير موافق بشدة» ولا
 * تُقال في السُّلّم، فيُخرَج من المتوسط ويُعدّ في «المُجاب عنه».
 */
export function ratingAverage(
  ratings: Record<string, number> | null | undefined,
  ids: readonly number[]
): { average: number | null; answered: number; total: number } {
  const values = ids
    .map((id) => ratings?.[String(id)])
    .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
  return {
    average: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null,
    answered: values.length,
    total: ids.length,
  };
}

/** هل أُجيب عن كل عبارات القسم؟ — شرطُ الانتقال منه. */
export function ratingsComplete(
  ratings: Record<string, number> | null | undefined,
  ids: readonly number[]
): boolean {
  return ids.every((id) => {
    const v = ratings?.[String(id)];
    return typeof v === "number" && v >= 1 && v <= 5;
  });
}

/** نسبةُ إنجازٍ مقبولة: عددٌ صحيحٌ بين صفر ومئة. */
export function parseProgress(input: unknown): number | null {
  const text = String(input ?? "").replace(/[٪%]/g, "").trim();
  // `Number("")` صفرٌ لا خطأ، وخانةٌ فارغةٌ ليست إنجازاً صفريّاً بل جوابٌ لم
  // يُكتب — فتُرفض قبل التحويل.
  if (text === "") return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return rounded >= 0 && rounded <= 100 ? rounded : null;
}

/**
 * الموعدُ المخطَّطُ لإنجاز خطوةٍ، من أرقام أسابيعها في الخطة.
 *
 * فالخطوةُ في الخطة أسبوعُ بدايةٍ وعددُ أسابيع، لا تاريخان. وآخرُ يومٍ في
 * نافذتها هو ما يُقارن به المستجيب.
 */
export function stepPlannedEnd(
  planStart: Date,
  planStartWeek: number | null,
  planWeeks: number | null
): Date | null {
  if (!planStartWeek || planStartWeek < 1) return null;
  const weeks = planWeeks && planWeeks > 0 ? planWeeks : 1;
  const days = (planStartWeek - 1 + weeks) * 7 - 1;
  return new Date(planStart.getTime() + days * 86400000);
}
