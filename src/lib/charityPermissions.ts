/**
 * طبقةُ صلاحيات جهة الجمعيات (حسابات `CHARITY_USER`) — مقابلُ
 * `lib/permissions.ts` في جهة زاد.
 *
 * وقاعدتان تحكمان الطبقةَ كلَّها:
 *
 * **١ — كلُّ مُدخَلٍ يُقرأ من صفِّ العضويّة `CharityUserCharity`، لا من الحساب.**
 * فمن هو حسابُ الجمعية في جمعيةٍ متطوّعٌ في أخرى، وكلُّ جمعيةٍ تقرّر لنفسها.
 * والمسمّياتُ (مدير تنفيذي، متطوّع…) وسومٌ بلا سلطة، ولا شيءَ هنا يقرؤها.
 *
 * **٢ — لا شيءَ يُنال بالصفة، بل بالصلاحيّة.**
 * وكان ثَمّ علَمُ «مدير جمعية» يتجاوز كلَّ فحصٍ فيرى صاحبُه كلَّ شيء. فأُلغي:
 * الرؤيةُ والفعلُ كلُّها صلاحيّاتٌ تُمنح بأسمائها. ويبقى العلَمُ في القاعدة
 * (`isAdmin`) علامةً على شيءٍ واحد: **حسابُ الجمعية الرسميُّ** الذي تُنشئه زادٌ
 * عند التعاقد. وهو وحدَه:
 *   - يحمل كلَّ الصلاحيات **محسوبةً لا مخزَّنة** — فما يُزاد منها يدخل عنده بلا
 *     تحرير؛
 *   - ويمنح الصلاحياتَ والخدماتَ لبقيّة الحسابات.
 *
 * **وموضعُ توسيع الصفة واحد**: `effectiveCharityPermissions`. فمن بعدها لا
 * يسأل أحدٌ «هل هو الحسابُ الرسميّ؟»، بل يسأل المصفوفةَ الفعليّة وحدَها
 * (`hasCharityPermission`). وهذا ما كان مكسوراً: الصفةُ تُفحص في موضعين،
 * فتُنسى في أحدهما — ومديرُ جمعيةٍ تقبله الصفحةُ ولا يراه شريطُه.
 *
 * **والصلاحيّةُ تتبع خدمةً من خدمات زاد**: تُعرض تحتها في مُنتقي الصلاحيات، ولا
 * تعمل إلا والخدمةُ مفوَّضةٌ للعضو (`CharityMemberService`). فجمعيةٌ لا تشملها
 * خدمةٌ لا صلاحيّاتَ لها منها، وعضوٌ لم يُفوَّض بها لا يعمل فيها.
 */

// نسبيٌّ لا بـ`@/`: هذا الملفُّ خالصٌ ويُختبر بـ`node --test`، وNode لا يعرف
// اختصاراتَ المسارات. وTurbopack يقبل النسبيَّ، وقد أثبته بناءٌ كامل.
import { CHARITY_ATTENDANCE_ENABLED } from "./featureFlags.ts";

/**
 * أسماءُ الخدمات كما في صفوف `Service` — والمصدرُ `SECTION_SERVICES` في
 * `lib/charityServices.ts`، ولا يُستورد هنا لأنّه يمسّ القاعدة وهذا الملفُّ
 * خالصٌ يُختبر بـ`node`. و`charityServicesHavePermissions` في الاختبار تحرس
 * التوافقَ.
 */
const SERVICE = {
  MEDIA: "الإعلامية",
  GOVERNANCE: "الحوكمة",
  FUNDRAISING: "التسويق وتنمية الموارد المالية",
} as const;

export type CharityPermissionDef = {
  id: string;
  label: string;
  /** خدمةُ زادٍ التي تتبعها — وبغيرها صلاحيّةٌ إداريّةٌ لا تتعلّق بخدمة. */
  service?: string;
  /** سطرٌ يُعرض تحت الوسم في المُنتقي حيث يلزم البيان. */
  hint?: string;
};

export type CharityPermissionGroup = { title: string; permissions: CharityPermissionDef[] };

/**
 * صلاحيّاتُ الخدمات — تُعرض تحت خدمتها، وتُمنح واحدةً واحدة.
 *
 * وبقيّةُ الخدمات التسع لا صلاحيّاتَ لها بعد: صفحاتُها عند زادٍ ولم تُفتح للجمعية
 * بعد. وحين تُفتح تُضاف هنا تحت خدمتها، فتظهر في المُنتقي بلا تعديلِ شاشة.
 */
const SERVICE_PERMISSIONS: CharityPermissionDef[] = [
  {
    id: "view_design_requests",
    label: "طلبات التصاميم — عرضٌ ورفع",
    service: SERVICE.MEDIA,
    hint: "يرى طلباتِ الجمعية ويرفع طلباً جديداً",
  },
  {
    id: "edit_media_plan",
    label: "تحرير الخطة الإعلامية واعتمادها",
    service: SERVICE.MEDIA,
    // والخطّةُ تُرى بلا صلاحيّة: تقويمُ جمعيتهم يطّلع عليه كلُّ عضو، وهذه
    // للاعتماد والتعديل وحدَهما.
    hint: "يعتمد منشوراتَ زادٍ أو يعدّلها. والاطّلاعُ على التقويم مفتوحٌ لكلِّ عضو",
  },
  {
    id: "view_governance",
    label: "الحوكمة",
    service: SERVICE.GOVERNANCE,
    hint: "يرى أدلّةَ الحوكمة ومعاييرَها",
  },
  {
    id: "view_fundraising",
    label: "تنمية الموارد المالية",
    service: SERVICE.FUNDRAISING,
    // وفيها حساباتُ الدخول عند الجهات المانحة — فلا تُفتح لكلِّ عضوٍ بلا منح،
    // كما تُفتح مكتبةُ النماذج والتقويم.
    hint: "يرى الجهات المانحة وحسابات الدخول عندها، ويقترح مشاريع ويتابع المنح",
  },
];

/** صلاحيّاتٌ إداريّةٌ لا تتبع خدمة. */
const MANAGE_PERMISSIONS: CharityPermissionDef[] = [
  {
    id: "view_doc_requests",
    label: "طلبات وثائق المشاريع — عرضٌ ورفع",
    // ولا تتبع خدمةً من التسع: الوثيقةُ تُطلب للمنح وللتخطيط وللعرض على
    // شريك، فربطُها بخدمةٍ واحدةٍ يحجبها عمّن يحتاجها لغيرها.
    hint: "يطلب من زادٍ إنشاء وثيقة مشروع، ويتابع طلباتها ويعتمد الوثيقة النهائية",
  },
  {
    id: "manage_charity_users",
    label: "إدارة حسابات موظفي الجمعية",
    hint: "يُضيف موظّفاً ويُعطّله. ومنحُ الصلاحيات والخدمات لحساب الجمعية وحدَه",
  },
  { id: "manage_charity_mail", label: "إعدادات البريد الداخلي" },
];

/**
 * صلاحيتا التحضير: مخفيّتان ما دام تحضير الجمعيات موقوفاً بعلَم
 * `CHARITY_ATTENDANCE_ENABLED`. ولم تُتقاعدا — القيمُ المخزّنة تبقى كما هي،
 * وتعودان إلى المُنتقي في اللحظة التي يُشغَّل فيها التحضير.
 */
const ATTENDANCE_PERMISSIONS: CharityPermissionDef[] = [
  { id: "manage_attendance", label: "إعداد مواقع العمل وأوقات الدوام" },
  { id: "view_attendance_reports", label: "عرض تقارير حضور جميع الموظفين" },
];

export const CHARITY_SERVICE_PERMISSIONS: CharityPermissionDef[] = SERVICE_PERMISSIONS;

/** كلُّ المعرّفات المعروفة ومنها المخفيّة اليوم — للتحقّق والوسم، لا للعرض. */
export const ALL_CHARITY_PERMISSIONS: CharityPermissionDef[] = [
  ...SERVICE_PERMISSIONS,
  ...MANAGE_PERMISSIONS,
  ...ATTENDANCE_PERMISSIONS,
];

export const ALL_CHARITY_PERMISSION_IDS: string[] = ALL_CHARITY_PERMISSIONS.map((p) => p.id);

/** ما يُعرض في المُنتقي ويجوز منحُه — والمخفيُّ بعلَمٍ ليس منه. */
export const GRANTABLE_CHARITY_PERMISSION_IDS: string[] = [
  ...SERVICE_PERMISSIONS,
  ...MANAGE_PERMISSIONS,
  ...(CHARITY_ATTENDANCE_ENABLED ? ATTENDANCE_PERMISSIONS : []),
].map((p) => p.id);

/** خدمةُ صلاحيّةٍ، أو لا شيءٍ إن كانت إداريّةً لا تتبع خدمة. */
export function serviceOfCharityPermission(id: string): string | null {
  return ALL_CHARITY_PERMISSIONS.find((p) => p.id === id)?.service ?? null;
}

/** الخدماتُ التي لها صلاحيّاتٌ اليومَ — بترتيب ورودها. */
export function charityServicesWithPermissions(): string[] {
  return [...new Set(SERVICE_PERMISSIONS.map((p) => p.service!).filter(Boolean))];
}

/** صلاحيّاتُ خدمةٍ بعينها. */
export function charityPermissionsOfService(service: string): CharityPermissionDef[] {
  return SERVICE_PERMISSIONS.filter((p) => p.service === service);
}

/**
 * مُنتقي الصلاحيات لعضوٍ في جمعيةٍ تشملها هذه الخدمات: مجموعةٌ لكلِّ خدمةٍ لها
 * صلاحيّات، ثمّ مجموعةُ الإدارة.
 *
 * فالمُنتقي يُبنى من خدمات الجمعية لا من كتالوجٍ ثابت: جمعيةٌ لا تشملها خدمةُ
 * الحوكمة لا تُعرض فيها صلاحيّةُ الحوكمة — وكان يُعرض كلُّ شيءٍ لكلِّ جمعيةٍ
 * فيُمنح ما لا يعمل.
 */
export function charityPermissionGroups(charityServices: string[] | null | undefined): CharityPermissionGroup[] {
  const offered = new Set(charityServices ?? []);
  const groups: CharityPermissionGroup[] = [];

  for (const service of charityServicesWithPermissions()) {
    if (!offered.has(service)) continue;
    groups.push({ title: service, permissions: charityPermissionsOfService(service) });
  }

  const manage = [...MANAGE_PERMISSIONS, ...(CHARITY_ATTENDANCE_ENABLED ? ATTENDANCE_PERMISSIONS : [])];
  if (manage.length > 0) groups.push({ title: "صلاحيات الإدارة", permissions: manage });

  return groups;
}

/**
 * معرّفاتٌ كانت ولم تبقَ.
 *
 * وهي قائمةٌ في مصفوفاتٍ محفوظةٍ على عضويّاتٍ حيّة، فلا بدّ من حكمٍ حين يُحفظ
 * الصفُّ من جديد. وردُّها «صلاحيةٌ مجهولة» كان أوّلَ الجواب وكان خطأً: يجعل كلَّ
 * عضوٍ قائمٍ غيرَ قابلٍ للحفظ لحظةَ تقاعُدِ صلاحيّة — تفتح المحرِّرَ ولا تغيّر
 * شيئاً فيُقال لك إنّ البيانَ الذي سُلِّمتَه غيرُ صالح.
 *
 * فالمتقاعدُ **يُسقَط صامتاً**، والمجهولُ حقّاً يُردّ. والفرقُ معتبَر: أحدُهما
 * تاريخُنا، والآخرُ عميلٌ يُرسل ما لم يُعرَّف أصلاً.
 */
export const RETIRED_CHARITY_PERMISSION_IDS: string[] = [
  // دُمجت في `view_design_requests`.
  "create_design_requests",
  // لم تحرس شيئاً: قسمُ الموارد البشريّة مفتوحٌ لكلِّ عضوٍ نشط.
  "view_hr",
  // تبويبُ «الخدمات» صار مشتقّاً: يُعرض لمن له صلاحيّةٌ في خدمةٍ ما، ويسرد
  // خدماتِه وحدَها (`visibleCharityServices`). فلا صلاحيّةَ باسمه تُمنح.
  "view_services",
  // الخطّةُ الإعلاميّةُ تُرى بلا صلاحيّة، والتحريرُ `edit_media_plan`.
  "view_media_plan",
];

/** يُسقط المتقاعدَ ويُوحِّد المكرَّر. ولا يحكم على الباقي. */
export function sanitizeCharityPermissions(ids: string[] | null | undefined): string[] {
  return [...new Set(ids || [])].filter((id) => !RETIRED_CHARITY_PERMISSION_IDS.includes(id));
}

export function charityPermissionLabel(id: string): string {
  return ALL_CHARITY_PERMISSIONS.find((p) => p.id === id)?.label ?? id;
}

/**
 * الصلاحيّاتُ **الفعليّة** لعضو جمعية — وهي الجوابُ الوحيدُ عن «ما يستطيع؟».
 *
 * وثلاثُ قواعدَ فيها:
 *   ١ **حسابُ الجمعية الرسميُّ يحمل كلَّ شيء**، محسوباً لا مخزَّناً. فما يُزاد
 *     من صلاحيّاتٍ يدخل عنده بلا تحريرٍ ولا هجرةِ بيان.
 *   ٢ **وصلاحيّةُ خدمةٍ لا تعمل إلا والخدمةُ مفوَّضةٌ** للعضو: مُنحت ثمّ رُفعت
 *     الخدمةُ عنه، فهي خاملةٌ حتى تُعاد — ولا تُحذف من صفِّه، فإعادةُ الخدمة
 *     تُعيدها كما كانت.
 *   ٣ **والإداريّةُ تمرّ كما هي**: لا تتعلّق بخدمة.
 */
export function effectiveCharityPermissions(
  permissions: string[] | null | undefined,
  delegatedServices: string[] | null | undefined,
  isOfficialAccount: boolean | null | undefined
): string[] {
  if (isOfficialAccount === true) return [...ALL_CHARITY_PERMISSION_IDS];

  const delegated = new Set(delegatedServices ?? []);
  return sanitizeCharityPermissions(permissions).filter((id) => {
    const service = serviceOfCharityPermission(id);
    if (!service) return true;
    return delegated.has(service);
  });
}

/**
 * هل يملك هذه الصلاحيّة؟
 *
 * و**المصفوفةُ الفعليّةُ وحدَها** هي المقياس: لا علَمَ يُفحص هنا ولا صفةَ
 * تُستثنى. فمن لا يرى التبويبَ لا يفعل فعلَه، والعكس.
 */
export function hasCharityPermission(
  effective: string[] | null | undefined,
  required: string
): boolean {
  return (effective || []).includes(required);
}

/**
 * ما يجوز لهذا الفاعل أن يمنحه.
 *
 * **والمنحُ لحساب الجمعية الرسميِّ وحدَه.** وكانت القاعدةُ «تمنح ما تملك»، فمن
 * يحمل «إدارة حسابات موظفي الجمعية» يمنحها لغيره فيتوالد المانحون، وسحبُها من
 * واحدٍ لا يكفي. فصار المنحُ من بابٍ واحدٍ يُسأل عنه.
 */
export function grantableCharityPermissions(actorIsOfficialAccount: boolean | null | undefined): string[] {
  return actorIsOfficialAccount === true ? [...GRANTABLE_CHARITY_PERMISSION_IDS] : [];
}

/**
 * خدماتُ الجمعية التي تُعرض لهذا العضو في تبويب «الخدمات» — مراحلُها وخططُها.
 *
 * والقاعدةُ: خدمةٌ له فيها صلاحيّةٌ **واحدةٌ** على الأقلّ تُعرض بتمامها. فمن
 * فُوِّض بالإعلاميّة وله فيها طلباتُ التصاميم وحدَها يرى مراحلَ الإعلاميّة
 * كاملةً — لا يفرّق عدَدُ صلاحيّاته في الخدمة.
 *
 * وحسابُ الجمعية يرى خدماتِها كلَّها. وكان التبويبُ يُفتح بتفويض أيِّ خدمةٍ ثمّ
 * يعرض الخدماتِ التسعَ جميعاً بلا ترشيح.
 */
export function visibleCharityServices(params: {
  isOfficialAccount: boolean | null | undefined;
  /** الصلاحيّاتُ الفعليّة (مُخرَجُ `effectiveCharityPermissions`). */
  effective: string[] | null | undefined;
  /** خدماتُ الجمعية كما في صفوف `Service`. */
  charityServices: string[] | null | undefined;
}): string[] {
  const offered = params.charityServices ?? [];
  if (params.isOfficialAccount === true) return [...offered];

  const mine = new Set(
    (params.effective ?? []).map((id) => serviceOfCharityPermission(id)).filter((s): s is string => !!s)
  );
  return offered.filter((service) => mine.has(service));
}

/** هل يُعرض تبويبُ «الخدمات»؟ — بلا حاجةٍ إلى قراءة خدمات الجمعية. */
export function seesCharityServicesTab(
  isOfficialAccount: boolean | null | undefined,
  effective: string[] | null | undefined
): boolean {
  if (isOfficialAccount === true) return true;
  return (effective ?? []).some((id) => !!serviceOfCharityPermission(id));
}

/**
 * المسمّياتُ التي تُسنَد — وسومٌ بلا سلطة، لا يقرؤها شيءٌ في الشِّفرة.
 *
 * و«حساب الجمعية» ليس منها: هو الحسابُ الذي تُنشئه زادٌ للجمعية، وعلامتُه صفُّ
 * عضويّتِه لا مسمّاه. ويبقى وسمُه أدناه للحسابات التي أُنشئت قبل ذلك.
 */
export const CHARITY_USER_TITLES: { id: string; label: string }[] = [
  { id: "CHAIRMAN", label: "رئيس مجلس إدارة" },
  { id: "CEO", label: "مدير تنفيذي" },
  { id: "FULL_TIME", label: "موظف بدوام كامل" },
  { id: "PART_TIME", label: "موظف بدوام جزئي" },
  { id: "VOLUNTEER", label: "متطوع" },
];

/** وسمُ حساب الجمعية الرسميِّ — يُكتب مكان المسمّى، لا بجانبه. */
export const OFFICIAL_ACCOUNT_LABEL = "حساب الجمعية";

const LEGACY_TITLE_LABELS: Record<string, string> = {
  // كان «مدير النظام»، واسمُه الآن ما هو عليه حقّاً: حسابُ الجمعية الرسميُّ
  // الذي تُنشئه زادٌ عند التعاقد.
  SYSTEM_ADMIN: OFFICIAL_ACCOUNT_LABEL,
};

export function charityTitleLabel(title: string): string {
  return (
    CHARITY_USER_TITLES.find((t) => t.id === title)?.label ??
    LEGACY_TITLE_LABELS[title] ??
    title
  );
}

/**
 * ما يُكتب مسمّىً لعضوٍ في جمعية — وهو ما يُعرض في كلِّ شاشة.
 *
 * **وحسابُ الجمعية لا يُكتب له مسمّىً وظيفيّ**: هو ليس موظّفاً بدوامٍ كامل ولا
 * متطوّعاً، بل حسابُ الجمعية نفسِها الذي تُنشئه زاد. والمسمّى عمودٌ على الحساب
 * (`CharityUser.title`) قد يحمل قيمةً قديمةً كـ`FULL_TIME` من قبل أن يُعلَّم
 * رسميّاً، فالقراءةُ منه وحدَه تكتب تحت اسمه «موظف بدوام كامل» وهو حسابُ
 * الجمعية. فالعضويّةُ تتقدّم على العمود.
 */
export function charityMemberLabel(
  isOfficialAccount: boolean | null | undefined,
  title: string | null | undefined
): string {
  if (isOfficialAccount === true) return OFFICIAL_ACCOUNT_LABEL;
  return title ? charityTitleLabel(title) : "";
}
