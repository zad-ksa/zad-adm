import test from "node:test";
import assert from "node:assert/strict";
import {
  CHARITY_SIZES,
  filterPractices,
  filterProofs,
  guideSize,
  guideSizeLabel,
  guideTotals,
  isGuideSize,
  shortIndicatorTitle,
  shortStandardTitle,
  type GuidePractice,
  type GuideStandard,
} from "./governanceGuide.ts";

// ── الأحجام ────────────────────────────────────────────────────────────────

test("الأحجامُ خمسةٌ مرتَّبةٌ من الأصغر إلى الأكبر", () => {
  assert.deepEqual(
    CHARITY_SIZES.map((s) => s.id),
    ["MICRO", "SMALL", "MEDIUM", "LARGE", "MEGA"]
  );
});

test("حجمٌ من العنوان يُفحص ولا يُصدَّق", () => {
  assert.equal(isGuideSize("SMALL"), true);
  assert.equal(isGuideSize("small"), false);
  assert.equal(isGuideSize("HUGE"), false);
  assert.equal(isGuideSize(undefined), false);
  assert.equal(guideSize("HUGE"), null);
  assert.equal(guideSizeLabel("MEGA"), "متناهية الكبر");
  assert.equal(guideSizeLabel("HUGE"), "");
});

// ── العناوين ───────────────────────────────────────────────────────────────

test("ترتيبُ المعيار يُحذف من عنوانه", () => {
  assert.equal(shortStandardTitle("أولاً: معيار الامتثال والالتزام"), "معيار الامتثال والالتزام");
  assert.equal(shortStandardTitle("ثالثاً: معيار السلامة المالية"), "معيار السلامة المالية");
  assert.equal(shortStandardTitle("ثانيا : معيار الشفافية"), "معيار الشفافية");
});

test("معيارٌ بلا ترتيبٍ يبقى كما هو", () => {
  assert.equal(shortStandardTitle("معيار الحوكمة"), "معيار الحوكمة");
});

test("صدرُ المؤشّر يُحذف رقماً كان أو لفظاً", () => {
  assert.equal(shortIndicatorTitle("1. مؤشر اللائحة الأساسية"), "مؤشر اللائحة الأساسية");
  assert.equal(shortIndicatorTitle("12) مؤشر الجمعية العمومية"), "مؤشر الجمعية العمومية");
  assert.equal(shortIndicatorTitle("المؤشر الأول: اللائحة الأساسية"), "اللائحة الأساسية");
  assert.equal(shortIndicatorTitle("مؤشر مجلس الإدارة"), "مؤشر مجلس الإدارة");
});

// ── الأعداد ────────────────────────────────────────────────────────────────

const standards: GuideStandard[] = [
  {
    id: "s1",
    title: "أولاً: معيار الامتثال",
    description: "وصف",
    practices: [
      {
        id: "p1",
        title: "1. مؤشر اللائحة الأساسية",
        questions: [
          { question: "توفير لائحة أساسية معتمدة", proof: "وجود اللائحة معتمدة" },
          { question: "تعديل اللائحة خلال سنة التقييم", proof: "محتوى اللائحة الحالية" },
        ],
      },
      {
        id: "p2",
        title: "2. مؤشر الجمعية العمومية",
        description: "اجتماعات الجمعية العمومية",
        questions: [{ question: "انعقاد الاجتماع السنوي", proof: "محضر الاجتماع" }],
      },
    ],
    detailedProofs: [{ title: "اللائحة الأساسية", requirements: ["نسخة معتمدة", "محضر الاعتماد"] }],
  },
  {
    id: "s2",
    title: "ثانياً: معيار الشفافية",
    description: "وصف",
    practices: [{ id: "p3", title: "1. مؤشر الإفصاح", questions: [{ question: "نشر التقرير", proof: "التقرير المنشور" }] }],
  },
];

test("الأعدادُ تُجمع من المعايير كلِّها", () => {
  assert.deepEqual(guideTotals(standards), { standards: 2, indicators: 3, questions: 4, proofs: 1 });
});

test("دليلٌ فارغٌ أعدادُه أصفار", () => {
  assert.deepEqual(guideTotals([]), { standards: 0, indicators: 0, questions: 0, proofs: 0 });
});

// ── التصفية ───────────────────────────────────────────────────────────────

test("المؤشّرُ يُطابَق بعنوانه أو بسؤاله أو بشاهده", () => {
  const practices: GuidePractice[] = standards[0].practices;
  assert.deepEqual(filterPractices(practices, "العمومية").map((p) => p.id), ["p2"]);
  assert.deepEqual(filterPractices(practices, "محضر").map((p) => p.id), ["p2"]);
  assert.deepEqual(filterPractices(practices, "لائحه").map((p) => p.id), ["p1"]);
  assert.deepEqual(filterPractices(practices, "اجتماعات").map((p) => p.id), ["p2"]);
});

test("بحثٌ بلا نتيجةٍ يُرجع قائمةً فارغة، وبحثٌ فارغٌ يُرجعها كاملة", () => {
  assert.equal(filterPractices(standards[0].practices, "طائرة").length, 0);
  assert.equal(filterPractices(standards[0].practices, "").length, 2);
});

test("الشواهدُ التفصيليةُ تُرشَّح بعنوانها أو بمتطلّباتها", () => {
  const proofs = standards[0].detailedProofs!;
  assert.equal(filterProofs(proofs, "محضر").length, 1);
  assert.equal(filterProofs(proofs, "اللائحة").length, 1);
  assert.equal(filterProofs(proofs, "ميزانية").length, 0);
});
