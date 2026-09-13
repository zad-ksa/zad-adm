/**
 * يضيف مجموعات الصلاحيات: PermissionBundle وربطَيها بالموظف وبالمسمى.
 *
 * إضافيٌّ بالكامل، ولهذا يُشغَّل قبل الرفع بلا خطر: جداولٌ لا تقرأها الشيفرة
 * المنشورة الآن لا تغيّر شيئاً عندها. والعكس هو ما يحتاجه الحذف، وخلطُ
 * الترتيبين هو ما أسقط صفحات الموارد البشرية مرّةً من قبل.
 *
 * والجداول تُخلَق فارغة، وهذا بعينه ما يجعل تشغيله بلا أثر: لا موظف يكسب
 * صلاحيةً ولا يفقدها حتى يُنشئ أحدٌ مجموعةً ويمنحها صراحةً.
 *
 * يعيد التشغيل بلا تغيير.
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

const DDL = `
CREATE TABLE IF NOT EXISTS "PermissionBundle" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "services"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PermissionBundle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PermissionBundle_name_key"
  ON "PermissionBundle"("name");

CREATE TABLE IF NOT EXISTS "EmployeeBundle" (
  "employeeId" TEXT NOT NULL,
  "bundleId"   TEXT NOT NULL,
  "grantedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeBundle_pkey" PRIMARY KEY ("employeeId", "bundleId")
);

CREATE TABLE IF NOT EXISTS "RoleBundle" (
  "roleId"   TEXT NOT NULL,
  "bundleId" TEXT NOT NULL,
  CONSTRAINT "RoleBundle_pkey" PRIMARY KEY ("roleId", "bundleId")
);

CREATE INDEX IF NOT EXISTS "EmployeeBundle_bundleId_idx" ON "EmployeeBundle"("bundleId");
CREATE INDEX IF NOT EXISTS "RoleBundle_bundleId_idx" ON "RoleBundle"("bundleId");

-- لجدولٍ أُنشئ قبل إضافة الخدمات: CREATE TABLE IF NOT EXISTS لا يضيف عموداً
-- إلى جدولٍ قائم، فالسطر أعلاه وحده لا يكفي لقاعدةٍ سبقت هذه الإضافة.
ALTER TABLE "PermissionBundle"
  ADD COLUMN IF NOT EXISTS "services" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
`;

// المفتاح المركّب يمنع تكرار المنح بلا حاجة إلى NULLS NOT DISTINCT: لا عمود
// فيه يقبل NULL، فلا تنشأ هنا حالة «NULL لا يساوي NULL» التي احتاجها جدول
// صلاحيات الخدمات.
const KEYS = [
  `ALTER TABLE "EmployeeBundle" DROP CONSTRAINT IF EXISTS "EmployeeBundle_employeeId_fkey"`,
  `ALTER TABLE "EmployeeBundle" ADD CONSTRAINT "EmployeeBundle_employeeId_fkey"
     FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "EmployeeBundle" DROP CONSTRAINT IF EXISTS "EmployeeBundle_bundleId_fkey"`,
  `ALTER TABLE "EmployeeBundle" ADD CONSTRAINT "EmployeeBundle_bundleId_fkey"
     FOREIGN KEY ("bundleId") REFERENCES "PermissionBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "RoleBundle" DROP CONSTRAINT IF EXISTS "RoleBundle_roleId_fkey"`,
  `ALTER TABLE "RoleBundle" ADD CONSTRAINT "RoleBundle_roleId_fkey"
     FOREIGN KEY ("roleId") REFERENCES "RoleDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "RoleBundle" DROP CONSTRAINT IF EXISTS "RoleBundle_bundleId_fkey"`,
  `ALTER TABLE "RoleBundle" ADD CONSTRAINT "RoleBundle_bundleId_fkey"
     FOREIGN KEY ("bundleId") REFERENCES "PermissionBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
];

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  try {
    await pool.query("BEGIN");
    await pool.query(DDL);
    for (const sql of KEYS) await pool.query(sql);
    await pool.query("COMMIT");
    console.log("✓ الجداول والمفاتيح والفهارس");

    const counts = await pool.query(
      `SELECT (SELECT COUNT(*)::int FROM "PermissionBundle") AS bundles,
              (SELECT COUNT(*)::int FROM "EmployeeBundle")   AS employee_links,
              (SELECT COUNT(*)::int FROM "RoleBundle")       AS role_links`
    );
    const c = counts.rows[0];
    console.log(
      `المجموعات: ${c.bundles} · منح الموظفين: ${c.employee_links} · ربط المسميات: ${c.role_links}`
    );
    console.log("(أصفارٌ كلها تعني أن لا أحد كسب صلاحيةً ولا فقدها بهذا التشغيل)");
  } catch (e) {
    await pool.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
