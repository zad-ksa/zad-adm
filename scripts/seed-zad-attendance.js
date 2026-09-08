/**
 * The two rows the system cannot start without, and the one grant that makes
 * it administrable.
 *
 * Idempotent: re-running changes nothing. Written as a script rather than a
 * migration because it seeds *content*, not structure — and content is the
 * thing you want to be able to inspect and re-run.
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
    // 1. The default shift. Everyone unassigned works these hours.
    const existingDefault = await prisma.zadShiftGroup.findFirst({ where: { isDefault: true } });
    if (existingDefault) {
      console.log("  المجموعة الافتراضية موجودة: " + existingDefault.name);
    } else {
      const g = await prisma.zadShiftGroup.create({
        data: {
          name: "الدوام الرسمي",
          startTime: "08:00",
          endTime: "16:00",
          lateAfterMinutes: 15,
          earlyLeaveBeforeMinutes: 15,
          workDays: [0, 1, 2, 3, 4], // الأحد إلى الخميس
          isDefault: true,
        },
      });
      console.log("  ✓ أُنشئت المجموعة الافتراضية: " + g.name + " (" + g.startTime + "–" + g.endTime + ")");
    }

    // 2. The company settings row. Attendance starts CLOSED: nothing may be
    //    recorded until someone deliberately opens it, so a half-configured
    //    system cannot quietly start marking people absent.
    const settings = await prisma.zadAttendanceSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    console.log(
      "  ✓ إعدادات الشركة" +
        (settings.attendanceOpenedAt ? " — التحضير مفتوح" : " — التحضير مُغلق (يُفتح يدوياً)")
    );

    // 3. The permission, granted to the system administrator only, per decision.
    const admin = await prisma.employee.findFirst({
      where: { isActive: true, role: "ADMIN" },
      select: { id: true, name: true, permissions: true },
    });
    if (!admin) {
      console.warn("  ! لا يوجد حساب ADMIN نشط — امنح manage_zad_attendance يدوياً");
    } else if (admin.permissions.includes("manage_zad_attendance")) {
      console.log("  الصلاحية ممنوحة مسبقاً لـ" + admin.name);
    } else {
      await prisma.employee.update({
        where: { id: admin.id },
        data: { permissions: { push: ["manage_zad_attendance", "view_zad_attendance_reports"] } },
      });
      console.log("  ✓ مُنحت manage_zad_attendance و view_zad_attendance_reports لـ" + admin.name);
    }

    const counts = {
      مجموعات: await prisma.zadShiftGroup.count(),
      "مواقع عمل": await prisma.zadWorkSite.count(),
      "أيام في التقويم": await prisma.holiday.count(),
    };
    console.log("\n  الحالة: " + Object.entries(counts).map(([k, v]) => k + " " + v).join(" · "));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => { console.error(err.message || err); process.exit(1); });
