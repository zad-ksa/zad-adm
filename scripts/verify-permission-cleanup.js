/**
 * يقيس أثر حذف الصلاحيات الثلاث على كل موظف، من قاعدة الإنتاج.
 *
 * ليس اختباراً ناجحاً أو فاشلاً فحسب: عمودُه الأول هو الفرق قبل/بعد لكل شخص،
 * لأن حذف صلاحيةٍ فعلٌ يُقاس على الناس لا على الشيفرة. ومن يفقد شيئاً يُسمّى
 * باسمه هنا، فلا يُكتشف بشكوى.
 *
 * قراءةٌ محضة: لا كتابة ولا معاملة.
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, "..", ".env");
  const m = /^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m.exec(fs.readFileSync(envPath, "utf8"));
  if (!m) throw new Error("DATABASE_URL not found");
  return m[1];
}

let pass = 0;
let fail = 0;
function check(ok, label, detail) {
  if (ok) {
    pass++;
    console.log("  ✓ " + label);
  } else {
    fail++;
    console.log("  ✗ " + label + (detail ? " — " + detail : ""));
  }
}

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  try {
    const src = fs.readFileSync(path.join(__dirname, "..", "src", "lib", "permissions.ts"), "utf8");

    console.log("");
    console.log("① الكتالوج: ما لم يبقَ يُمنح");
    check(
      !/{ id: "view_services_overview"/.test(src),
      "view_services_overview لم تبقَ في قائمة المنح"
    );
    check(!/{ id: "view_all_charities"/.test(src), "view_all_charities لم تبقَ في قائمة المنح");
    check(
      !/{ id: "manage_charity_settings"/.test(src),
      "manage_charity_settings لم تبقَ في قائمة المنح"
    );
    check(/{ id: "manage_services"/.test(src), "manage_services موجودة باسمها الصحيح");
    for (const id of ["view_services_overview", "view_all_charities", "manage_charity_settings"]) {
      check(
        new RegExp(`RETIRED_PERMISSION_IDS[\\s\\S]*"${id}"`).test(src),
        `${id} في قائمة المتقاعدين`
      );
    }

    console.log("");
    console.log("② الصفحة المحذوفة");
    const page = path.join(__dirname, "..", "src", "app", "(dashboard)", "main", "(main)", "charity-settings");
    check(!fs.existsSync(page), "مجلد charity-settings لم يبقَ على القرص");
    check(
      !fs.existsSync(path.join(__dirname, "..", "src", "app", "actions", "globalSettings.ts")),
      "globalSettings.ts لم يبقَ — ولا مستعمل له كان غير الصفحة"
    );

    console.log("");
    console.log("③ manage_services: نفس الأشخاص، باسمٍ جديد");
    const m = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM "Employee" WHERE "isActive" AND 'manage_charity_settings'=ANY(permissions)) AS old,
         (SELECT COUNT(*)::int FROM "Employee" WHERE "isActive" AND 'manage_services'=ANY(permissions)) AS new,
         (SELECT COUNT(*)::int FROM "Employee" WHERE "isActive"
            AND 'manage_charity_settings'=ANY(permissions) AND NOT ('manage_services'=ANY(permissions))) AS lost`
    );
    check(
      m.rows[0].lost === 0 && m.rows[0].new >= m.rows[0].old,
      `كل حامل للقديم يحمل الجديد (${m.rows[0].old} ← ${m.rows[0].new})`,
      JSON.stringify(m.rows[0])
    );

    console.log("");
    console.log("④ تبويب «عرض الخدمات»: من كان يراه ومن سيراه");
    const rows = await pool.query(`
      SELECT e.name, e.role,
             'view_services_overview' = ANY(e.permissions) AS had,
             (SELECT COUNT(*)::int FROM "EmployeeServiceAccess" a WHERE a."employeeId" = e.id) AS direct,
             (SELECT COUNT(*)::int FROM "PermissionBundle" b
                JOIN "EmployeeBundle" eb ON eb."bundleId" = b.id
               WHERE eb."employeeId" = e.id AND array_length(b.services, 1) > 0) AS via_own,
             (SELECT COUNT(*)::int FROM "PermissionBundle" b
                JOIN "RoleBundle" rb ON rb."bundleId" = b.id
                JOIN "RoleDefinition" rd ON rd.id = rb."roleId"
               WHERE rd."key" = e.role AND array_length(b.services, 1) > 0) AS via_role,
             e.role = 'ADMIN' AS is_admin,
             'developer_mode' = ANY(e.permissions) AS is_dev
        FROM "Employee" e
       WHERE e."isActive"
       ORDER BY e.name
    `);

    const gains = [];
    const losses = [];
    for (const r of rows.rows) {
      const willSee = r.is_admin || r.is_dev || r.direct + r.via_own + r.via_role > 0;
      const usedTo = r.had || r.is_admin || r.is_dev;
      if (willSee && !usedTo) gains.push(r.name);
      if (!willSee && usedTo) losses.push(`${r.name} [${r.role}]`);
    }

    console.log(`  من كان يراه: ${rows.rows.filter((r) => r.had || r.is_admin || r.is_dev).length}`);
    console.log(
      `  من سيراه: ${rows.rows.filter((r) => r.is_admin || r.is_dev || r.direct + r.via_own + r.via_role > 0).length}`
    );
    if (gains.length) console.log("  كسبه: " + gains.join("، "));
    if (losses.length) {
      console.log("  ⚠ سيفقده حتى يُمنح خدمةً أو مجموعةً فيها خدمات:");
      for (const l of losses) console.log("      · " + l);
    } else {
      console.log("  لا أحد يفقده");
    }

    console.log("");
    console.log("⑤ الوصول الشامل للجمعيات: الأثر");
    const wide = await pool.query(`
      SELECT e.name, e.role, 'developer_mode' = ANY(e.permissions) AS is_dev,
             (SELECT COUNT(*)::int FROM "EmployeeCharity" ec WHERE ec."employeeId" = e.id) AS assigned,
             (SELECT COUNT(*)::int FROM "Charity") AS total
        FROM "Employee" e
       WHERE e."isActive" AND 'view_all_charities' = ANY(e.permissions)
       ORDER BY e.name
    `);
    for (const r of wide.rows) {
      const keeps = r.is_dev ? "يبقى شاملاً (مطوّر)" : `يصير مقيَّداً بـ${r.assigned} من ${r.total}`;
      console.log(`  · ${r.name} [${r.role}] — ${keeps}`);
    }
    const reallyAffected = wide.rows.filter((r) => !r.is_dev && r.assigned < r.total);
    console.log(
      reallyAffected.length
        ? `  الأثر الفعلي على ${reallyAffected.length}: ${reallyAffected
            .map((r) => `${r.name} (ينقص ${r.total - r.assigned})`)
            .join("، ")}`
        : "  لا أثر فعلي على أحد"
    );

    console.log("");
    console.log(`${pass}/${pass + fail} من فحوص البنية ناجحة`);
    if (fail) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
