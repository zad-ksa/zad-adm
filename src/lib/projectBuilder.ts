// أنواع أداة "منشئ وثائق المبادرات" — مشترك بين العميل والخادم، فلا يستورد
// هذا الملف أي شيء خادمي (prisma وغيره).
//
// لا بيانات هنا: لا برومبت افتراضي، ولا قائمة تفضيلات محتوى. كل ذلك يُقرأ من
// قاعدة البيانات وحدها (GlobalSetting لتفضيلات المحتوى، وProjectBuilderPromptVersion
// للبرومبت بتاريخه الكامل) — فتعديله لا يحتاج نشر كودٍ جديد، ولا يبقى في
// الكود نصّ لا يراه حامل صلاحية التحكم الذي يُفترض أن يملك التحكم الوحيد فيه.
//
// لا قائمة محاور معيارية منفصلة أيضاً: الهيكل المعياري (العناصر المرقّمة)
// موجودٌ أصلاً داخل البرومبت العام نفسه، فميزة التحليل تقرأ البرومبت الحالي
// مباشرةً كمرجع بدل الاحتفاظ بنسخة ثانية منه قد تختلف عنه.

/** تفضيل محتوى — يمكن أن يكون قيداً ("لا تذكر...") أو إضافة ("أضف..."). */
export type ProjectBuilderPreference = { key: string; label: string; promptText: string };

export type ProjectBuilderOptions = {
  preferences: ProjectBuilderPreference[];
};

export function normalizeProjectBuilderOptions(raw: unknown): ProjectBuilderOptions {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ProjectBuilderOptions>;
  const preferences = Array.isArray(r.preferences)
    ? r.preferences.filter(
        (p): p is ProjectBuilderPreference =>
          !!p && typeof p.key === "string" && typeof p.label === "string" && typeof p.promptText === "string"
      )
    : [];
  return { preferences };
}

/** معلومات الجمعية الثابتة — تُعبّأ من ProjectBuilderCharityProfile في القاعدة. */
export type ProjectBuilderCharityInfo = {
  charityName: string;
  vision: string;
  mission: string;
  strategicGoals: string;
  field: string;
  city: string;
};

/** ما يُدخله الموظف لكل وثيقة على حدة. */
export type ProjectBuilderValues = {
  programName: string;
  programIdea: string;
  /** اختياري: عدد المستفيدين المستهدف. */
  beneficiariesCount?: string;
  /** اختياري: مدة البرنامج. */
  programDuration?: string;
  /** اختياري: الفئة المستهدفة. */
  targetCategory?: string;
};

export type ProjectBuilderBudget = { include: boolean; total: string; reserve: boolean };

/** رموز البرومبت وشرحها — تُعرض لصاحب صلاحية التحكم عند تعديل القالب. */
export const PROJECT_BUILDER_PROMPT_TOKENS: { token: string; hint: string }[] = [
  { token: "{{assocName}}", hint: "اسم الجمعية المختارة" },
  { token: "{{vision}}", hint: "رؤية الجمعية (من ملفّها الثابت)" },
  { token: "{{mission}}", hint: "رسالة الجمعية (من ملفّها الثابت)" },
  { token: "{{strategicGoals}}", hint: "أهدافها الاستراتيجية (من ملفّها الثابت)" },
  { token: "{{field}}", hint: "مجال عملها (من ملفّها الثابت)" },
  { token: "{{city}}", hint: "منطقتها أو مدينتها (من ملفّها الثابت)" },
  { token: "{{programName}}", hint: "اسم المبادرة — اختياري؛ إن تركه الموظف فارغاً يُستبدَل بتوجيه للذكاء الاصطناعي بابتكار اسم بنفسه" },
  { token: "{{programIdea}}", hint: "فكرة المبادرة التي يكتبها الموظف" },
  { token: "{{additionalInfo}}", hint: "عدد المستفيدين ومدة البرنامج والفئة المستهدفة — ما أدخله الموظف منها فقط، اختيارية" },
  { token: "{{preferences}}", hint: "تفضيلات المحتوى التي فعّلها الموظف، مُجمَّعة" },
  { token: "{{budgetInstructions}}", hint: "تعليمات مبلغ الميزانية والاحتياطي، أو أمر حذف بند الميزانية" },
  { token: "{{directives}}", hint: "التوجيهات الخاصة التي أضافها الموظف، مُرقّمة" },
];

/** يبني البرومبت النهائي من القالب المحفوظ (أحدث إصدار) وبيانات طلب واحد. */
export function buildProjectPrompt(
  template: string,
  charity: ProjectBuilderCharityInfo,
  values: ProjectBuilderValues,
  activePreferences: ProjectBuilderPreference[],
  budget: ProjectBuilderBudget,
  directives: string[]
): string {
  const preferences = activePreferences.length
    ? "تفضيلات المحتوى (التزم بها بدقة):\n" + activePreferences.map((p) => "• " + p.promptText).join("\n")
    : "لا تفضيلات إضافية للمحتوى.";

  const budgetParts: string[] = [];
  let budgetInstructions: string;
  if (!budget.include) {
    budgetInstructions = "تنبيه: احذف بند الميزانية التقديرية بالكامل من الوثيقة ولا تُدرجه.";
  } else {
    if (budget.total) budgetParts.push(`اجعل إجمالي الميزانية يساوي بالضبط ${budget.total} ريال سعودي.`);
    if (budget.reserve) budgetParts.push("أضف ضمن بنود الميزانية بنداً مستقلاً باسم «مبلغ احتياطي».");
    budgetInstructions = budgetParts.join(" ");
  }

  const directivesBlock = directives.length
    ? "توجيهات خاصة (لها الأولوية القصوى — طبّقها حتى لو تعارضت مع أي تعليمات أخرى أعلاه):\n" +
      directives.map((d, i) => `${i + 1}. ${d}`).join("\n")
    : "لا توجد توجيهات خاصة.";

  const extras: string[] = [];
  if (values.beneficiariesCount?.trim()) extras.push(`عدد المستفيدين المستهدف: ${values.beneficiariesCount.trim()}`);
  if (values.programDuration?.trim()) extras.push(`مدة البرنامج: ${values.programDuration.trim()}`);
  if (values.targetCategory?.trim()) extras.push(`الفئة المستهدفة: ${values.targetCategory.trim()}`);
  const additionalInfo = extras.length
    ? "معلومات إضافية:\n" + extras.map((e) => "• " + e).join("\n")
    : "لا توجد معلومات إضافية — استنتج ما يلزم من فكرة المبادرة.";

  const tokens: Record<string, string> = {
    assocName: charity.charityName || "—",
    vision: charity.vision || "—",
    mission: charity.mission || "—",
    strategicGoals: charity.strategicGoals || "—",
    field: charity.field || "—",
    city: charity.city || "—",
    // اختياري: إن حدَّده الموظف يُعتمَد حرفياً ويطغى على ما قد يقترحه البرومبت؛
    // وإن تركه فارغاً فهذا التوجيه الصريح هو ما يحلّ محلّه، فيبتكر الذكاء
    // الاصطناعي اسماً بنفسه كما يصف العنصر الأول من البرومبت أصلاً.
    programName: values.programName.trim() || "(غير محدَّد — اقترح اسماً إبداعياً مناسباً للمبادرة بنفسك)",
    programIdea: values.programIdea,
    additionalInfo,
    preferences,
    budgetInstructions,
    directives: directivesBlock,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => tokens[key] ?? "");
}
