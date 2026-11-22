/**
 * منطقُ دليل الحوكمة — أحجامُ الجمعيات، وتسمياتُ المعايير، والبحثُ فيها.
 *
 * **والدليلُ نصٌّ ثابتٌ لا صفوفُ قاعدة**: `src/data/governanceManual.ts` نسخةٌ
 * من الأدلّة الاسترشادية للمركز الوطني، تُقرأ ولا تُكتب. فما هنا قراءةٌ
 * وتصفيةٌ وتسمية، لا حفظَ فيه ولا استعلام.
 *
 * **والأنواعُ موصوفةٌ لا مستوردة**: الدالّةُ تطلب ما تقرؤه وحدَه، فتُختبر
 * بصفٍّ من سطرين ولا تجرُّ ملفَ بياناتٍ من ألفين وستمئة سطرٍ إلى الاختبار.
 */

import { matchesQuery, normalizeArabic } from "./arabicSearch.ts";

/**
 * كعكةُ الحجم المختار — اسمُها هنا كي تقرأها الصفحةُ وتكتبها الشاشةُ من موضعٍ
 * واحد، فلا يُكتب اسمٌ في موضعٍ ويُقرأ غيرُه في الآخر.
 */
export const GUIDE_SIZE_COOKIE = "governanceSize";

export type GuideQuestion = { question: string; proof: string };

export type GuidePractice = {
  id: string;
  title: string;
  description?: string;
  questions: GuideQuestion[];
};

export type GuideProof = { title: string; requirements: string[] };

export type GuideStandard = {
  id: string;
  title: string;
  description: string;
  practices: GuidePractice[];
  detailedProofs?: GuideProof[];
};

/**
 * أحجامُ الجمعيات كما يصنّفها المركز الوطني — والحدُّ إيرادُ السنة.
 *
 * والترتيبُ من الأصغر إلى الأكبر: هو ترتيبُ الحدود، فلا يُقرأ سلّمٌ مبعثراً.
 */
export const CHARITY_SIZES = [
  {
    id: "MICRO",
    label: "متناهية الصغر",
    title: "الجمعيات متناهية الصغر",
    revenue: "إيراداتها السنوية لا تتجاوز 500 ألف ريال.",
  },
  {
    id: "SMALL",
    label: "الصغيرة",
    title: "الجمعيات الصغيرة",
    revenue: "إيراداتها السنوية من 500 ألف إلى 2 مليون ريال.",
  },
  {
    id: "MEDIUM",
    label: "المتوسطة",
    title: "الجمعيات المتوسطة",
    revenue: "إيراداتها السنوية من 2 مليون إلى 8 مليون ريال.",
  },
  {
    id: "LARGE",
    label: "الكبيرة",
    title: "الجمعيات الكبيرة",
    revenue: "إيراداتها السنوية من 8 مليون إلى 30 مليون ريال.",
  },
  {
    id: "MEGA",
    label: "متناهية الكبر",
    title: "الجمعيات متناهية الكبر",
    revenue: "إيراداتها السنوية تتجاوز 30 مليون ريال.",
  },
] as const;

export type GuideSizeId = (typeof CHARITY_SIZES)[number]["id"];

export function isGuideSize(value: unknown): value is GuideSizeId {
  return typeof value === "string" && CHARITY_SIZES.some((s) => s.id === value);
}

export function guideSize(value: unknown) {
  return CHARITY_SIZES.find((s) => s.id === value) ?? null;
}

export function guideSizeLabel(value: unknown): string {
  return guideSize(value)?.label ?? "";
}

/**
 * عنوانُ المعيار بلا ترتيبه: «أولاً: معيار الامتثال» ← «معيار الامتثال».
 *
 * ولمَ يُحذف: الترتيبُ مقروءٌ في موضعه من التبويب، فإعادتُه في كلِّ عنوانٍ
 * حشوٌ يزاحم الاسم في زرٍّ ضيّق.
 */
export function shortStandardTitle(title: string): string {
  return title.replace(/^\s*(أولا|أولاً|ثانيا|ثانياً|ثالثا|ثالثاً|رابعا|رابعاً|خامسا|خامساً)\s*:\s*/, "").trim();
}

/**
 * عنوانُ المؤشّر بلا صدره: «1. مؤشر اللائحة» و«المؤشر الأول: اللائحة» كلاهما
 * يُختصر إلى ما بعد الفاصل — وفهرسُ الصفحة عمودٌ ضيّقٌ لا يحتمل صدراً مكرّراً.
 */
export function shortIndicatorTitle(title: string): string {
  return title
    .replace(/^\s*\d+\s*[.\-)]\s*/, "")
    .replace(
      /^\s*المؤشر\s+(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي عشر|الثاني عشر)\s*:\s*/,
      ""
    )
    .trim();
}

export type GuideTotals = { standards: number; indicators: number; questions: number; proofs: number };

/** أعدادُ الدليل: معاييرُه ومؤشّراتُه وأسئلتُه وشواهدُه التفصيلية. */
export function guideTotals(standards: readonly GuideStandard[]): GuideTotals {
  let indicators = 0;
  let questions = 0;
  let proofs = 0;
  for (const standard of standards) {
    indicators += standard.practices.length;
    for (const practice of standard.practices) questions += practice.questions.length;
    proofs += standard.detailedProofs?.length ?? 0;
  }
  return { standards: standards.length, indicators, questions, proofs };
}

/** مؤشّراتٌ يُطابق البحثُ عنوانَها أو وصفَها أو سؤالاً أو شاهداً فيها. */
export function filterPractices(
  practices: readonly GuidePractice[],
  query: string
): GuidePractice[] {
  if (!normalizeArabic(query)) return [...practices];
  return practices.filter(
    (p) =>
      matchesQuery(p.title, query) ||
      (p.description ? matchesQuery(p.description, query) : false) ||
      p.questions.some((q) => matchesQuery(q.question, query) || matchesQuery(q.proof, query))
  );
}

/** شواهدُ تفصيليّةٌ يُطابق البحثُ عنوانَها أو أحدَ متطلّباتها. */
export function filterProofs(proofs: readonly GuideProof[], query: string): GuideProof[] {
  if (!normalizeArabic(query)) return [...proofs];
  return proofs.filter(
    (p) => matchesQuery(p.title, query) || p.requirements.some((r) => matchesQuery(r, query))
  );
}
