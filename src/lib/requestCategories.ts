/**
 * أقسامُ الطلبات، ومنها يُعرف مسارُ الطلب.
 *
 * **ولمَ قائمةٌ واحدةٌ في العدّة**: كانت منسوخةً حرفاً بحرفٍ في نموذج الرفع
 * وفي صفحة الاعتمادات، ثم صارت تُقرأ في إعدادات السلاسل أيضاً — وقسمٌ يُضاف
 * في نسخةٍ ولا يُضاف في أختها يُرفع به طلبٌ لا تعرفه الصفحةُ التي تعرضه، أو
 * يُسند إلى سلسلةٍ لا يراه نموذجُها. فالمفتاحُ هو ما يُحفظ في `Request.category`،
 * والاسمُ هو ما يُقرأ، والألوانُ تَبِعتِ القائمةَ لأنّ الشارةَ تُرسم في
 * الموضعين من نفس الصفّ.
 *
 * **والمفتاحُ عربيٌّ لا رمزٌ لاتينيّ**: هكذا كُتبت الصفوفُ الحيّةُ من أول يوم،
 * وتحويلُها إلى رموزٍ هجرةُ بياناتٍ لا مكسبَ لها.
 */
export type RequestCategory = {
  /** ما يُحفظ في الصفّ. */
  key: string;
  label: string;
  color: string;
  bg: string;
  border: string;
};

export const REQUEST_CATEGORIES: readonly RequestCategory[] = [
  { key: "زاد",                   label: "إدارة زاد",               color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-900/20",       border: "border-blue-400" },
  { key: "التخطيط الاستراتيجي",   label: "التخطيط الاستراتيجي",    color: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-50 dark:bg-indigo-900/20",   border: "border-indigo-400" },
  { key: "الحوكمة",               label: "الحوكمة",                 color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-900/20",   border: "border-violet-400" },
  { key: "تنمية الموارد المالية", label: "تنمية الموارد المالية",   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-400" },
  { key: "المالية",               label: "المالية",                 color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-900/20",     border: "border-amber-400" },
  { key: "الإعلامية",             label: "الإعلامية",               color: "text-pink-600 dark:text-pink-400",       bg: "bg-pink-50 dark:bg-pink-900/20",       border: "border-pink-400" },
  { key: "التقنية",               label: "التقنية",                 color: "text-cyan-600 dark:text-cyan-400",       bg: "bg-cyan-50 dark:bg-cyan-900/20",       border: "border-cyan-400" },
  { key: "التسويق",               label: "التسويق",                 color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-900/20",   border: "border-orange-400" },
  { key: "خدمات المشاريع",        label: "خدمات المشاريع",          color: "text-teal-600 dark:text-teal-400",       bg: "bg-teal-50 dark:bg-teal-900/20",       border: "border-teal-400" },
  { key: "الإدارية",              label: "الإدارية",                color: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-900/20",       border: "border-rose-400" },
  { key: "الإسناد الحكومي",       label: "الإسناد الحكومي",         color: "text-sky-600 dark:text-sky-400",         bg: "bg-sky-50 dark:bg-sky-900/20",         border: "border-sky-400" },
];

/** هل هذا المفتاحُ قسمٌ معروف؟ */
export function isRequestCategory(value: string): boolean {
  return REQUEST_CATEGORIES.some((c) => c.key === value);
}

/** صفُّ القسم إن كان معروفاً — تُرسم منه الشارة. */
export function requestCategory(value: string | null | undefined): RequestCategory | null {
  if (!value) return null;
  return REQUEST_CATEGORIES.find((c) => c.key === value) ?? null;
}

/**
 * تنقيةُ ما يُسند إلى سلسلة: المعروفُ وحدَه، بلا تكرار، وعلى ترتيب القائمة.
 *
 * فالترتيبُ الثابتُ يجعل الشاراتَ تُقرأ في كلِّ سلسلةٍ بنفس النظم، ومفتاحٌ
 * غريبٌ يُسقط — إذ لا نموذجَ يرفع به طلباً، فإسنادُه يحجز قسماً لا وجودَ له.
 */
export function cleanRequestCategories(values: readonly string[]): string[] {
  const wanted = new Set(values.map((v) => v.trim()));
  return REQUEST_CATEGORIES.filter((c) => wanted.has(c.key)).map((c) => c.key);
}

/** ما بقي من أقسامِ سلسلةٍ بعد نزع ما أُسند إلى غيرها. */
export function withoutCategories(current: readonly string[], taken: readonly string[]): string[] {
  return current.filter((c) => !taken.includes(c));
}

/** أدنى ما يُعرف من السلسلة ليُختار المسار. */
export type RoutableChain = {
  categories: readonly string[];
  isActive: boolean;
  /** عددُ مستوياتها — وسلسلةٌ بلا مستوىً لا تُمرّر طلباً. */
  stepCount: number;
};

/**
 * السلسلةُ التي يسلكها طلبُ قسمٍ ما.
 *
 * **والقسمُ هو المسار**: فمَن أسند «الإعلامية» إلى سلسلةٍ و«المالية» إلى أخرى
 * استغنى عن تفعيلٍ وتعطيلٍ في كلِّ مرة — وهو ما كان يُفعل قبل هذا: تُفعَّل
 * سلسلةٌ لطلبٍ ثم تُعطَّل لطلبٍ بعده، فيُرفع طلبٌ في غفلةٍ فيسلك مسارَ غيره.
 *
 * **والسلسلةُ المفعَّلةُ لم تُلغَ، بل صارت الافتراضيّة**: ما لم يُسند قسمُه إلى
 * سلسلةٍ يسلكها — فأقسامٌ لم يُقسَم لها مسارٌ بعدُ تبقى عاملةً كما كانت، ولا
 * تحتاج هذه الميزةُ إلى إسناد الأقسام كلِّها قبل أن يُرفع أوّلُ طلب.
 *
 * **وسلسلةٌ بلا مستوياتٍ لا تُقبل مساراً**: الخادمُ يرفض الرفعَ إليها، فلو
 * قُبِلت هنا لصار القسمُ مسدوداً وله مسارٌ افتراضيٌّ صالح.
 */
export function chainForCategory<T extends RoutableChain>(
  category: string | null | undefined,
  chains: readonly T[]
): T | null {
  const usable = chains.filter((c) => c.stepCount > 0);
  if (category) {
    const owned = usable.find((c) => c.categories.includes(category));
    if (owned) return owned;
  }
  return usable.find((c) => c.isActive) ?? null;
}

/** أقسامٌ لم تُسند إلى سلسلةٍ صالحة — تسلك المسارَ الافتراضيَّ إن وُجد. */
export function unroutedCategories(chains: readonly RoutableChain[]): string[] {
  const owned = new Set(chains.filter((c) => c.stepCount > 0).flatMap((c) => [...c.categories]));
  return REQUEST_CATEGORIES.filter((c) => !owned.has(c.key)).map((c) => c.key);
}

/**
 * مسارُ كلِّ قسم: اسمُ السلسلة التي يسلكها.
 *
 * وهنا لا في `workflowRouting`: تقرؤه الواجهةُ لتُسمّي المسارَ تحت القسم
 * المختار قبل الإرسال، وذاك ملفٌّ يفتح قاعدةَ البيانات فلا يُستورد منه نوعٌ
 * إلى مكوّنٍ عميل.
 */
export type CategoryRoutes = Record<string, { chainName: string }>;
