// أنواع أداة "منشئ وثائق المبادرات" — مشترك بين العميل والخادم، فلا يستورد
// هذا الملف أي شيء خادمي (prisma وغيره).
//
// لا بيانات هنا: لا برومبت افتراضي، ولا قائمة قيود محتوى، ولا قائمة محاور
// معيارية. كل ذلك يُقرأ من قاعدة البيانات وحدها (GlobalSetting للقيود
// والمحاور، وProjectBuilderPromptVersion للبرومبت بتاريخه الكامل) — فتعديله
// لا يحتاج نشر كودٍ جديد، ولا يبقى في الكود نصّ لا يراه حامل صلاحية التحكم
// الذي يُفترض أن يملك التحكم الوحيد فيه.

export type ProjectBuilderExclusion = { key: string; label: string; promptText: string };

/** قائمة القيود ومحاور الوثيقة المعيارية — محفوظتان معاً في GlobalSetting. */
export type ProjectBuilderOptions = {
  exclusions: ProjectBuilderExclusion[];
  /** محاور الوثيقة المعيارية — تُستعمل في مقارنة النصّ الملصوق عند التحليل. */
  sections: string[];
};

export function normalizeProjectBuilderOptions(raw: unknown): ProjectBuilderOptions {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ProjectBuilderOptions>;
  const exclusions = Array.isArray(r.exclusions)
    ? r.exclusions.filter(
        (e): e is ProjectBuilderExclusion =>
          !!e && typeof e.key === "string" && typeof e.label === "string" && typeof e.promptText === "string"
      )
    : [];
  const sections = Array.isArray(r.sections) ? r.sections.filter((s): s is string => typeof s === "string" && !!s.trim()) : [];
  return { exclusions, sections };
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
  { token: "{{exclusions}}", hint: "قيود المحتوى التي فعّلها الموظف، مُجمَّعة" },
  { token: "{{budgetInstructions}}", hint: "تعليمات مبلغ الميزانية والاحتياطي، أو أمر حذف بند الميزانية" },
  { token: "{{directives}}", hint: "التوجيهات الخاصة التي أضافها الموظف، مُرقّمة" },
];

/** يبني البرومبت النهائي من القالب المحفوظ (أحدث إصدار) وبيانات طلب واحد. */
export function buildProjectPrompt(
  template: string,
  charity: ProjectBuilderCharityInfo,
  values: ProjectBuilderValues,
  activeExclusions: ProjectBuilderExclusion[],
  budget: ProjectBuilderBudget,
  directives: string[]
): string {
  const exclusions = activeExclusions.length
    ? "قيود المحتوى (التزم بها بدقة):\n" + activeExclusions.map((e) => "• " + e.promptText).join("\n")
    : "لا قيود إضافية على المحتوى.";

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
    exclusions,
    budgetInstructions,
    directives: directivesBlock,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => tokens[key] ?? "");
}
