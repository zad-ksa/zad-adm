/**
 * الجهاتُ المانحة: أنواعُها وحالةُ الرفع فيها وتسويةُ أسمائها.
 *
 * وحدةٌ خالصةٌ بلا استيراد — يقرؤها الموقعُ وسكربتُ الهجرة
 * (`scripts/seed-donor-orgs.mjs`) كليهما، فلا تُكتب تسويةُ الاسم مرّتين
 * فتختلفا.
 */

export type DonorKind = "FOUNDATION" | "EHSAN" | "CHARITY_FUND";

/** تبويبٌ لكل نوع تحت «تنمية الموارد المالية». */
export const DONOR_KINDS = [
  { value: "FOUNDATION", label: "الجهات المانحة", href: "/main/donors" },
  { value: "EHSAN", label: "منصة إحسان", href: "/main/ehsan" },
  { value: "CHARITY_FUND", label: "صندوق دعم الجمعيات", href: "/main/charity-fund" },
] as const satisfies readonly { value: DonorKind; label: string; href: string }[];

/**
 * مسارُ جدول المنح الجامع — تبويبٌ رابعٌ تحت «تنمية الموارد المالية».
 *
 * وهو ثابتٌ هنا مع `DONOR_KINDS` لا نصٌّ في الشريط: الشريطُ يبني الرابطَ،
 * وأفعالُ المنح تُنعش هذا المسارَ بعد كل كتابة، والشريطُ يَعرف منه أيَّ خدمةٍ
 * يفتح. فمسارٌ مكتوبٌ في ثلاثة مواضعَ يختلف عند أوّل نقلٍ له، فيبقى تبويبٌ
 * يُشير إلى صفحةٍ ليست هناك أو جدولٌ لا يُنعَش.
 */
export const GRANTS_HREF = "/main/grants";

export function donorKindOf(value: string): DonorKind {
  return DONOR_KINDS.some((k) => k.value === value) ? (value as DonorKind) : "FOUNDATION";
}

export type IntakeStatus = "OPEN" | "CLOSED";

export const INTAKE_STATUSES = [
  { value: "OPEN", label: "مفتوح" },
  { value: "CLOSED", label: "مغلق" },
] as const satisfies readonly { value: IntakeStatus; label: string }[];

export function intakeStatusOf(value: string): IntakeStatus {
  return value === "OPEN" ? "OPEN" : "CLOSED";
}

export function intakeLabel(status: IntakeStatus): string {
  return status === "OPEN" ? "مفتوح" : "مغلق";
}

/**
 * تسويةُ اسم الجهة للمطابقة — لا للعرض.
 *
 * فالاسمُ في الملفات والقاعدة يُكتب بمسافةٍ زائدةٍ في طرفه، وبألفٍ بهمزةٍ وبلا
 * همزة، وبتاءٍ مربوطةٍ وهاء. وفي قاعدتك اليوم: «بنك الجزيرة» و«بنك الجزيرة␣»
 * بُعدان برمزين، و«منصة إحسان» و«منصة احسان» جهتان في الجدول وواحدةٌ في الواقع.
 *
 * والمخرَجُ مفتاحُ مقارنةٍ لا اسمٌ يُعرض: «مؤسسه» ليست هجاءً صحيحاً، وإنما
 * صورةٌ تتساوى فيها الهجاءات.
 */
export function normalizeDonorName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[أإآٱ]/g, "ا") // أ إ آ ٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/[ً-ْٰـ]/g, ""); // التشكيل والتطويل
}

/** الاسمُ كما يُخزَّن: مسافاتٌ مسوّاةٌ بلا تغيير هجاء. */
export function cleanDonorName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

/**
 * تنظيفُ اسم مستخدمٍ أو كلمةِ مرورٍ منقولةٍ من جدول.
 *
 * تُحذف **كلُّ** المسافات وعلاماتُ التنصيص. وفي جداول الحسابات خلايا مكتوبةٌ
 * هكذا: `"info@atharq.org"` و`"@Athar5594"` — بعلامتيها في نصّ الخليّة لا في
 * عرضها. ومسافةٌ في آخر اسم المستخدم تمنع الدخول ولا تُرى، وكلمةُ مرورٍ لا
 * تحتمل مسافةً وسطها أصلاً.
 */
export function cleanCredential(raw: string): string {
  return raw.replace(/[\s ‏‎]/g, "").replace(/["'“”«»‘’]/g, "");
}

/**
 * هل الخليّةُ ملاحظةٌ لا بيانَ دخول؟
 *
 * فخانةُ اسم المستخدم تحمل أحياناً حالَ الطلب («جاري الارسال») بدل اسمٍ —
 * وتسجيلُها حساباً يَعِدُ بدخولٍ لا يفتح. والفاصلُ حرفٌ عربي: أسماءُ الدخول
 * وكلماتُ المرور لاتينيةٌ وأرقامٌ ورموز.
 */
export function looksLikeNote(value: string): boolean {
  return /[؀-ۿ]/.test(value);
}

/** مصدرُ الحالة: محسوبةٌ من التاريخين، أو مضبوطةٌ بيد الموظف. */
export type IntakeMode = "AUTO" | "MANUAL";

export type Intake = {
  status: IntakeStatus;
  mode: IntakeMode;
  /** سطرٌ يقول كيف عُرفت الحالة — فشارةٌ بلا سببٍ تُسأل عنها. */
  reason: string;
};

/**
 * يومُ تاريخٍ بلا ساعة: `2026-12-15`.
 *
 * والتواريخُ المخزَّنة تواريخُ يومٍ محفوظةٌ عند منتصف ليل UTC، فيومُها يُقرأ
 * بـUTC كما كُتب.
 */
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/**
 * «اليوم» بتوقيت الرياض لا بـUTC.
 *
 * فالفارقُ ثلاثُ ساعات: جهةٌ تُغلق في ١٢ نوفمبر تبقى — بحساب UTC — مفتوحةً
 * إلى الثالثة فجراً من ١٣ بتوقيت المستعمل. واليومُ يُقلب عند منتصف ليله هو،
 * لا عند منتصف ليلٍ في غرينتش.
 */
const RIYADH = "Asia/Riyadh";
const todayIn = (now: Date, zone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

/**
 * حالةُ الرفع الفعلية — **تُحسب من التاريخين إن وُجدا**.
 *
 * كانت الحالةُ صريحةً يضبطها الموظف والتاريخان بياناً معلناً، فصار على من
 * يعلم أن يقلب المفتاح في موعده. وجهةٌ تُغلق في يومٍ معلومٍ لا تحتاج من يُغلقها
 * يدوياً: التاريخُ يقولها.
 *
 * **ولا تُخزَّن المحسوبةُ ولا تحتاج مهمةً دورية**: الصفحةُ تُبنى عند كل طلب،
 * فالحسابُ يقع لحظةَ القراءة ويكون صحيحاً دائماً. ومهمّةٌ دوريةٌ تكتب الحالةَ
 * في الصفّ تجعلها صحيحةً وقت التشغيل وخاطئةً بين تشغيلين.
 *
 * والتاريخُ **شاملٌ لطرفيه**: جهةٌ تُغلق في ١٥ ديسمبر مفتوحةٌ ذلك اليومَ كلَّه،
 * فالمقارنةُ بالأيام لا بالساعات — وإلا أُغلقت في منتصف ليلته.
 *
 * وبلا تاريخين تبقى الحالةُ يدويّةً كما كانت: ليس لكل جهةٍ موعدٌ معلن.
 */
export function effectiveIntake(
  stored: string,
  opensAt: Date | null,
  closesAt: Date | null,
  now: Date,
  zone: string = RIYADH
): Intake {
  if (!opensAt && !closesAt) {
    const status = intakeStatusOf(stored);
    return { status, mode: "MANUAL", reason: status === "OPEN" ? "مفتوحٌ بضبطٍ يدوي" : "مغلقٌ بضبطٍ يدوي" };
  }

  const today = todayIn(now, zone);
  const from = opensAt ? dayOf(opensAt) : null;
  const to = closesAt ? dayOf(closesAt) : null;

  if (from && today < from) return { status: "CLOSED", mode: "AUTO", reason: `يُفتح في ${from}` };
  if (to && today > to) return { status: "CLOSED", mode: "AUTO", reason: `أُغلق في ${to}` };
  return {
    status: "OPEN",
    mode: "AUTO",
    reason: to ? `مفتوحٌ حتى ${to}` : `مفتوحٌ من ${from}`,
  };
}

/**
 * الحالةُ الفعلية من حقلَي تاريخٍ نصّيين (`yyyy-mm-dd`).
 *
 * تُنادى في المتصفّح وهو يكتب: لوحةُ التعديل تعرض «مفتوح» لحظةَ اختيار التاريخ
 * لا بعد الحفظ وإعادة القراءة — فمن اختار تاريخاً ورأى الحالةَ لم تتغيّر حسب
 * أن شيئاً لم يعمل، وهو إنما كان ينظر إلى حقلٍ يعرض المخزَّن.
 */
export function intakeFromInputs(
  stored: string,
  opensAtInput: string,
  closesAtInput: string,
  now: Date,
  zone?: string
): Intake {
  const parse = (v: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    const d = new Date(`${v}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  return effectiveIntake(stored, parse(opensAtInput), parse(closesAtInput), now, zone);
}

/** حالاتُ المنحة كما خُزّنت نصّاً في `GrantApplication.status`. */
export const GRANT_STATUSES = [
  { value: "PENDING", label: "قيد الدراسة" },
  { value: "APPROVED", label: "مقبولة" },
  { value: "REJECTED", label: "مرفوضة" },
  { value: "CLOSED", label: "مغلقة" },
] as const;

export function grantStatusLabel(value: string): string {
  return GRANT_STATUSES.find((s) => s.value === value)?.label ?? value;
}
