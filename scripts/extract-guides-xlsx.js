/**
 * تحويل ملفات «دليل الأهداف والمؤشرات» إلى JSON — لتُراجَع بالعين قبل إدخالها.
 *
 *     node scripts/extract-guides-xlsx.js
 *
 * وهذه الملفاتُ تحلّ **هياكلَ** الدليل التي استُخرجت من الخطط التشغيلية: تلك
 * كانت رمزاً واسماً، وهذه تحمل وحدةَ القياس والمعادلة والدورية والقطبية
 * والتراكمية ومسؤولي التنفيذ والقياس وخطَّ الأساس والمستهدفات. والمطابقةُ
 * بالرمز، فتُحدَّث الصفوفُ نفسُها ولا يُنشأ غيرُها.
 *
 * وملفُّ مكين مصدَّرٌ من Google Sheets فيكتب سماتَ `<sheet>` بترتيبٍ آخر — وكان
 * قارئُ العُدّة يُرجع صفرَ أوراقٍ منه بلا خطأ، فأُصلح هناك لا هنا.
 *
 * ومعها المعاقد: ناتجُها مُلزَمٌ في المستودع من قبل، فإخراجُها من هذا السكربت
 * دليلٌ على أن القارئ المشترك يُنتج ما أنتجه مستخرِجُها الخاصّ حرفاً — يُقارَن
 * بـ`git diff`.
 */
const fs = require("fs");
const path = require("path");
const { extractGuide } = require("./lib/guide-reader.js");

const SRC = path.join(__dirname, "..", "docs");
const DEST = path.join(__dirname, "..", "prisma", "seed-data");

/** تسويةُ الاسم للمطابقة: الهمزاتُ والشُرَطُ السفلية في أسماء الملفات. */
const fold = (s) =>
  String(s)
    .normalize("NFC")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_\s]+/g, " ");

/**
 * تصحيحٌ مُقَرّ في ملف المعاقد وحده: «س ٤-٢» معلَّمٌ «تراكمي» سهواً ووحدتُه
 * «مستفيدة» وأشباهُه الأربعة «غير تراكمي»، وخانةُ معادلته منسوخةٌ من مؤشر رضا.
 */
function maaqidFix(ind) {
  const out = [];
  if (ind.code === "س 4 - 2" && ind.cumulative) {
    ind.cumulative = false;
    out.push("التراكمية: تراكمي ← غير تراكمي");
    if (ind.formula && ind.formula.includes("رضا")) {
      ind.formula = "حساب إجمالي عدد المستفيدات";
      out.push("المعادلة: منسوخةٌ من مؤشر رضا ← حساب إجمالي عدد المستفيدات");
    }
  }
  return out;
}

const GUIDES = [
  { charity: "الرأفة الإنسانية", match: "الرأفة", out: "raafa" },
  { charity: "رواء سقيا الماء", match: "رواء", out: "rawa" },
  { charity: "ضماد الإسعافية", match: "ضماد", out: "damad" },
  { charity: "مكين التعليمية", match: "مكين", out: "makeen" },
  { charity: "رواق المسجد", match: "رواق", out: "rawaq" },
  { charity: "المعاقد التعليمية", match: "المعاقد", out: "maaqid", fix: maaqidFix },
];

const YEAR = 2026;

for (const g of GUIDES) {
  const wanted = fold(g.match);
  const file = fs
    .readdirSync(SRC)
    .find((f) => f.endsWith(".xlsx") && fold(f).includes(fold("دليل")) && fold(f).includes(wanted));
  if (!file) {
    console.error(`لا ملفَّ دليلٍ يُطابق «${g.match}» في docs/ — تُرك.`);
    continue;
  }

  const perspectives = extractGuide(path.join(SRC, file), { fix: g.fix });
  fs.writeFileSync(
    path.join(DEST, `${g.out}-strategy.json`),
    JSON.stringify({ charity: g.charity, year: YEAR, perspectives }, null, 2)
  );

  const indicators = perspectives.flatMap((p) => p.objectives.flatMap((o) => o.indicators));
  const objectives = perspectives.reduce((n, p) => n + p.objectives.length, 0);
  const withResults = indicators.filter((i) => i.results).length;
  const withTarget = indicators.filter((i) => i.results && i.results.annualTarget).length;
  const postponed = indicators.filter((i) => i.results && i.results.yearState === "POSTPONED").length;
  const corrections = indicators.filter((i) => i.corrections);

  console.log(`\n### ${g.charity}  —  ${file.slice(0, 50)}`);
  console.log(`  أبعاد: ${perspectives.length} (${perspectives.map((p) => p.prefix).join("، ")}) · أهداف: ${objectives} · مؤشرات: ${indicators.length}`);
  console.log(`  تراكمية: ${indicators.filter((i) => i.cumulative).length} · بقطبية نقص: ${indicators.filter((i) => i.polarity === "DOWN").length}`);
  console.log(`  بصفٍّ في المتابعة: ${withResults} · بمستهدفٍ سنويّ: ${withTarget} · مؤجَّلة: ${postponed}`);
  const noUnit = indicators.filter((i) => !i.unit);
  if (noUnit.length) console.log(`  بلا وحدة قياس: ${noUnit.length} (${noUnit.map((i) => i.code).join("، ")})`);
  const orphan = indicators.filter((i) => !i.results);
  if (orphan.length) console.log(`  بلا صفٍّ في المتابعة: ${orphan.map((i) => i.code).join("، ")}`);
  for (const c of corrections) console.log(`  تصحيحٌ مُقَرّ ${c.code}: ${c.corrections.join(" · ")}`);
}

console.log(`\nكُتب إلى prisma/seed-data/`);
