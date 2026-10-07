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
  { token: "{{programName}}", hint: "اسم المبادرة الذي يكتبه الموظف" },
  { token: "{{programIdea}}", hint: "فكرة المبادرة التي يكتبها الموظف" },
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

  const tokens: Record<string, string> = {
    assocName: charity.charityName || "—",
    vision: charity.vision || "—",
    mission: charity.mission || "—",
    strategicGoals: charity.strategicGoals || "—",
    field: charity.field || "—",
    city: charity.city || "—",
    programName: values.programName,
    programIdea: values.programIdea,
    preferences,
    budgetInstructions,
    directives: directivesBlock,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => tokens[key] ?? "");
}
