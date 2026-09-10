/**
 * Moves the day attendance starts counting from to today.
 *
 * WHY THIS IS THE WAY TO CLEAR ABSENCES: an absence is not a row. Nothing ever
 * writes an ABSENT record — a person who does not come simply leaves no record
 * — so "who was absent" is derived by the report as:
 *
 *     elapsed working days, on or after attendanceOpenedAt, with no record,
 *     minus holidays and that employee's leave.
 *
 * There is therefore nothing to delete. The only honest way to stop a past day
 * being counted is to say the system was not counting yet on that day, which is
 * exactly what this changes. It invents no attendance and erases no record.
 *
 * The gate stays open; only the date it counts from moves.
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, "..", ".env");
  const m = /^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m.exec(fs.readFileSync(envPath, "utf8"));
  if (!m) throw new Error("DATABASE_URL not found");
  return m[1];
}

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const before = await prisma.zadAttendanceSettings.findUnique({ where: { id: "singleton" } });
    if (!before) throw new Error("لا يوجد صف إعدادات");
    if (!before.attendanceOpenedAt) {
      console.log("النظام مغلق أصلاً — لا غياب يُحتسب على أحد. لا تغيير.");
      return;
    }

    // Records are presence, not absence. If any exist, say so rather than
    // quietly changing the window they are read in.
    const records = await prisma.zadAttendanceRecord.count();

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    await prisma.zadAttendanceSettings.update({
      where: { id: "singleton" },
      data: { attendanceOpenedAt: today },
    });

    console.log(`كان يُحتسب من: ${before.attendanceOpenedAt.toISOString().slice(0, 10)}`);
    console.log(`صار يُحتسب من: ${today.toISOString().slice(0, 10)} (اليوم)`);
    console.log(`سجلات الحضور القائمة: ${records} — لم يُحذف منها شيء.`);
    console.log("اليوم الجاري لا يُحتسب غياباً على أحد، فالنتيجة صفر غياب الآن.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
