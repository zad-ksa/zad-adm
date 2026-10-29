/**
 * تحويل الخطط التشغيلية الخمس إلى JSON — لتُراجَع بالعين قبل إدخالها.
 *
 *     node scripts/extract-operational-plans.js
 *
 * والقالب واحدٌ في الخمسة (الغلاف · لوحة المعلومات · كشاف المبادرات · ورقةٌ لكل
 * مبادرة)، **لكنّ مواضعَه تختلف**: فترةُ الخطة ثلاثةُ أشهرٍ أو أربعةٌ أو خمسة،
 * فأعمدةُ الأشهر في الكشاف تنزاح، وكتلةُ توزيع تكلفة المهام تقع في العمود ٤١
 * في ورقةٍ وفي ٧١ في أخرى وتغيب في ثالثة. ومستخرِجُ المعاقد يقرأ بأرقامٍ
 * ثابتة، فلو شُغّل على هذه الملفات لأسقط مبادراتٍ وقرأ أشهراً ليست لها.
 *
 * فالقراءةُ هنا **بالعناوين لا بالأرقام**: صفُّ ترويسة الكشاف يُبحَث عنه،
 * وأعمدةُ الأشهر تُعرَف بأسمائها، وأسبوعُ الخطة الأول وعددُ أسابيعها يُقرآن من
 * تقويم الجانت في ورقة المبادرة — وهو يحمل تاريخ كل أسبوعٍ ورقمَه.
 *
 * **ودليلُ الأهداف والمؤشرات ليس في هذه الملفات**، وإنما في ملفٍّ آخر لم يُسلَّم
 * لهذه الجمعيات. لكنّ كشاف المبادرات يحمل في قوائمه المنسدلة **كلَّ** الأهداف
 * والمؤشرات برموزها وأسمائها — وهي ما تُربط به المبادرات. فيُبنى منها هيكلُ
 * الدليل (رمزٌ واسم) ليبقى عمودا «الهدف المرتبط» و«المؤشرات المرتبطة» في
 * الموقع كما هما في الملف. وما يبقى ناقصاً: وحدةُ القياس والمعادلة والدورية
 * والتراكمية والمستهدفات — تُستكمل من ملف الدليل متى سُلِّم، ويُحدِّث الصفوفَ
 * نفسَها لأن المطابقة بالرمز.
 */
const fs = require("fs");
const path = require("path");
const { loadFile } = require("./lib/xlsx-reader.js");

const SRC = path.join(__dirname, "..", "docs");
const DEST = path.join(__dirname, "..", "prisma", "seed-data");

/** الجمعياتُ الخمس: اسمُها في القاعدة، وما يُطابق ملفَّها، وملفُ ناتجها. */
const PLANS = [
  { charity: "الرأفة الإنسانية", match: "الرأفة", out: "raafa" },
  { charity: "رواء سقيا الماء", match: "رواء", out: "rawa" },
  { charity: "ضماد الإسعافية", match: "ضماد", out: "damad" },
  { charity: "مكين التعليمية", match: "مكين", out: "makeen" },
  { charity: "أثر القيم", match: "أثر القيم", out: "athar" },
];

/** أسماءُ الأبعاد ببادئاتها — كما في دليل المعاقد. */
const PERSPECTIVES = [
  { prefix: "س", name: "المستفيدون" },
  { prefix: "ص", name: "أصحاب المصلحة" },
  { prefix: "م", name: "البعد المالي" },
  { prefix: "ل", name: "العمليات الداخلية" },
  { prefix: "ت", name: "التعلم والنمو" },
];

const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const txt = (v) => {
  const s = v === undefined || v === null ? "" : String(v).trim();
  return s === "" ? null : s;
};
const num = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/,/g, "").replace("%", ""));
  return Number.isFinite(n) ? n : null;
};

/** تاريخ Excel رقمٌ تسلسلي: ٤٦٢٣٥ = ١ أغسطس ٢٠٢٦. */
function excelDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10);
}

/** تسويةُ الهمزات للمطابقة — أسماءُ الملفات تُكتب بصورتين لحرفٍ واحد. */
const fold = (s) =>
  String(s)
    .normalize("NFC")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    // أسماءُ الملفات المنزَّلة تُستبدل فيها المسافاتُ شُرَطاً سفلية — فملفُّ
    // أثر القيم «…-_أثر_القيم.xlsx».
    .replace(/[_\s]+/g, " ");

function findSource(match) {
  const wanted = fold(match);
  const file = fs
    .readdirSync(SRC)
    .find((f) => f.endsWith(".xlsx") && fold(f).includes(wanted) && fold(f).includes(fold("تشغيل")));
  if (!file) {
    console.error(`لا ملفَّ خطةٍ يُطابق «${match}» في docs/`);
    console.error("وهذا السكربت تحويلٌ يُشغَّل عند تغيّر الملفات؛ والناتج المُلزَم في prisma/seed-data.");
    process.exit(1);
  }
  return path.join(SRC, file);
}

/** رمزُ الهدف أو المؤشر بصيغة الدليل: «س1» ← «س 1»، و«س1-1» ← «س 1 - 1». */
function canonicalCode(raw) {
  const m = /^\s*([؀-ۿ]+)\s*(\d+)\s*(?:[-–—]\s*(\d+))?\s*$/.exec(String(raw || ""));
  if (!m) return txt(raw);
  return m[3] ? `${m[1]} ${m[2]} - ${m[3]}` : `${m[1]} ${m[2]}`;
}

/** «(س1-1) عدد البرامج…» ← { code, name }. */
function splitLabel(label) {
  const m = /^\s*\(([^)]+)\)\s*(.*)$/.exec(String(label || "").trim());
  if (!m) return null;
  return { code: canonicalCode(m[1]), name: txt(m[2]) };
}

/** أولُ صفٍّ تحتوي إحدى خلاياه النصَّ المطلوب. */
function rowOf(rows, needle, limit = 30) {
  for (let i = 0; i < Math.min(rows.length, limit); i++) {
    if ((rows[i] || []).some((c) => String(c ?? "").trim() === needle)) return i;
  }
  return -1;
}

/** أعمدةُ الأشهر في صفِّ ترويسة: {col, key} بترتيبها، والسنةُ من الخطة. */
function monthColumns(headerRow, year) {
  const out = [];
  (headerRow || []).forEach((cell, col) => {
    const t = String(cell ?? "").trim();
    const idx = MONTHS.findIndex((m) => t === m || t === `${m} ${year}`);
    if (idx >= 0) out.push({ col, key: `${year}-${String(idx + 1).padStart(2, "0")}` });
  });
  return out;
}

/**
 * تقويمُ الجانت في ورقة المبادرة: تاريخُ الأسبوع الأول وعددُ الأسابيع.
 *
 * ولا يُحسَب من أسماء الأشهر: شهرٌ أولُ أسبوعٍ فيه قد يبدأ قبل غرّته أو بعدها،
 * والملفات الثلاثة تختلف في ذلك (١ أغسطس، و١ سبتمبر، و٣ أكتوبر). والتقويمُ
 * يقول التاريخ صريحاً، فلا يُخمَّن.
 */
function ganttWindow(wb) {
  const sheet = wb.sheets.find((s) => /^م\d\d /.test(s.name));
  if (!sheet) return null;
  const { rows } = wb.sheet(sheet.name);

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = rows[i] || [];
    const serials = [];
    for (let j = 10; j < r.length; j++) {
      const n = num(r[j]);
      if (n !== null && n > 40000 && n < 60000) serials.push({ col: j, n });
    }
    // صفُّ التقويم: تواريخُ أسابيعَ متتالية بفاصل سبعة أيام.
    if (serials.length >= 8 && serials[1].n - serials[0].n === 7) {
      return {
        startDate: excelDate(serials[0].n),
        endDate: excelDate(serials[serials.length - 1].n + 6),
        weekCount: serials.length,
      };
    }
  }
  return null;
}

/** قوائمُ الكشاف المنسدلة: الأهدافُ والمؤشرات برموزها. */
function validationLists(rows) {
  const find = (label) => {
    for (let i = 0; i < Math.min(rows.length, 8); i++) {
      const r = rows[i] || [];
      for (let j = 0; j < r.length; j++) {
        if (String(r[j] ?? "").trim() === label) return { row: i, col: j };
      }
    }
    return null;
  };

  const read = (label) => {
    const at = find(label);
    if (!at) return [];
    const out = [];
    for (let i = at.row + 1; i < rows.length; i++) {
      const t = txt((rows[i] || [])[at.col]);
      if (!t) {
        if (out.length) break;
        continue;
      }
      out.push(t);
    }
    return out;
  };

  return {
    objectives: read("الأهداف الاستراتيجية").map(splitLabel).filter(Boolean),
    indicators: read("مؤشرات الأداء").map(splitLabel).filter(Boolean),
    departments: read("الإدارات"),
  };
}

/** يبني هيكل الدليل من القوائم: أبعادٌ ← أهدافٌ ← مؤشرات. */
function buildGuide(lists, warnings) {
  const byPrefix = new Map();
  const prefixOf = (code) => String(code || "").trim().split(/\s+/)[0];

  for (const objective of lists.objectives) {
    const prefix = prefixOf(objective.code);
    const known = PERSPECTIVES.find((p) => p.prefix === prefix);
    if (!known) {
      warnings.push(`بادئةٌ لا بُعدَ لها: «${prefix}» في «${objective.code}»`);
      continue;
    }
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, { name: known.name, prefix, objectives: [] });
    byPrefix.get(prefix).objectives.push({
      code: objective.code,
      name: objective.name,
      description: null,
      indicators: [],
    });
  }

  const objectiveByCode = new Map();
  for (const p of byPrefix.values()) for (const o of p.objectives) objectiveByCode.set(o.code, o);

  for (const indicator of lists.indicators) {
    // رمزُ المؤشر «س 1 - 1» ينتمي إلى الهدف «س 1».
    const parent = String(indicator.code).replace(/\s*-\s*\d+\s*$/, "");
    const objective = objectiveByCode.get(parent);
    if (!objective) {
      warnings.push(`مؤشرٌ بلا هدف: «${indicator.code}» (الهدف المنتظر «${parent}»)`);
      continue;
    }
    objective.indicators.push({
      code: indicator.code,
      name: indicator.name,
      description: null,
      unit: null,
      formula: null,
      frequency: null,
      // لا تُثبَّت في الهيكل: قطبيةُ المؤشر وتراكميتُه في دليل الأهداف، وكتابةُ
      // «UP» و«غير تراكمي» هنا تخميناً تُقرأ في الموقع كأنها مُقرَّرة.
      polarity: null,
      cumulative: null,
      execOwner: null,
      measureOwner: null,
      baseline: null,
      results: null,
    });
  }

  // ترتيبُ الأبعاد ترتيبَ الدليل لا ترتيبَ ورودها.
  return PERSPECTIVES.map((p) => byPrefix.get(p.prefix)).filter(Boolean);
}

function extract(plan) {
  const file = findSource(plan.match);
  const wb = loadFile(file);
  const warnings = [];

  const window = ganttWindow(wb);
  if (!window) {
    console.error(`${plan.charity}: لم يُقرأ تقويم الجانت`);
    process.exit(1);
  }
  const year = Number(window.startDate.slice(0, 4));

  const index = wb.sheet("كشاف المبادرات").rows;
  const headerRow = rowOf(index, "اسم المبادرة", 15);
  if (headerRow < 0) {
    console.error(`${plan.charity}: لم يُعرف صفُّ ترويسة الكشاف`);
    process.exit(1);
  }
  const months = monthColumns(index[headerRow], year);
  if (months.length === 0) {
    console.error(`${plan.charity}: لم تُعرف أعمدةُ الأشهر في الكشاف`);
    process.exit(1);
  }

  /**
   * آخرُ الخطة آخرُ يومٍ من آخر أشهرها.
   *
   * وأسبوعُ التقويم الأخير يتجاوز الشهرَ أحياناً (٢٩ ديسمبر + ٦ = ٤ يناير)،
   * فأخذُ آخرِه يُدخل الخطةَ شهراً لا مبادرةَ فيه ويُسمّيها «— يناير».
   */
  const lastMonth = months[months.length - 1].key;
  const endDate = new Date(Date.UTC(Number(lastMonth.slice(0, 4)), Number(lastMonth.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);

  const initiatives = [];
  for (let i = headerRow + 1; i < index.length; i++) {
    const r = index[i];
    const name = txt(r && r[1]);
    // صفُّ «الإجمــالي» في ذيل الكشاف ليس مبادرة، وموازنتُه مجموعُ ما قبله —
    // فقراءتُه صفّاً تُضاعف موازنة الخطة كلَّها.
    if (name && /الإجمال|المجموع/.test(name.replace(/ـ/g, ""))) break;
    if (!name) {
      // صفٌّ فارغٌ بعد أن بدأت البيانات هو آخرُها — والكشاف يمتدّ ألفَ صفٍّ
      // في ورقتين، فلا يُقرأ إلى آخره.
      if (initiatives.length) break;
      continue;
    }

    const monthlyBudget = {};
    for (const m of months) {
      const value = num(r[m.col]);
      if (value !== null && value !== 0) monthlyBudget[m.key] = value;
    }

    initiatives.push({
      number: num(r[0]) ?? initiatives.length + 1,
      name,
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
      monthlyBudget,
      steps: [],
    });
  }

  // خطواتُ كل مبادرة من ورقتها.
  for (const sheet of wb.sheets) {
    const match = /^م(\d\d)\b/.exec(sheet.name);
    if (!match) continue;
    const number = Number(match[1]);
    const initiative = initiatives.find((x) => x.number === number);
    if (!initiative) {
      warnings.push(`ورقةٌ بلا صفٍّ في الكشاف: «${sheet.name}»`);
      continue;
    }

    const { rows } = wb.sheet(sheet.name);
    const header = rowOf(rows, "خطوات التنفيذ");
    if (header < 0) {
      warnings.push(`«${sheet.name}»: لم تُوجد ترويسة «خطوات التنفيذ»`);
      continue;
    }

    // كتلةُ توزيع تكلفة المهام على الأشهر — موضعُها يختلف وقد تغيب.
    let stepMonths = [];
    for (let i = header - 2; i <= header + 1 && i >= 0; i++) {
      const found = monthColumns(rows[i], year).filter((m) => m.col > 20);
      if (found.length) {
        stepMonths = found;
        break;
      }
    }

    for (let i = header + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      if (!txt(r[2])) {
        if (initiative.steps.length) break;
        continue;
      }
      const monthlyCost = {};
      for (const m of stepMonths) {
        const value = num(r[m.col]);
        if (value !== null && value !== 0) monthlyCost[m.key] = value;
      }
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

  const empty = initiatives.filter((i) => i.steps.length === 0);
  if (empty.length) warnings.push(`مبادراتٌ بلا خطوات: ${empty.map((i) => "م" + i.number).join("، ")}`);

  const lists = validationLists(index);

  /**
   * ما تُشير إليه المبادرات وليس في القوائم المنسدلة يُضمّ إليها.
   *
   * ومكين مثالُه: قائمةُ أهدافها تُسقط «م 2»، ومبادرتُها «توازن» تُشير إليه
   * باسمه كاملاً وإلى مؤشره. فالاسمُ في الملف، وإسقاطُه يقطع رابطاً قائماً.
   */
  for (const initiative of initiatives) {
    const objective = splitLabel(initiative.objectiveLabel);
    if (objective && objective.code && !lists.objectives.some((o) => o.code === objective.code)) {
      lists.objectives.push(objective);
      warnings.push(`هدفٌ من صفّ م${initiative.number} وليس في قائمة الكشاف: «${objective.code}»`);
    }
    for (const [, rawCode, rawName] of String(initiative.indicatorLabels || "").matchAll(/\(([^)]+)\)\s*([^(]*)/g)) {
      const code = canonicalCode(rawCode);
      if (code && !lists.indicators.some((x) => x.code === code)) {
        lists.indicators.push({ code, name: txt(rawName) });
        warnings.push(`مؤشرٌ من صفّ م${initiative.number} وليس في قائمة الكشاف: «${code}»`);
      }
    }
  }

  const perspectives = buildGuide(lists, warnings);

  const label = `${MONTHS[Number(window.startDate.slice(5, 7)) - 1]} ${year} — ${MONTHS[Number(endDate.slice(5, 7)) - 1]} ${year}`;

  return {
    file: path.basename(file),
    warnings,
    guide: { charity: plan.charity, year, skeleton: true, perspectives },
    operational: {
      charity: plan.charity,
      plan: { label, startDate: window.startDate, endDate },
      initiatives,
    },
    window,
    lists,
  };
}

// ── التنفيذ ─────────────────────────────────────────────────────────────────

fs.mkdirSync(DEST, { recursive: true });

for (const plan of PLANS) {
  const result = extract(plan);
  fs.writeFileSync(path.join(DEST, `${plan.out}-strategy.json`), JSON.stringify(result.guide, null, 2) + "\n");
  fs.writeFileSync(path.join(DEST, `${plan.out}-operational.json`), JSON.stringify(result.operational, null, 2) + "\n");

  const steps = result.operational.initiatives.reduce((n, i) => n + i.steps.length, 0);
  const budget = result.operational.initiatives.reduce((n, i) => n + (i.budget || 0), 0);
  const objectives = result.guide.perspectives.reduce((n, p) => n + p.objectives.length, 0);
  const indicators = result.guide.perspectives.reduce(
    (n, p) => n + p.objectives.reduce((m, o) => m + o.indicators.length, 0),
    0
  );

  console.log(`\n### ${plan.charity}  —  ${result.file}`);
  console.log(`  الخطة: ${result.operational.plan.label} · ${result.operational.plan.startDate} → ${result.operational.plan.endDate} · ${result.window.weekCount} أسبوعاً`);
  console.log(`  مبادرات: ${result.operational.initiatives.length} · خطوات: ${steps} · موازنة: ${budget.toLocaleString("en-US")}`);
  console.log(`  هيكلُ الدليل: ${result.guide.perspectives.length} أبعاد · ${objectives} أهداف · ${indicators} مؤشرات`);
  if (result.warnings.length) {
    console.log("  ملاحظات:");
    for (const w of result.warnings) console.log("    • " + w);
  }
}

console.log(`\nكُتب إلى prisma/seed-data/ — عشرةُ ملفات.`);
