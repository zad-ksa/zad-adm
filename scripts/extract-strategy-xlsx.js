/**
 * تحويل ملفَّي المعاقد إلى JSON — مرّةً واحدة، ليُراجَع الناتج بالعين قبل
 * إدخاله. ولا تُضاف حزمة xlsx إلى المشروع: القارئ هنا بلا اعتماديات.
 */
const fs = require("fs");
const path = require("path");
const { loadFile } = require("./lib/xlsx-reader.js");

const DEST = path.join(__dirname, "..", "prisma", "seed-data");
const SRC = path.join(__dirname, "..", "docs");

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

/** تاريخ Excel رقمٌ تسلسلي: ٤٦٢٦٣ = ٢٢ سبتمبر ٢٠٢٦. */
function excelDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = Math.round((n - 25569) * 86400000);
  return new Date(ms).toISOString().slice(0, 10);
}

const txt = (v) => {
  const s = v === undefined || v === null ? "" : String(v).trim();
  return s === "" ? null : s;
};
const num = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/,/g, "").replace("%", ""));
  return Number.isFinite(n) ? n : null;
};

// ── الدليل ──────────────────────────────────────────────────────────────────

function extractGuide(file) {
  const wb = loadFile(file);
  const { rows } = wb.sheet("الدليل");
  const tracking = wb.sheet("متابعة الأداء").rows;

  // النتائج من ورقة المتابعة، مفتاحها رمز المؤشر.
  const results = new Map();
  for (let i = 4; i < tracking.length; i++) {
    const r = tracking[i];
    if (!r || !r[0]) continue;
    results.set(String(r[0]).trim(), {
      baseline: num(r[2]),
      annualTarget: num(r[3]),
      // الملف يحمل الربعين الثالث والرابع وحدهما؛ والأول والثاني يبقيان فارغين.
      Q3: { target: num(r[5]), actual: num(r[6]), state: stateOf(r[8]) },
      Q4: { target: num(r[9]), actual: num(r[10]), state: stateOf(r[12]) },
      yearState: stateOf(r[15]),
    });
  }

  const perspectives = [];
  let perspective = null;
  let objective = null;

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const indicatorCode = txt(r[4]);
    const indicatorName = txt(r[5]);
    if (!indicatorName) continue;

    const perspectiveName = txt(r[0]);
    if (perspectiveName) {
      perspective = { name: perspectiveName, prefix: null, objectives: [] };
      perspectives.push(perspective);
      objective = null;
    }

    const objectiveCode = txt(r[1]);
    if (objectiveCode) {
      objective = {
        code: objectiveCode,
        name: txt(r[2]),
        description: txt(r[3]),
        indicators: [],
      };
      perspective.objectives.push(objective);
      // بادئة البعد من رمز أول أهدافه: «س 1» ← «س».
      if (!perspective.prefix) perspective.prefix = objectiveCode.split(/\s+/)[0];
    }

    if (!objective) continue;

    const unit = txt(r[7]);
    let cumulative = txt(r[11]) === "تراكمي";
    let formula = txt(r[8]);

    // تصحيحٌ مُقَرّ: س ٤-٢ معلَّمٌ «تراكمي» سهواً ووحدته «مستفيدة» وأشباهه
    // الأربعة «غير تراكمي»، وخانة معادلته منسوخةٌ من مؤشر رضا.
    const corrections = [];
    if (indicatorCode === "س 4 - 2" && cumulative) {
      cumulative = false;
      corrections.push("التراكمية: تراكمي ← غير تراكمي");
      if (formula && formula.includes("رضا")) {
        formula = "حساب إجمالي عدد المستفيدات";
        corrections.push("المعادلة: منسوخةٌ من مؤشر رضا ← حساب إجمالي عدد المستفيدات");
      }
    }

    const result = results.get(indicatorCode) ?? null;

    objective.indicators.push({
      code: indicatorCode,
      name: indicatorName,
      description: txt(r[6]),
      unit,
      formula,
      frequency: txt(r[9]),
      polarity: txt(r[10]) === "نقص" ? "DOWN" : "UP",
      cumulative,
      execOwner: txt(r[12]),
      measureOwner: txt(r[13]),
      baseline: result?.baseline ?? null,
      results: result
        ? {
            annualTarget: result.annualTarget,
            yearState: result.yearState,
            quarters: { Q1: null, Q2: null, Q3: result.Q3, Q4: result.Q4 },
          }
        : null,
      corrections: corrections.length ? corrections : undefined,
    });
  }

  return perspectives;
}

function stateOf(value) {
  const s = txt(value);
  if (s === "مؤجل") return "POSTPONED";
  if (s === "لا توجد بيانات") return "NO_DATA";
  return "ACTIVE";
}

// ── الخطة التشغيلية ─────────────────────────────────────────────────────────

function extractOperational(file) {
  const wb = loadFile(file);
  const index = wb.sheet("كشاف المبادرات").rows;

  const initiatives = [];
  for (let i = 7; i <= 40; i++) {
    const r = index[i];
    if (!r || !txt(r[1])) continue;
    initiatives.push({
      number: num(r[0]),
      name: txt(r[1]),
      description: txt(r[2]),
      objectiveLabel: txt(r[3]),
      indicatorLabels: txt(r[4]),
      durationText: txt(r[5]),
      managerName: txt(r[6]),
      owningDept: txt(r[7]),
      priority: txt(r[8]),
      startDate: excelDate(r[9]),
      endDate: excelDate(r[10]),
      budget: num(r[15]),
      monthlyBudget: {},
      steps: [],
    });
  }

  // أعمدة الأشهر في الكشاف: من ١٦ إلى ٢٠ (أغسطس ← ديسمبر).
  const monthKeys = ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];
  initiatives.forEach((initiative, idx) => {
    const r = index[7 + idx];
    monthKeys.forEach((key, m) => {
      const value = num(r[16 + m]);
      if (value !== null && value !== 0) initiative.monthlyBudget[key] = value;
    });
  });

  // خطوات كل مبادرة من ورقتها. والترويسة لا تقع في صفٍّ واحد في كل الأوراق،
  // فتُطلب بالبحث عن «خطوات التنفيذ» — وقراءةٌ برقمٍ ثابت تُسقط الخطوة الأولى
  // من خمس أوراق، ومنها خطوتان منجَزتان.
  for (const sheet of wb.sheets) {
    const match = /^م(\d\d) /.exec(sheet.name);
    if (!match) continue;
    const number = Number(match[1]);
    const initiative = initiatives.find((x) => x.number === number);
    if (!initiative) continue;

    const { rows } = wb.sheet(sheet.name);
    let header = -1;
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      if (rows[i] && rows[i].some((c) => String(c || "").trim() === "خطوات التنفيذ")) {
        header = i;
        break;
      }
    }
    if (header < 0) continue;
    initiative.headerRow = header;

    for (let i = header + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      if (!txt(r[2])) {
        if (initiative.steps.length) break;
        continue;
      }
      const monthlyCost = {};
      monthKeys.forEach((key, m) => {
        const value = num(r[41 + m]);
        if (value !== null && value !== 0) monthlyCost[key] = value;
      });
      initiative.steps.push({
        order: num(r[0]) ?? initiative.steps.length + 1,
        phase: txt(r[1]),
        title: txt(r[2]),
        evidence: txt(r[3]),
        owner: txt(r[4]),
        cost: num(r[5]),
        actualCost: num(r[6]),
        planStartWeek: num(r[7]),
        planWeeks: num(r[8]),
        actualStartWeek: num(r[9]) || null,
        actualWeeks: num(r[10]) || null,
        progress: Math.round((num(r[11]) ?? 0) * 100),
        monthlyCost: Object.keys(monthlyCost).length ? monthlyCost : null,
      });
    }
  }

  return {
    plan: { label: "أغسطس 2026 — ديسمبر 2026", startDate: "2026-08-03", endDate: "2026-12-31" },
    initiatives,
  };
}

// ── التنفيذ ─────────────────────────────────────────────────────────────────

const guide = extractGuide(path.join(SRC, "دليل الأهداف والمؤشرات - المعاقد التعليمية.xlsx"));
const operational = extractOperational(path.join(SRC, "الخطة_التشغيلية_لجمعية_المعاقد_التعليمية_2026م.xlsx"));

fs.mkdirSync(DEST, { recursive: true });
fs.writeFileSync(
  path.join(DEST, "maaqid-strategy.json"),
  JSON.stringify({ charity: "المعاقد التعليمية", year: 2026, perspectives: guide }, null, 2)
);
fs.writeFileSync(
  path.join(DEST, "maaqid-operational.json"),
  JSON.stringify({ charity: "المعاقد التعليمية", ...operational }, null, 2)
);

const objectives = guide.reduce((n, p) => n + p.objectives.length, 0);
const indicators = guide.reduce((n, p) => n + p.objectives.reduce((m, o) => m + o.indicators.length, 0), 0);
const steps = operational.initiatives.reduce((n, i) => n + i.steps.length, 0);
const corrections = guide.flatMap((p) =>
  p.objectives.flatMap((o) => o.indicators.filter((i) => i.corrections).map((i) => ({ code: i.code, list: i.corrections })))
);

console.log("الدليل:");
console.log("  أبعاد:", guide.length, guide.map((p) => `${p.prefix}=${p.name}`).join("، "));
console.log("  أهداف:", objectives, " مؤشرات:", indicators);
console.log("  تراكمية:", guide.flatMap((p) => p.objectives.flatMap((o) => o.indicators)).filter((i) => i.cumulative).length);
console.log("\nالخطة التشغيلية:");
console.log("  مبادرات:", operational.initiatives.length, " خطوات:", steps);
console.log("  موازنة:", operational.initiatives.reduce((a, i) => a + (i.budget || 0), 0).toLocaleString("en-US"));
console.log("  أوراقٌ ترويستها في صفٍّ مختلف:", operational.initiatives.filter((i) => i.headerRow !== 12).map((i) => `م${i.number}(${i.headerRow})`).join("، ") || "لا شيء");
console.log("\nتصحيحات مُقَرّة:");
corrections.forEach((c) => console.log("  " + c.code + ": " + c.list.join(" · ")));
console.log("\nكُتب إلى prisma/seed-data/");
