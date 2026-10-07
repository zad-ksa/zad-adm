// أنواع وإعداد أداة "منشئ وثائق المبادرات" — مشترك بين العميل والخادم، فلا
// يستورد هذا الملف أي شيء خادمي (prisma وغيره).

/** محاور الوثيقة المعيارية الأربعة عشر — تُستعمل في مقارنة النصّ الملصوق عند التحليل. */
export const PROJECT_BUILDER_SECTIONS = [
  "اسم المبادرة",
  "فكرة المبادرة",
  "أهداف المبادرة",
  "مبررات المبادرة",
  "نطاق المبادرة",
  "تفاصيل المحتوى وأدوات التنفيذ",
  "مراحل التنفيذ",
  "الخطة التشغيلية (مخطط جانت)",
  "المخرجات والنتائج ومؤشرات القياس",
  "خطة الاستدامة",
  "فريق العمل",
  "أصحاب المصلحة",
  "المخاطر",
  "الميزانية التقديرية",
] as const;

export type ProjectBuilderExclusion = { key: string; label: string; promptText: string };

export const PROJECT_BUILDER_EXCLUSIONS: ProjectBuilderExclusion[] = [
  { key: "noReligious", label: "عدم التطرق للجانب الشرعي أو الديني", promptText: "لا تتطرق لأي محتوى شرعي أو ديني أو إسلامي في أي محور من محاور الوثيقة." },
  { key: "noHosting", label: "عدم ذكر استضافة أشخاص أو ضيوف", promptText: "لا تذكر أي استضافة لأشخاص أو متحدثين أو ضيوف." },
  { key: "noCourses", label: "عدم ذكر دورات تدريبية", promptText: "لا تذكر وجود دورات تدريبية أو حقائب تدريبية ضمن المبادرة." },
  { key: "noBooks", label: "عدم ذكر كتب أو مراجع مطبوعة", promptText: "لا تذكر وجود كتب أو مراجع أو مطبوعات ورقية ضمن المبادرة." },
  { key: "noFiles", label: "عدم ذكر ملفات عرض أو عروض تقديمية", promptText: "لا تذكر وجود ملفات عرض أو عروض تقديمية أو مواد بصرية للعرض." },
];

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

export type ProjectBuilderConfig = {
  /** البرومبت العام — قابلٌ للتعديل من صاحب صلاحية التحكم فقط. */
  systemPromptTemplate: string;
};

/**
 * البرومبت الافتراضي — نفس صياغة الأداة الأصلية حرفياً، مع رموز `{{...}}`
 * تُستبدَل عند التوليد ببيانات الجمعية والمبادرة والقيود. صاحب صلاحية التحكم
 * يرى هذه الرموز ويستطيع إعادة ترتيبها أو حذف بعضها، لكن ليس تغيير أسمائها —
 * التوثيق في الشريط الجانبي لمحرّر الإعدادات.
 */
export const DEFAULT_PROJECT_BUILDER_SYSTEM_PROMPT = `أنت مستشار متخصص في تصميم المبادرات للجمعيات الخيرية. صمّم لي مبادرة احترافية ومتكاملة بناءً على المعلومات التالية:

معلومات الجمعية:
• اسم الجمعية: {{assocName}}
• الرؤية: {{vision}}
• الرسالة: {{mission}}
• الأهداف الاستراتيجية: {{strategicGoals}}
• مجال عمل الجمعية: {{field}}
• المنطقة أو المدينة: {{city}}
• الفكرة المطلوب تصميم وثيقتها: {{programIdea}} (اسمه: {{programName}})

{{exclusions}}

المطلوب: صمّم المبادرة مرتّبة وفق المحاور التالية:
1. اسم المبادرة
2. فكرة المبادرة
3. أهداف المبادرة: هدف عام + 3–5 أهداف تفصيلية قابلة للقياس
4. مبررات المبادرة: الاحتياج، رؤية 2030، المشكلات، الفرص
5. نطاق المبادرة
6. تفاصيل المحتوى وأدوات التنفيذ
7. مراحل التنفيذ
8. الخطة التشغيلية (مخطط جانت)
9. المخرجات والنتائج ومؤشرات القياس
10. خطة الاستدامة
11. فريق العمل (لا يتجاوز 4)
12. أصحاب المصلحة
13. المخاطر
{{budgetLine}}

{{budgetInstructions}}

{{directives}}

تعليمات الإخراج:
• لغة عربية مبسطة ومباشرة.
• عناوين واضحة وجداول نصية حيث يلزم.
• أرقام ومؤشرات واقعية.
• ترابط مع رؤية الجمعية ورسالتها في كل محور.`;

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
  { token: "{{budgetLine}}", hint: "بند الميزانية في قائمة المحاور، أو فارغ إن استُبعدت" },
  { token: "{{budgetInstructions}}", hint: "تعليمات مبلغ الميزانية والاحتياطي، أو أمر حذف المحور" },
  { token: "{{directives}}", hint: "التوجيهات الخاصة التي أضافها الموظف، مُرقّمة" },
];

export function normalizeProjectBuilderConfig(raw: unknown): ProjectBuilderConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ProjectBuilderConfig>;
  const template = typeof r.systemPromptTemplate === "string" ? r.systemPromptTemplate.trim() : "";
  return { systemPromptTemplate: template || DEFAULT_PROJECT_BUILDER_SYSTEM_PROMPT };
}

/** يبني البرومبت النهائي من القالب المحفوظ وبيانات طلب واحد. */
export function buildProjectPrompt(
  template: string,
  charity: ProjectBuilderCharityInfo,
  values: ProjectBuilderValues,
  exclusionKeys: string[],
  budget: ProjectBuilderBudget,
  directives: string[]
): string {
  const activeExclusions = PROJECT_BUILDER_EXCLUSIONS.filter((e) => exclusionKeys.includes(e.key));
  const exclusions = activeExclusions.length
    ? "قيود المحتوى (التزم بها بدقة):\n" + activeExclusions.map((e) => "• " + e.promptText).join("\n")
    : "لا قيود إضافية على المحتوى.";

  let budgetLine = "";
  let budgetInstructions = "";
  if (!budget.include) {
    budgetInstructions = "احذف محور «الميزانية التقديرية» بالكامل من الوثيقة.";
  } else {
    budgetLine = "14. الميزانية التقديرية: جدول ببنود الصرف الرئيسية والتكلفة التقديرية لكل بند والإجمالي.";
    const parts: string[] = [];
    if (budget.total) parts.push("الميزانية الإجمالية يجب أن تساوي بالضبط " + budget.total + " ريال سعودي");
    if (budget.reserve) parts.push("أضف بنداً مستقلاً باسم «مبلغ احتياطي»");
    budgetInstructions = parts.length ? "تعليمات الميزانية:\n" + parts.map((x) => "• " + x).join("\n") : "";
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
    budgetLine,
    budgetInstructions,
    directives: directivesBlock,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => tokens[key] ?? "");
}
