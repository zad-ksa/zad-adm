/**
 * قارئُ «دليل الأهداف والمؤشرات» — ورقتاه: «الدليل» و«متابعة الأداء».
 *
 * والقالبُ واحدٌ في ملفات الجمعيات الستّ: ترويسةُ الدليل في الصفّ ٢ وبياناتُه
 * من ٣، وترويسةُ المتابعة في ٣ وبياناتُها من ٤. والبعدُ والهدفُ يُكتبان في أول
 * صفوفهما ويُترك ما تحتهما فارغاً (خلايا مدموجة)، فيُحتفَظ بآخر ما قُرئ.
 *
 * وهو هنا في العُدّة لا في سكربتٍ واحد: ستُّ جمعياتٍ تقرأ القالبَ نفسه،
 * ونسخُه لكلٍّ منها ستُّ نسخٍ من خريطة الأعمدة تتفرّق عند أول تصحيح.
 */
const { loadFile } = require("./xlsx-reader.js");

const txt = (v) => {
  const s = v === undefined || v === null ? "" : String(v).trim();
  return s === "" ? null : s;
};

const num = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/,/g, "").replace("%", ""));
  return Number.isFinite(n) ? n : null;
};

/** حالةُ المؤشر كما تُكتب في ورقة المتابعة. */
function stateOf(value) {
  const s = txt(value);
  if (s === "مؤجل") return "POSTPONED";
  if (s === "لا توجد بيانات") return "NO_DATA";
  return "ACTIVE";
}

/**
 * يقرأ الدليل كاملاً: أبعادٌ ← أهدافٌ ← مؤشراتٌ بنتائجها.
 *
 * `fix(indicator)` تصحيحٌ اختياريٌّ يُنادى لكل مؤشر، ويُرجع قائمةَ ما غيّره —
 * فالتصحيحُ المُقَرّ على ملفٍ بعينه لا يُعمَّم على الستّة.
 */
function extractGuide(file, { fix } = {}) {
  const wb = loadFile(file);
  const { rows } = wb.sheet("الدليل");
  const tracking = wb.sheet("متابعة الأداء").rows;

  // النتائجُ من ورقة المتابعة، مفتاحُها رمزُ المؤشر. والملفُ يحمل الربعين
  // الثالث والرابع وحدهما، فالأولُ والثاني يبقيان فارغين قابلين للإدخال.
  const results = new Map();
  for (let i = 4; i < tracking.length; i++) {
    const r = tracking[i];
    if (!r || !r[0]) continue;
    results.set(String(r[0]).trim(), {
      baseline: num(r[2]),
      annualTarget: num(r[3]),
      Q3: { target: num(r[5]), actual: num(r[6]), state: stateOf(r[8]) },
      Q4: { target: num(r[9]), actual: num(r[10]), state: stateOf(r[12]) },
      yearState: stateOf(r[15]),
    });
  }

  const perspectives = [];
  const byCode = new Map();
  const warnings = [];
  let perspective = null;

  /** «س 3 - 1» ← «س 3» — عائلةُ رمز المؤشر هي هدفُه. */
  const familyOf = (code) => String(code || "").replace(/\s*-\s*\d+\s*$/, "").trim();

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
    }
    if (!perspective) continue;

    /**
     * الهدفُ يُعرَف **بعائلة رمز مؤشره** لا بموضع صفّه.
     *
     * فملفُ أثر القيم يضع اسمَ الهدف «س 3» في الصفّ الذي قبل رمزه: صفٌّ فيه
     * الاسمُ بلا رمزٍ ومعه «س 3 - 1»، وصفٌّ بعده فيه الرمزُ بلا اسم. والقراءةُ
     * بالموضع تُنسب «س 3 - 1» إلى «س 2» وتُنشئ «س 3» بلا اسم — خطأٌ صامتٌ في
     * شجرة الأهداف. والعائلةُ تقول الصوابَ في الحالين، وتُطابق الموضعَ في
     * الملفات السليمة.
     */
    const written = txt(r[1]);
    const family = familyOf(indicatorCode);
    const objectiveCode = family || written;
    if (written && family && written !== family) {
      warnings.push(`الصفّ ${i + 1}: رمزُ الهدف «${written}» وعائلةُ مؤشره «${family}»`);
    }
    if (!objectiveCode) continue;

    let objective = byCode.get(objectiveCode);
    if (!objective) {
      objective = { code: objectiveCode, name: null, description: null, indicators: [] };
      byCode.set(objectiveCode, objective);
      perspective.objectives.push(objective);
      // بادئةُ البعد من رمز أول أهدافه: «س 1» ← «س».
      if (!perspective.prefix) perspective.prefix = objectiveCode.split(/\s+/)[0];
    }
    // الاسمُ والشرحُ من أيِّ صفٍّ في العائلة يحملهما — أولُ ما يُوجد يثبت.
    if (!objective.name) objective.name = txt(r[2]);
    if (!objective.description) objective.description = txt(r[3]);

    const indicator = {
      code: indicatorCode,
      name: indicatorName,
      description: txt(r[6]),
      unit: txt(r[7]),
      formula: txt(r[8]),
      frequency: txt(r[9]),
      polarity: txt(r[10]) === "نقص" ? "DOWN" : "UP",
      cumulative: txt(r[11]) === "تراكمي",
      execOwner: txt(r[12]),
      measureOwner: txt(r[13]),
    };

    const corrections = fix ? fix(indicator) : [];

    const result = results.get(indicatorCode) ?? null;
    objective.indicators.push({
      ...indicator,
      baseline: result?.baseline ?? null,
      results: result
        ? {
            annualTarget: result.annualTarget,
            yearState: result.yearState,
            // المتحققُ السنويُّ لا يُخزَّن: الموقعُ يحسبه من الأرباع بقاعدة
            // التراكمية (`annualActual`)، فقيمةٌ مخزَّنةٌ تُزاحم المحسوبة.
            quarters: { Q1: null, Q2: null, Q3: result.Q3, Q4: result.Q4 },
          }
        : null,
      corrections: corrections.length ? corrections : undefined,
    });
  }

  // هدفٌ بلا اسمٍ في الملف كلِّه: يُقال ولا يُسكت عنه، فاسمُه رمزُه مؤقّتاً.
  for (const o of byCode.values()) {
    if (!o.name) warnings.push(`الهدف «${o.code}» بلا اسمٍ في الملف — وُضع رمزُه مكانَه`);
  }

  return { perspectives, warnings };
}

module.exports = { extractGuide, stateOf, txt, num };
