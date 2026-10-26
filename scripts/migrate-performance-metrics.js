/**
 * ترحيل مقياس الأداء من JSON إلى الجداول العلائقية.
 *
 * كان `PerformanceMetric` يحمل شجرة المؤشرات كلّها في حقلٍ واحد لكل (اسم
 * جمعية، سنة). وصارت الشجرة صفوفاً: محورٌ وهدفٌ ومؤشر، ونتيجةٌ لكل (مؤشر،
 * سنة، فترة). وهذا السكربت ينقل ما سُجّل قبل النقل.
 *
 * ولا يُحذف الجدول القديم: يبقى شاهداً حتى يُؤكَّد الترحيل بالعين.
 *
 *   node -r dotenv/config scripts/migrate-performance-metrics.js          # تجريبي: يطبع ولا يكتب
 *   node -r dotenv/config scripts/migrate-performance-metrics.js --write  # ينفّذ
 *
 * وهو قابلٌ للإعادة: يُطابق بالرموز فيُحدّث ولا يُكرّر.
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const WRITE = process.argv.includes("--write");

const DEFAULT_PREFIX = { 1: "س", 2: "ص", 3: "م", 4: "ل", 5: "ت" };
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

/** «90%» و«90» كلتاهما ٩٠. والفراغ فراغٌ لا صفر. */
function toNumber(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const n = parseFloat(raw.endsWith("%") ? raw.slice(0, -1) : raw);
  return Number.isFinite(n) ? n : null;
}

/** نسبةٌ أو درجة ← تراكمي: قيمتها مستوًى قائم لا كمٌّ يُجمع. */
function inferCumulative(indicator) {
  const values = [
    indicator.annualTarget,
    indicator.annualAchieved,
    ...QUARTERS.flatMap((q) => [indicator[`${q.toLowerCase()}Target`], indicator[`${q.toLowerCase()}Achieved`]]),
  ];
  const hasPercent = values.some((v) => v !== null && v !== undefined && String(v).includes("%"));
  const nameHints = /نسبة|مستوى|درجة|معدل/.test(String(indicator.name || ""));
  return hasPercent || nameHints;
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("لا DATABASE_URL في البيئة");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const metrics = await prisma.performanceMetric.findMany({ orderBy: [{ charityName: "asc" }, { year: "asc" }] });
    console.log(`${WRITE ? "تنفيذ" : "تجريبي (بلا كتابة)"} — صفوف PerformanceMetric: ${metrics.length}\n`);

    const charities = await prisma.charity.findMany({ select: { id: true, name: true } });
    const byName = new Map(charities.map((c) => [c.name.trim(), c.id]));

    let totalPerspectives = 0;
    let totalObjectives = 0;
    let totalIndicators = 0;
    let totalResults = 0;

    for (const metric of metrics) {
      const rawName = String(metric.charityName || "").trim();
      // الربط بالاسم نصاً هو عيب الجدول القديم، فالمطابقة تتحمّل «جمعية …»
      // والمسافات الزائدة — وما لم يُطابق يُعلَن ولا يُخمَّن.
      const charityId =
        byName.get(rawName) ||
        byName.get(rawName.replace(/^جمعية\s+/, "")) ||
        charities.find((c) => c.name.trim().toLowerCase() === rawName.toLowerCase())?.id ||
        null;

      if (!charityId) {
        console.log(`✗ ${rawName} / ${metric.year} — لا جمعية بهذا الاسم. تُرك.`);
        continue;
      }

      const axes = Array.isArray(metric.data) ? metric.data : metric.data?.axes;
      if (!Array.isArray(axes)) {
        console.log(`✗ ${rawName} / ${metric.year} — شكل البيانات غير معروف. تُرك.`);
        continue;
      }

      let perspectives = 0;
      let objectives = 0;
      let indicators = 0;
      let results = 0;

      for (const [axisIndex, axis] of axes.entries()) {
        const prefix = String(axis.prefix || DEFAULT_PREFIX[axis.id] || `م${axisIndex + 1}`).trim();
        const axisName = String(axis.name || `محور ${axisIndex + 1}`).trim();
        const goals = Array.isArray(axis.goals) ? axis.goals : [];
        const axisIndicators = goals.reduce((n, g) => n + (Array.isArray(g.indicators) ? g.indicators.length : 0), 0);

        // محورٌ فارغٌ تماماً لا يُنشأ: الأبعاد الخمسة الافتراضية تُحمَّل في
        // الواجهة حتى لو لم يُدخل فيها شيء، ونقلُها يُنشئ هياكل فارغة.
        if (axisIndicators === 0 && goals.length === 0) continue;

        perspectives++;
        let perspectiveId = null;
        if (WRITE) {
          const existing = await prisma.strategyPerspective.findUnique({
            where: { charityId_prefix: { charityId, prefix } },
            select: { id: true },
          });
          perspectiveId = existing
            ? (await prisma.strategyPerspective.update({
                where: { id: existing.id },
                data: { name: axisName, order: axisIndex + 1 },
                select: { id: true },
              })).id
            : (await prisma.strategyPerspective.create({
                data: { charityId, name: axisName, prefix, order: axisIndex + 1 },
                select: { id: true },
              })).id;
        }

        for (const [goalIndex, goal] of goals.entries()) {
          const code = String(goal.code || "").trim() || `${prefix} ${goalIndex + 1}`;
          const goalName = String(goal.name || `هدف ${goalIndex + 1}`).trim();
          objectives++;

          let objectiveId = null;
          if (WRITE) {
            const existing = await prisma.strategyObjective.findUnique({
              where: { perspectiveId_code: { perspectiveId, code } },
              select: { id: true },
            });
            objectiveId = existing
              ? (await prisma.strategyObjective.update({
                  where: { id: existing.id },
                  data: { name: goalName, order: goalIndex + 1 },
                  select: { id: true },
                })).id
              : (await prisma.strategyObjective.create({
                  data: { perspectiveId, code, name: goalName, order: goalIndex + 1 },
                  select: { id: true },
                })).id;
          }

          const list = Array.isArray(goal.indicators) ? goal.indicators : [];
          for (const [indicatorIndex, indicator] of list.entries()) {
            const indicatorCode = String(indicator.code || "").trim() || `${code} - ${indicatorIndex + 1}`;
            const indicatorName = String(indicator.name || `مؤشر ${indicatorIndex + 1}`).trim();
            const cumulative = inferCumulative(indicator);
            indicators++;

            let indicatorId = null;
            if (WRITE) {
              const existing = await prisma.strategyIndicator.findUnique({
                where: { objectiveId_code: { objectiveId, code: indicatorCode } },
                select: { id: true },
              });
              const data = {
                name: indicatorName,
                owner: String(indicator.owner || "").trim() || null,
                cumulative,
                order: indicatorIndex + 1,
              };
              indicatorId = existing
                ? (await prisma.strategyIndicator.update({ where: { id: existing.id }, data, select: { id: true } })).id
                : (await prisma.strategyIndicator.create({
                    data: { ...data, objectiveId, code: indicatorCode },
                    select: { id: true },
                  })).id;
            }

            const rows = [
              { period: "YEAR", target: toNumber(indicator.annualTarget), actual: null, isOverride: false },
              ...QUARTERS.map((q) => ({
                period: q,
                target: toNumber(indicator[`${q.toLowerCase()}Target`]),
                actual: toNumber(indicator[`${q.toLowerCase()}Achieved`]),
                isOverride: false,
              })),
            ];
            const state = indicator.postponed ? "POSTPONED" : "ACTIVE";

            for (const row of rows) {
              if (row.target === null && row.actual === null && state === "ACTIVE") continue;
              results++;
              if (!WRITE) continue;
              await prisma.indicatorResult.upsert({
                where: { indicatorId_year_period: { indicatorId, year: metric.year, period: row.period } },
                update: { target: row.target, actual: row.actual, state, isOverride: row.isOverride },
                create: {
                  indicatorId,
                  year: metric.year,
                  period: row.period,
                  target: row.target,
                  actual: row.actual,
                  state,
                  isOverride: row.isOverride,
                },
              });
            }
          }
        }
      }

      console.log(
        `✓ ${rawName} / ${metric.year} — ${perspectives} محوراً، ${objectives} هدفاً، ${indicators} مؤشراً، ${results} نتيجة`
      );
      totalPerspectives += perspectives;
      totalObjectives += objectives;
      totalIndicators += indicators;
      totalResults += results;
    }

    console.log(
      `\nالإجمالي: ${totalPerspectives} محوراً · ${totalObjectives} هدفاً · ${totalIndicators} مؤشراً · ${totalResults} نتيجة`
    );
    if (!WRITE) console.log("لم يُكتب شيء. أعد التشغيل بـ--write للتنفيذ.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("فشل الترحيل:", e.message);
  process.exit(1);
});
