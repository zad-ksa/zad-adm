/**
 * بذر دليل الأهداف والمؤشرات والخطة التشغيلية من ملفَّي JSON.
 *
 *   node -r dotenv/config scripts/seed-strategy.js           # تجريبي: يطبع ولا يكتب
 *   node -r dotenv/config scripts/seed-strategy.js --write   # ينفّذ
 *   node -r dotenv/config scripts/seed-strategy.js --guide=raafa-strategy.json --plan=raafa-operational.json
 *
 * والملفّان وسيطان لا ثابتان: ستُّ جمعياتٍ لها خططٌ بالقالب نفسه، فنسخُ
 * السكربت لكلٍّ منها يعني ستّ نسخٍ من منطق المطابقة تتفرّق عند أول تصحيح.
 *
 * وهو قابلٌ للإعادة: يُطابق بالرموز والأرقام فيُحدّث ولا يُكرّر. وتشغيلُه
 * مرّتين لا يُنشئ ثلاثةً وثمانين هدفاً.
 *
 * والملفّان مولَّدان من ملفَّي Excel مرّةً واحدة (prisma/seed-data)، فلا تُقرأ
 * جداول Excel في كل تشغيل ولا تُضاف حزمةٌ للمشروع.
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const WRITE = process.argv.includes("--write");
const DATA = path.join(__dirname, "..", "prisma", "seed-data");

const argOf = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const GUIDE_FILE = argOf("guide", "maaqid-strategy.json");
const PLAN_FILE = argOf("plan", "maaqid-operational.json");

/**
 * الرموز تُكتب بصيغتين: الدليل «س 2 - 1» والكشاف «(س2-1)». فالمطابقة بعد
 * تطبيعٍ يُسقط الفراغات والأقواس.
 */
const normalise = (code) =>
  String(code || "")
    .replace(/[()\s]/g, "")
    .replace(/[–—]/g, "-");

/**
 * تطبيعُ اسم المؤشر — وهو مفتاحُ الربط الأول لا الرمز.
 *
 * ورموزُ الكشاف من نسخةٍ أقدم من الدليل فهي مُزاحة: الكشاف يطلب «(ص1-5) عدد
 * المنصات الإعلامية» والدليل يسمّيه «ص 1 - 4»، و«ص 1 - 5» فيه شيءٌ آخر. فالمطابقة
 * بالرمز وحده تربط مبادرةً بمؤشرٍ خطأ بصمت — وهذا ما كُشف في م٧. والأسماء
 * متطابقة، فهي الأصدق.
 *
 * والكشاف يكتب المذكّر («طلاب»، «المستفيدين»، «المتطوعين») والدليل المؤنّث،
 * فتُسوّى الصيغتان. وتُجرَّد الحركات وتُوحَّد الألف والياء والهاء.
 */
const normaliseName = (value) =>
  String(value || "")
    // \u0641\u0627\u0635\u0644\u064F \u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062A \u0641\u064A \u062E\u0627\u0646\u0629 \u0627\u0644\u0643\u0634\u0627\u0641 \u00AB\u25CF\u00BB\u060C \u0648\u0627\u0644\u062A\u0639\u0628\u064A\u0631\u064F \u0627\u0644\u0630\u064A \u064A\u0642\u062A\u0637\u0639 \u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u064A\u0623\u062E\u0630 \u0645\u0627
    // \u0628\u0639\u062F \u0627\u0644\u0627\u0633\u0645 \u062D\u062A\u0649 \u0627\u0644\u0642\u0648\u0633 \u0627\u0644\u062A\u0627\u0644\u064A \u0641\u064A\u0644\u062A\u0635\u0642 \u0627\u0644\u0641\u0627\u0635\u0644\u064F \u0628\u0622\u062E\u0631\u0647. \u0648\u0644\u0648\u0644\u0627 \u0625\u0633\u0642\u0627\u0637\u064F\u0647 \u0644\u0633\u0642\u0637\u062A
    // \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629\u064F \u0628\u0627\u0644\u0627\u0633\u0645 \u0641\u064A \u0633\u062A\u0651\u064A\u0646 \u0645\u0648\u0636\u0639\u0627\u064B \u0648\u0627\u0631\u062A\u062F\u0651\u062A \u0625\u0644\u0649 \u0627\u0644\u0631\u0645\u0632 \u0628\u0644\u0627 \u062D\u0627\u062C\u0629.
    .replace(/[\u25CF\u2022\u25AA\u00B7]/g, " ")
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/المستفيدين/g, "المستفيدات")
    .replace(/مستفيدين/g, "مستفيدات")
    .replace(/الطلاب/g, "الطالبات")
    .replace(/طلاب/g, "طالبات")
    .replace(/العاملين/g, "العاملات")
    .replace(/المتطوعين/g, "المتطوعات")
    .replace(/\s+/g, " ")
    .trim();

const report = { created: {}, updated: {}, warnings: [] };
const bump = (bag, key) => (bag[key] = (bag[key] || 0) + 1);

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("لا DATABASE_URL في البيئة");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const guide = JSON.parse(fs.readFileSync(path.join(DATA, GUIDE_FILE), "utf8"));
    const operational = JSON.parse(fs.readFileSync(path.join(DATA, PLAN_FILE), "utf8"));
    if (guide.charity !== operational.charity) {
      throw new Error(`الملفّان لجمعيتين: «${guide.charity}» و«${operational.charity}»`);
    }

    /**
     * مصدرٌ ناقصٌ لا يمسح ما كتبه مصدرٌ أوفى.
     *
     * فهيكلُ الدليل المستخرَج من الخطة التشغيلية يحمل الرمزَ والاسم وحدهما
     * («skeleton: true»، وما سواهما فارغ. ولو كُتبت تلك الأصفارُ لمسح
     * تشغيلٌ ثانٍ للهيكل وحداتَ القياس والمستهدفات التي أدخلها دليلٌ كامل
     * بعده. فالحقولُ الفارغة تُحذف من المكتوب، وتبقى للقاعدة قيمتُها.
     */
    const partial = (data) =>
      guide.skeleton
        ? Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined))
        : data;

    const charity = await prisma.charity.findUnique({ where: { name: guide.charity }, select: { id: true } });
    if (!charity) throw new Error(`لا جمعية باسم «${guide.charity}»`);

    console.log(
      `${WRITE ? "تنفيذ" : "تجريبي (بلا كتابة)"} — الجمعية: ${guide.charity}، السنة ${guide.year}` +
        `${guide.skeleton ? " · دليلٌ هيكليٌّ (رمزٌ واسمٌ فقط)" : ""}\n`
    );

    const indicatorIdByCode = new Map();
    const indicatorIdByName = new Map();
    const indicatorCodeByName = new Map();
    const objectiveIdByCode = new Map();
    const objectiveIdByName = new Map();

    // ── الدليل ──────────────────────────────────────────────────────────────
    for (const [pIndex, p] of guide.perspectives.entries()) {
      let perspectiveId = null;
      if (WRITE) {
        const existing = await prisma.strategyPerspective.findUnique({
          where: { charityId_prefix: { charityId: charity.id, prefix: p.prefix } },
          select: { id: true },
        });
        perspectiveId = existing
          ? (
              await prisma.strategyPerspective.update({
                where: { id: existing.id },
                data: { name: p.name, order: pIndex + 1 },
                select: { id: true },
              })
            ).id
          : (
              await prisma.strategyPerspective.create({
                data: { charityId: charity.id, name: p.name, prefix: p.prefix, order: pIndex + 1 },
                select: { id: true },
              })
            ).id;
        bump(existing ? report.updated : report.created, "أبعاد");
      } else {
        bump(report.created, "أبعاد");
      }

      for (const [oIndex, o] of p.objectives.entries()) {
        let objectiveId = null;
        if (WRITE) {
          const existing = await prisma.strategyObjective.findUnique({
            where: { perspectiveId_code: { perspectiveId, code: o.code } },
            select: { id: true },
          });
          const data = partial({ name: o.name, description: o.description, order: oIndex + 1 });
          objectiveId = existing
            ? (await prisma.strategyObjective.update({ where: { id: existing.id }, data, select: { id: true } })).id
            : (
                await prisma.strategyObjective.create({
                  data: { ...data, perspectiveId, code: o.code },
                  select: { id: true },
                })
              ).id;
          bump(existing ? report.updated : report.created, "أهداف");
        } else {
          bump(report.created, "أهداف");
        }
        objectiveIdByCode.set(normalise(o.code), objectiveId);
        objectiveIdByName.set(normaliseName(o.name), objectiveId);

        for (const [iIndex, ind] of o.indicators.entries()) {
          const data = partial({
            name: ind.name,
            description: ind.description,
            unit: ind.unit,
            formula: ind.formula,
            frequency: ind.frequency,
            polarity: ind.polarity,
            cumulative: ind.cumulative,
            execOwner: ind.execOwner,
            measureOwner: ind.measureOwner,
            baseline: ind.baseline,
            order: iIndex + 1,
          });

          let indicatorId = null;
          if (WRITE) {
            const existing = await prisma.strategyIndicator.findUnique({
              where: { objectiveId_code: { objectiveId, code: ind.code } },
              select: { id: true },
            });
            indicatorId = existing
              ? (await prisma.strategyIndicator.update({ where: { id: existing.id }, data, select: { id: true } })).id
              : (
                  await prisma.strategyIndicator.create({
                    data: { ...data, objectiveId, code: ind.code },
                    select: { id: true },
                  })
                ).id;
            bump(existing ? report.updated : report.created, "مؤشرات");
          } else {
            bump(report.created, "مؤشرات");
          }
          indicatorIdByCode.set(normalise(ind.code), indicatorId);
          indicatorIdByName.set(normaliseName(ind.name), indicatorId);
          indicatorCodeByName.set(normaliseName(ind.name), ind.code);

          if (ind.corrections) {
            report.warnings.push(`تصحيحٌ مُقَرّ في ${ind.code}: ${ind.corrections.join(" · ")}`);
          }

          // ── نتائج السنة والأرباع ────────────────────────────────────────
          if (!ind.results) continue;
          const rows = [
            { period: "YEAR", target: ind.results.annualTarget, actual: null, state: ind.results.yearState },
          ];
          for (const [period, q] of Object.entries(ind.results.quarters)) {
            // الربعان الأول والثاني غير موجودين في الملف، فيبقيان فارغين قابلين
            // للإدخال — لا يُكتب لهما صفٌّ بأصفار.
            if (!q) continue;
            rows.push({ period, target: q.target, actual: q.actual, state: q.state });
          }

          for (const row of rows) {
            if (row.target === null && row.actual === null && row.state === "ACTIVE") continue;
            bump(report.created, "نتائج");
            if (!WRITE) continue;
            await prisma.indicatorResult.upsert({
              where: { indicatorId_year_period: { indicatorId, year: guide.year, period: row.period } },
              update: { target: row.target, actual: row.actual, state: row.state },
              create: {
                indicatorId,
                year: guide.year,
                period: row.period,
                target: row.target,
                actual: row.actual,
                state: row.state,
              },
            });
          }
        }
      }
    }

    // ── الخطة التشغيلية ─────────────────────────────────────────────────────
    const planData = {
      label: operational.plan.label,
      startDate: new Date(`${operational.plan.startDate}T00:00:00Z`),
      endDate: new Date(`${operational.plan.endDate}T00:00:00Z`),
    };
    const weekCount = Math.max(
      1,
      Math.ceil((Math.round((planData.endDate - planData.startDate) / 86400000) + 1) / 7)
    );

    let planId = null;
    if (WRITE) {
      const existing = await prisma.operationalPlan.findUnique({
        where: { charityId_label: { charityId: charity.id, label: planData.label } },
        select: { id: true },
      });
      planId = existing
        ? (
            await prisma.operationalPlan.update({
              where: { id: existing.id },
              data: { ...planData, weekCount },
              select: { id: true },
            })
          ).id
        : (
            await prisma.operationalPlan.create({
              data: { ...planData, weekCount, charityId: charity.id },
              select: { id: true },
            })
          ).id;
      bump(existing ? report.updated : report.created, "خطط");
    } else {
      bump(report.created, "خطط");
    }
    console.log(`الخطة: ${planData.label} — ${weekCount} أسبوعاً\n`);

    for (const initiative of operational.initiatives) {
      // الهدف: بالاسم أولاً ثم بالرمز.
      const objectiveMatch = /\(([^)]+)\)\s*(.*)$/.exec(String(initiative.objectiveLabel || "").trim());
      const objectiveCode = normalise(objectiveMatch?.[1]);
      const objectiveName = normaliseName(objectiveMatch?.[2]);
      const objectiveKey = objectiveIdByName.has(objectiveName)
        ? { by: "name", id: objectiveIdByName.get(objectiveName) }
        : objectiveIdByCode.has(objectiveCode)
          ? { by: "code", id: objectiveIdByCode.get(objectiveCode) }
          : null;
      const objectiveId = objectiveKey?.id ?? null;
      if (initiative.objectiveLabel && !objectiveKey) {
        report.warnings.push(`م${initiative.number} «${initiative.name}»: هدفٌ لم يُطابق — «${objectiveCode}»`);
      }

      /**
       * المؤشرات: الاسم هو المفتاح والرمز احتياط.
       *
       * رموز الكشاف من نسخةٍ أقدم من الدليف فهي مُزاحة، فالمطابقة بالرمز ربطت
       * م٧ بمؤشرٍ خطأ بصمت. ويُعلَن كل موضعٍ اختلف فيه الاسم عن الرمز.
       */
      const labels = [...String(initiative.indicatorLabels || "").matchAll(/\(([^)]+)\)\s*([^(]*)/g)];
      const matched = [];
      for (const [, rawCode, rawName] of labels) {
        const code = normalise(rawCode);
        const name = normaliseName(rawName);
        const byName = indicatorIdByName.has(name);
        const byCode = indicatorIdByCode.has(code);

        if (byName && byCode && indicatorCodeByName.get(name) !== undefined) {
          const nameCode = normalise(indicatorCodeByName.get(name));
          if (nameCode !== code) {
            report.warnings.push(
              `م${initiative.number} «${initiative.name}»: رمز الكشاف «${rawCode}» يخالف رمز الدليل «${indicatorCodeByName.get(name)}» للاسم نفسه — اعتُمد الاسم`
            );
          }
        }

        if (byName) matched.push({ key: name, id: indicatorIdByName.get(name) });
        else if (byCode) {
          matched.push({ key: code, id: indicatorIdByCode.get(code) });
          report.warnings.push(
            `م${initiative.number} «${initiative.name}»: «${rawCode}» طابق بالرمز وحده (الاسم غير مطابق حرفياً)`
          );
        } else {
          report.warnings.push(
            `م${initiative.number} «${initiative.name}»: مؤشرٌ لم يُطابق لا بالاسم ولا بالرمز — «${rawCode}»`
          );
        }
      }
      const indicatorIds = matched.map((m) => m.id).filter(Boolean);

      const data = {
        name: initiative.name,
        description: initiative.description,
        objectiveId,
        durationText: initiative.durationText,
        managerName: initiative.managerName,
        owningDept: initiative.owningDept,
        priority: initiative.priority,
        startDate: initiative.startDate ? new Date(`${initiative.startDate}T00:00:00Z`) : null,
        endDate: initiative.endDate ? new Date(`${initiative.endDate}T00:00:00Z`) : null,
        budget: initiative.budget,
        monthlyBudget: Object.keys(initiative.monthlyBudget || {}).length ? initiative.monthlyBudget : null,
      };

      let initiativeId = null;
      if (WRITE) {
        const existing = await prisma.initiative.findUnique({
          where: { planId_number: { planId, number: initiative.number } },
          select: { id: true },
        });
        initiativeId = existing
          ? (await prisma.initiative.update({ where: { id: existing.id }, data, select: { id: true } })).id
          : (
              await prisma.initiative.create({
                data: { ...data, planId, number: initiative.number },
                select: { id: true },
              })
            ).id;
        bump(existing ? report.updated : report.created, "مبادرات");

        // الربط والخطوات تُستبدل: الملف هو المصدر، فما حُذف منه يُحذف.
        await prisma.initiativeIndicator.deleteMany({ where: { initiativeId } });
        if (indicatorIds.length) {
          await prisma.initiativeIndicator.createMany({
            data: [...new Set(indicatorIds)].map((indicatorId) => ({ initiativeId, indicatorId })),
          });
        }
        await prisma.initiativeStep.deleteMany({ where: { initiativeId } });
        if (initiative.steps.length) {
          await prisma.initiativeStep.createMany({
            data: initiative.steps.map((s, idx) => ({
              initiativeId,
              order: idx + 1,
              phase: s.phase,
              title: s.title,
              evidence: s.evidence,
              owner: s.owner,
              cost: s.cost,
              actualCost: s.actualCost,
              planStartWeek: s.planStartWeek,
              planWeeks: s.planWeeks,
              actualStartWeek: s.actualStartWeek,
              actualWeeks: s.actualWeeks,
              progress: s.progress,
              monthlyCost: s.monthlyCost,
            })),
          });
        }
      } else {
        bump(report.created, "مبادرات");
      }

      report.created["خطوات"] = (report.created["خطوات"] || 0) + initiative.steps.length;
      report.created["روابط مؤشرات"] =
        (report.created["روابط مؤشرات"] || 0) + new Set(matched.map((m) => m.key)).size;
    }

    // ── التقرير ─────────────────────────────────────────────────────────────
    console.log("المُدخَل:");
    for (const [key, value] of Object.entries(report.created)) console.log(`  ${key}: ${value}`);
    if (Object.keys(report.updated).length) {
      console.log("المُحدَّث (كان موجوداً):");
      for (const [key, value] of Object.entries(report.updated)) console.log(`  ${key}: ${value}`);
    }
    if (report.warnings.length) {
      console.log("\nملاحظات:");
      for (const w of [...new Set(report.warnings)]) console.log("  • " + w);
    }
    if (!WRITE) console.log("\nلم يُكتب شيء. أعد التشغيل بـ--write للتنفيذ.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("فشل البذر:", e.message);
  process.exit(1);
});
