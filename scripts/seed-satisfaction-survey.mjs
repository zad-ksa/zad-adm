/**
 * استبيانُ قياس رضا الجمعيات عن خدمات زاد — يُنشأ في «الاستبيانات المخصّصة».
 *
 *     npm run survey:satisfaction            # قراءةٌ فقط: يُطبع ما سيُكتب
 *     npm run survey:satisfaction -- --apply
 *
 * **وبلا `--apply` لا يُكتب حرف.**
 *
 * ولمَ سكربتٌ لا إدخالٌ من المحرِّر؟ لأنّه ثلاثةٌ وستّون سؤالاً في أحدَ عشرَ
 * قسماً، وخياراتُ كل مقياسٍ ستّةٌ تُكتب يدويّاً في كلّ سؤال — فالإدخالُ اليدويّ
 * ثلاثُ ساعاتٍ ينزلق فيها حرفٌ في خيارٍ فيُحسب مقياساً ثانياً عند التحليل.
 * والنصُّ هنا مصدرٌ واحدٌ يُراجَع في مكانٍ واحد.
 *
 * **ويُعاد تشغيلُه بلا ضرر**: يُعرَف الاستبيانُ بـ`slug` ثابت، فيُحدَّث ولا
 * يُنشأ ثانٍ. وأقسامُه تُحذف وتُكتب من جديد.
 *
 * **ويتوقّف إن كان على الاستبيان ردود.** فردُّ الجمعية يُخزَّن
 * `{ questionId: answer }`، ومُعرِّفاتُ الأسئلة تتغيّر بإعادة الكتابة — فتصير
 * الردودُ القديمةُ مفاتيحَ لا تُقابلها أسئلة، وصفحةُ النتائج تعرضها فارغة.
 * فمن أراد تعديلاً بعد بدء الجمع فليعدّل من المحرِّر، أو `--force` ويقبل فقدان
 * قراءة القديم.
 *
 * ويُترك **غيرَ مُفعَّل**: التفعيلُ قرارُ من يُرسله، لا أثرٌ لسكربت.
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

const SLUG = "charity-satisfaction";
const TITLE = "قياس رضا الجمعيات عن خدمات زاد";
const INTRO = [
  "يسعدنا في زاد أن نسمع رأيكم. هذا الاستبيانُ لقياس رضا جمعيتكم عن الخدمات التي قدّمناها لها،",
  "ونتائجُه تُقرأ لتحسين الخدمة لا للأرشيف.",
  "",
  "ولكلّ خدمةٍ قسمٌ خاصّ، وأوّلُ سؤالٍ فيه: هل تلقّيتم هذه الخدمة؟ — فأجيبوا عن أقسام الخدمات التي",
  "تلقّتها جمعيتكم، واتركوا ما سواها. ولا تستغرق الإجابةُ أكثرَ من ست دقائق.",
].join("\n");

/** مقياسُ الرضا (CSAT) — خمسُ درجاتٍ ومعها «لا تنطبق». */
const SAT = [
  { id: "sat5", text: "راضٍ جداً" },
  { id: "sat4", text: "راضٍ" },
  { id: "sat3", text: "محايد" },
  { id: "sat2", text: "غير راضٍ" },
  { id: "sat1", text: "غير راضٍ تماماً" },
  { id: "na", text: "لا تنطبق" },
];

/** مقياسُ الموافقة (ليكرت) — لعبارات محرّكات الرضا. */
const AGREE = [
  { id: "ag5", text: "أوافق بشدّة" },
  { id: "ag4", text: "أوافق" },
  { id: "ag3", text: "محايد" },
  { id: "ag2", text: "لا أوافق" },
  { id: "ag1", text: "لا أوافق إطلاقاً" },
  { id: "na", text: "لا تنطبق" },
];

/** مقياسُ التوصية (NPS) — صفرٌ «لا أوصي إطلاقاً» وعشرةٌ «أوصي بقوّة». */
const NPS = Array.from({ length: 11 }, (_, n) => ({ id: `nps${n}`, text: String(n) }));

/** مدّةُ التعامل — تُقرأ بها النتائج: رضا سنةٍ أولى ليس رضا سنةٍ ثالثة. */
const TENURE = [
  { id: "t1", text: "أقلّ من ٦ أشهر" },
  { id: "t2", text: "من ٦ أشهر إلى سنة" },
  { id: "t3", text: "من سنة إلى سنتين" },
  { id: "t4", text: "أكثرُ من سنتين" },
];

const OPEN_SERVICE = "ما الذي تقترحونه لتحسين هذه الخدمة؟";

/**
 * الخدماتُ التسعُ كما هي مسجَّلةٌ في `Service.name` في القاعدة.
 *
 * وثلاثةُ محرّكاتٍ لكلٍّ منها على أبعاد SERVQUAL — جودةُ المخرَج، والاعتماديّةُ
 * (المواعيد والمطابقة)، والاستجابةُ والكفاءة — مكتوبةً بلغة تلك الخدمة بعينها:
 * عبارةٌ عامّةٌ كـ«الخدمةُ جيّدة» تُجاب بلا تفكيرٍ ولا يُستخرج منها عملٌ.
 */
const SERVICES = [
  {
    name: "التخطيط الاستراتيجي",
    screener: "هل تلقّت جمعيتكم خدمةَ التخطيط الاستراتيجي من زاد؟",
    csat: "رضاكم العامُّ عن خدمة التخطيط الاستراتيجي",
    drivers: [
      "الخطةُ التي خرجنا بها واضحةٌ وقابلةٌ للتنفيذ بإمكانات الجمعية",
      "أُشرِك فريقُ الجمعية ومجلسُها في بناء الخطة بالقدر الكافي",
      "أُنجزت مراحلُ الخدمة في المواعيد المتّفق عليها",
    ],
  },
  {
    name: "الحوكمة",
    screener: "هل تلقّت جمعيتكم خدمةَ الحوكمة من زاد؟",
    csat: "رضاكم العامُّ عن خدمة الحوكمة",
    drivers: [
      "اللوائحُ والسياساتُ المُعدَّة مكتملةٌ ومطابقةٌ لمتطلّبات الجهات الرسمية",
      "مكّنتنا الخدمةُ من تطبيق الحوكمة عملاً لا ورقاً فقط",
      "استجاب الفريقُ لملاحظاتنا وملاحظات الجهات الرقابيّة في وقتها",
    ],
  },
  {
    name: "التسويق وتنمية الموارد المالية",
    screener: "هل تلقّت جمعيتكم خدمةَ التسويق وتنمية الموارد المالية من زاد؟",
    csat: "رضاكم العامُّ عن خدمة التسويق وتنمية الموارد المالية",
    drivers: [
      "الملفّاتُ والمشاريعُ المُعدَّة للجهات المانحة جاءت بجودةٍ تُقدَّم بها الجمعية",
      "أسهمت الخدمةُ في زيادة موارد الجمعية أو في فتح شراكاتٍ جديدة",
      "تُتابَع الطلباتُ المرفوعةُ للجهات المانحة حتى نتيجةٍ واضحة، ونُخبَر بها",
    ],
  },
  {
    name: "الإعلامية",
    screener: "هل تلقّت جمعيتكم الخدمةَ الإعلاميّة من زاد؟",
    csat: "رضاكم العامُّ عن الخدمة الإعلاميّة",
    drivers: [
      "التصاميمُ والمحتوى المُسلَّم بجودةٍ عاليةٍ ومطابقٌ لهويّة الجمعية",
      "تُسلَّم الأعمالُ في المواعيد المتّفق عليها",
      "تُستوعَب ملاحظاتُنا في جولات التعديل بلا تكرارٍ للطلب نفسه",
    ],
  },
  {
    name: "الإدارية",
    screener: "هل تلقّت جمعيتكم الخدمةَ الإداريّة من زاد؟",
    csat: "رضاكم العامُّ عن الخدمة الإداريّة",
    drivers: [
      "الأنظمةُ واللوائحُ الإداريّةُ وأدواتُ الموارد البشريّة المُسلَّمة مكتملةٌ وواضحة",
      "هي قابلةٌ للتطبيق في حجم الجمعية وإمكاناتها الحاليّة",
      "نجد من يُجيب عن استفساراتنا الإداريّة في وقتٍ معقول",
    ],
  },
  {
    name: "المالية",
    screener: "هل تلقّت جمعيتكم الخدمةَ الماليّة من زاد؟",
    csat: "رضاكم العامُّ عن الخدمة الماليّة",
    drivers: [
      "التقاريرُ والقوائمُ الماليّةُ دقيقةٌ وتصل في وقتها",
      "التزاماتُنا الماليّةُ تجاه زاد وجدولُ أقساطها واضحةٌ بلا لبس",
      "تُعالَج طلباتُنا الماليّةُ في وقتٍ مناسب",
    ],
  },
  {
    name: "التقنية",
    screener: "هل تلقّت جمعيتكم الخدمةَ التقنيّة من زاد؟",
    csat: "رضاكم العامُّ عن الخدمة التقنيّة",
    drivers: [
      "الأنظمةُ والمنصّاتُ المُسلَّمة تعمل باستقرارٍ ويُعتمد عليها",
      "استخدامُها سهلٌ على فريق الجمعية بلا خبرةٍ تقنيّةٍ خاصّة",
      "تُحَلُّ الأعطالُ وتُجاب طلباتُ الدعم في وقتٍ مقبول",
    ],
  },
  {
    name: "خدمات المشاريع",
    screener: "هل تلقّت جمعيتكم خدماتِ المشاريع من زاد؟",
    csat: "رضاكم العامُّ عن خدمات المشاريع",
    drivers: [
      "تصميمُ المشاريع ودراساتُها بجودةٍ تُقنع الجهاتَ المانحة والشركاء",
      "نُفِّذت المشاريعُ كما خُطِّط لها نطاقاً وزمناً وموازنة",
      "تصلنا تقاريرُ المتابعة بانتظامٍ وتُقرأ منها حالُ المشروع",
    ],
  },
  {
    name: "الإسناد الحكومي",
    screener: "هل تلقّت جمعيتكم خدمةَ الإسناد الحكومي من زاد؟",
    csat: "رضاكم العامُّ عن خدمة الإسناد الحكومي",
    drivers: [
      "فريقُ زاد على معرفةٍ بالأنظمة ومتطلّبات الجهات الرسميّة",
      "أُنجزت المعاملاتُ والتراخيصُ في أوقاتها بلا تعطيلٍ لعمل الجمعية",
      "نبقى على علمٍ بحال المعاملة في كل مرحلةٍ بلا أن نسأل",
    ],
  },
];

const text = (t, { required = true } = {}) => ({ text: t, type: "TEXT", isRequired: required, options: null });
const yesNo = (t) => ({ text: t, type: "YES_NO", isRequired: true, options: null });
const choice = (t, options, { required = true } = {}) => ({ text: t, type: "OPTIONS", isRequired: required, options });

/**
 * بناءُ الأقسام.
 *
 * وأسئلةُ الخدمة **غيرُ إلزاميّة** ورأسُ القسم إلزاميّ: المحرّكُ لا يُخفي
 * سؤالاً بناءً على جوابٍ سابق، فمن لم يتلقَّ الخدمةَ يترك أسئلتَها — ولو كانت
 * إلزاميّةً لحُبس عند قسمٍ لا يخصّه. وأسئلةُ القسم العامّ إلزاميّةٌ لأنّها
 * تخصّ كلَّ من تعامل مع زاد.
 */
function buildSections() {
  const sections = [
    {
      title: "عن المستجيب",
      questions: [
        text("اسمُ المستجيب"),
        text("الصفةُ الوظيفيّة في الجمعية"),
        choice("مدّةُ تعامل جمعيتكم مع زاد", TENURE),
      ],
    },
  ];

  for (const service of SERVICES) {
    sections.push({
      title: service.name,
      questions: [
        yesNo(service.screener),
        choice(service.csat, SAT, { required: false }),
        ...service.drivers.map((d) => choice(d, AGREE, { required: false })),
        text(OPEN_SERVICE, { required: false }),
      ],
    });
  }

  sections.push({
    title: "التجربة العامّة مع زاد",
    questions: [
      choice("رضاكم العامُّ عن تعامل جمعيتكم مع زاد في هذه الفترة", SAT),
      choice("ما مدى احتمال أن توصوا جمعيةً أخرى بالتعامل مع زاد؟", NPS),
      choice(
        "الوصولُ إلى المسؤول عن خدمتنا في زاد وإنجازُ ما نحتاجه سهلٌ ولا يتطلّب جهداً متكرّراً",
        AGREE
      ),
      choice("نثق أنّ زاد تُراعي مصلحةَ الجمعية في ما تُقدّمه لها", AGREE),
      text("أهمُّ شيءٍ ترونه يستحقّ التحسين في تعاملكم مع زاد"),
      text("أهمُّ شيءٍ أعجبكم وتريدون أن نحافظ عليه", { required: false }),
    ],
  });

  return sections;
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const sections = buildSections();
  const total = sections.reduce((sum, s) => sum + s.questions.length, 0);

  console.log(`الاستبيان: «${TITLE}»  ·  الرابط: /custom-survey/${SLUG}`);
  console.log(`أقسامٌ: ${sections.length} · أسئلةٌ: ${total}`);
  for (const s of sections) console.log(`  • ${s.title}: ${s.questions.length}`);

  const existing = await prisma.customSurvey.findUnique({
    where: { slug: SLUG },
    select: { id: true, isActive: true, _count: { select: { responses: true, sections: true } } },
  });

  if (existing) {
    console.log(
      `\nقائمٌ بهذا الرابط: ${existing._count.sections} قسماً · ${existing._count.responses} ردّاً · ` +
        (existing.isActive ? "مُفعَّل" : "غيرُ مُفعَّل")
    );
    if (existing._count.responses > 0 && !FORCE) {
      console.log(
        "\nتوقّف: على الاستبيان ردود. وإعادةُ كتابة الأسئلة تُغيّر مُعرِّفاتها،\n" +
          "فتصير الردودُ القديمةُ بلا أسئلةٍ تُقابلها في صفحة النتائج.\n" +
          "عدِّل من المحرِّر، أو أضف --force إن قبلتَ ذلك."
      );
      return;
    }
  }

  if (!APPLY) {
    console.log("\nهذه قراءةٌ فقط. للتنفيذ: أضف --apply");
    return;
  }

  const surveyId = await prisma.$transaction(async (tx) => {
    const survey = existing
      ? await tx.customSurvey.update({
          where: { id: existing.id },
          // ولا تُمسّ `isActive`: من فعّله لا يُطفأ عليه بإعادة تشغيل، ومن لم
          // يُفعّله يبقى على حاله.
          data: { title: TITLE, introText: INTRO },
        })
      : await tx.customSurvey.create({
          data: { slug: SLUG, title: TITLE, introText: INTRO, isActive: false },
        });

    // الأسئلةُ تُحذف مع أقسامها (onDelete: Cascade)، ثمّ تُكتب من جديد —
    // فالنصُّ هنا هو المصدر، لا ما بقي في القاعدة من تشغيلٍ سابق.
    await tx.customSurveySection.deleteMany({ where: { surveyId: survey.id } });

    // **المُعرِّفاتُ تُولَّد هنا لا في القاعدة**، فتُكتب الأقسامُ كلُّها بطلبٍ
    // واحدٍ وأسئلتُها بطلبٍ واحد. وكان كلُّ قسمٍ بطلبٍ وأسئلتُه معه، فأحدَ عشرَ
    // طلباً متتابعاً على قاعدةٍ في سنغافورة تُجاوز مهلةَ المعاملة (خمسُ ثوانٍ)
    // فتُلغى كلُّها.
    const sectionRows = sections.map((section, order) => ({
      id: randomUUID(),
      surveyId: survey.id,
      title: section.title,
      order,
    }));

    const questionRows = sections.flatMap((section, index) =>
      section.questions.map((q, order) => ({
        id: randomUUID(),
        sectionId: sectionRows[index].id,
        text: q.text,
        type: q.type,
        isRequired: q.isRequired,
        options: q.options ?? undefined,
        order,
      }))
    );

    await tx.customSurveySection.createMany({ data: sectionRows });
    await tx.customSurveyQuestion.createMany({ data: questionRows });

    return survey.id;
  }, { timeout: 30_000, maxWait: 15_000 });

  const written = await prisma.customSurveyQuestion.count({ where: { section: { surveyId } } });
  console.log(`\nكُتب: ${sections.length} قسماً · ${written} سؤالاً.`);
  console.log(`الصفحة: /main/custom-surveys  ·  المعرّف: ${surveyId}`);
  console.log(
    existing?.isActive
      ? "وهو مُفعَّلٌ كما كان."
      : "وهو غيرُ مُفعَّل — يُفعَّل من صفحة الاستبيانات حين تريد إرساله."
  );
}

main()
  .catch((error) => {
    console.error("تعذّر:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
