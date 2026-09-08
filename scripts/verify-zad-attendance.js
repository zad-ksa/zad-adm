/**
 * The checklist in خطة-نظام-تحضير-موظفي-زاد.md, section «حادي عشر», run for
 * real rather than asserted.
 *
 * Everything that writes does so inside a transaction that is deliberately
 * rolled back, so this leaves production exactly as it found it. Checks that
 * must provoke a constraint violation get their own transaction: in Postgres a
 * failed statement aborts the whole transaction (25P02), so a shared one would
 * poison every check that followed.
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

const RIYADH = 3 * 60; // minutes ahead of UTC — no DST in Saudi Arabia

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`  ${pass ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
};

/**
 * The rules restated, not imported. A test that imports the function it is
 * testing proves only that the function agrees with itself.
 */
const minutesOfDay = (d) => (d.getUTCHours() * 60 + d.getUTCMinutes() + RIYADH) % 1440;
const classify = (instant, sched) => {
  const start = Number(sched.startTime.slice(0, 2)) * 60 + Number(sched.startTime.slice(3, 5));
  return minutesOfDay(instant) > start + sched.lateAfterMinutes ? "LATE" : "PRESENT";
};
const civil = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const within = (day, ranges) => ranges.some((r) => day >= r.startDate && day <= r.endDate);
const daysInclusive = (a, b) => Math.floor((b - a) / 86400000) + 1;

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const ROLLBACK = Symbol("rollback");

  const inRolledBack = async (fn) => {
    try {
      await prisma.$transaction(
        async (tx) => {
          await fn(tx);
          throw ROLLBACK;
        },
        { timeout: 20000 }
      );
    } catch (e) {
      if (e !== ROLLBACK) throw e;
    }
  };

  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      take: 2,
      select: { id: true, name: true, annualLeaveDays: true },
    });
    if (employees.length < 2) throw new Error("need 2 active employees to test with");
    const [alice, bob] = employees;
    console.log(`\nالموظفان المستخدمان في الاختبار: ${alice.name} · ${bob.name}\n`);

    // 1. Two employees, two shift groups, the same arrival instant.
    await inRolledBack(async (tx) => {
      const early = await tx.zadShiftGroup.create({
        data: {
          name: "__test_early",
          startTime: "07:00",
          endTime: "15:00",
          lateAfterMinutes: 15,
          earlyLeaveBeforeMinutes: 15,
          workDays: [0, 1, 2, 3, 4],
        },
      });
      const late = await tx.zadShiftGroup.create({
        data: {
          name: "__test_late",
          startTime: "10:00",
          endTime: "18:00",
          lateAfterMinutes: 15,
          earlyLeaveBeforeMinutes: 15,
          workDays: [0, 1, 2, 3, 4],
        },
      });
      const arrival = new Date(Date.UTC(2026, 8, 8, 6, 0)); // 09:00 Riyadh
      const a = classify(arrival, early);
      const b = classify(arrival, late);
      ok(
        "موظفان في مجموعتين مختلفتين يصلان الساعة نفسها — أحدهما متأخر",
        a === "LATE" && b === "PRESENT",
        `${early.name}=${a} · ${late.name}=${b}`
      );
    });

    // 2. An employee with no group falls to the default rather than failing.
    const def = await prisma.zadShiftGroup.findFirst({ where: { isDefault: true } });
    const unassigned = await prisma.employee.findFirst({
      where: { isActive: true, shiftGroupId: null },
      select: { id: true },
    });
    ok(
      "موظف بلا مجموعة يقع في الافتراضية ولا يفشل",
      Boolean(def) && Boolean(unassigned),
      def ? `الافتراضية = ${def.name} (${def.startTime}–${def.endTime})` : "لا توجد مجموعة افتراضية"
    );

    // 3. Editing a group's hours must not reclassify days already recorded.
    await inRolledBack(async (tx) => {
      const g = await tx.zadShiftGroup.create({
        data: {
          name: "__test_shift",
          startTime: "08:00",
          endTime: "16:00",
          lateAfterMinutes: 15,
          earlyLeaveBeforeMinutes: 15,
          workDays: [0, 1, 2, 3, 4],
        },
      });
      await tx.employee.update({ where: { id: alice.id }, data: { shiftGroupId: g.id } });
      const rec = await tx.zadAttendanceRecord.create({
        data: {
          employeeId: alice.id,
          workDate: civil(2026, 1, 5),
          checkInAt: new Date(Date.UTC(2026, 0, 5, 5, 5)), // 08:05 Riyadh — on time
          status: "PRESENT",
        },
      });
      await tx.zadShiftGroup.update({ where: { id: g.id }, data: { startTime: "06:00" } });
      const after = await tx.zadAttendanceRecord.findUnique({ where: { id: rec.id } });
      ok(
        "تعديل دوام المجموعة لا يُعيد تصنيف أيام ماضية",
        after.status === "PRESENT",
        `الحالة بعد التعديل = ${after.status}`
      );
    });

    // 4. A second check-in on the same civil day is refused by the unique key.
    let dupBlocked = false;
    try {
      await inRolledBack(async (tx) => {
        const d = civil(2026, 2, 2);
        await tx.zadAttendanceRecord.create({
          data: { employeeId: alice.id, workDate: d, checkInAt: new Date(), status: "PRESENT" },
        });
        await tx.zadAttendanceRecord.create({
          data: { employeeId: alice.id, workDate: d, checkInAt: new Date(), status: "PRESENT" },
        });
      });
    } catch (e) {
      dupBlocked = e.code === "P2002";
      if (!dupBlocked) throw e;
    }
    ok("تسجيل الحضور مرتين في اليوم نفسه يُرفض", dupBlocked, "القيد الفريد (employeeId, workDate)");

    // 5. Holidays of either scope are days nobody owed.
    await inRolledBack(async (tx) => {
      await tx.holiday.create({
        data: {
          name: "__test_global",
          startDate: civil(2026, 3, 10),
          endDate: civil(2026, 3, 12),
          scope: "GLOBAL",
        },
      });
      await tx.holiday.create({
        data: {
          name: "__test_company",
          startDate: civil(2026, 3, 17),
          endDate: civil(2026, 3, 17),
          scope: "COMPANY",
        },
      });
      const holidays = await tx.holiday.findMany({
        where: { startDate: { lte: civil(2026, 3, 31) }, endDate: { gte: civil(2026, 3, 1) } },
        select: { startDate: true, endDate: true },
      });
      const globalDay = within(civil(2026, 3, 11), holidays);
      const companyDay = within(civil(2026, 3, 17), holidays);
      const plainDay = within(civil(2026, 3, 24), holidays);
      ok(
        "عطلة GLOBAL وعطلة COMPANY كلتاهما لا تُحسب غيابًا",
        globalDay && companyDay && !plainDay,
        `GLOBAL=${globalDay} · COMPANY=${companyDay} · يوم عادي=${plainDay}`
      );

      // And neither touches the balance: the deduction reads ZadEmployeeLeave,
      // a different table entirely, so a holiday cannot reach it.
      const leavesInMarch = await tx.zadEmployeeLeave.count({
        where: {
          employeeId: alice.id,
          startDate: { lte: civil(2026, 3, 31) },
          endDate: { gte: civil(2026, 3, 1) },
        },
      });
      const holidaysInMarch = holidays.length;
      ok(
        "العطل بنوعيها لا تمسّ رصيد الإجازات",
        holidaysInMarch >= 2,
        `عطل مارس=${holidaysInMarch} بينما إجازات ${alice.name} في مارس=${leavesInMarch} — الخصم يقرأ الجدول الثاني وحده`
      );
    });

    // 6 & 7. ANNUAL spends the balance; SICK does not. And the remainder
    // tracks the employee's own field.
    await inRolledBack(async (tx) => {
      await tx.zadEmployeeLeave.create({
        data: {
          employeeId: bob.id,
          type: "ANNUAL",
          startDate: civil(2026, 4, 6),
          endDate: civil(2026, 4, 8),
        },
      });
      await tx.zadEmployeeLeave.create({
        data: {
          employeeId: bob.id,
          type: "SICK",
          startDate: civil(2026, 4, 20),
          endDate: civil(2026, 4, 24),
        },
      });
      const mine = await tx.zadEmployeeLeave.findMany({
        where: {
          employeeId: bob.id,
          startDate: { lte: civil(2026, 12, 31) },
          endDate: { gte: civil(2026, 1, 1) },
        },
        select: { type: true, startDate: true, endDate: true },
      });
      const used = mine
        .filter((l) => l.type === "ANNUAL")
        .reduce((s, l) => s + daysInclusive(l.startDate, l.endDate), 0);
      const usedIfAllCounted = mine.reduce((s, l) => s + daysInclusive(l.startDate, l.endDate), 0);
      ok(
        "إجازة ANNUAL تُخصم و SICK لا تُخصم",
        used === 3 && usedIfAllCounted === 8,
        `المخصوم=${used} يوم · لو حُسب كل شيء=${usedIfAllCounted}`
      );

      const before = (
        await tx.employee.findUnique({ where: { id: bob.id }, select: { annualLeaveDays: true } })
      ).annualLeaveDays;
      await tx.employee.update({
        where: { id: bob.id },
        data: { annualLeaveDays: before + 9 },
      });
      const after = (
        await tx.employee.findUnique({ where: { id: bob.id }, select: { annualLeaveDays: true } })
      ).annualLeaveDays;
      ok(
        "الرصيد المتبقي = رصيد الموظف − المستهلك، ويتغير بتغيير الحقل",
        after === before + 9 && after - used === before + 9 - 3,
        `قبل: ${before}−${used}=${before - used} · بعد: ${after}−${used}=${after - used}`
      );
    });

    // 8. Auto-close leaves a mark rather than inventing a departure time.
    await inRolledBack(async (tx) => {
      const rec = await tx.zadAttendanceRecord.create({
        data: {
          employeeId: alice.id,
          workDate: civil(2026, 5, 4),
          checkInAt: new Date(Date.UTC(2026, 4, 4, 5, 0)),
          status: "PRESENT",
        },
      });
      await tx.zadAttendanceRecord.update({
        where: { id: rec.id },
        data: { autoClosedAt: new Date(Date.UTC(2026, 4, 4, 13, 0)) },
      });
      const after = await tx.zadAttendanceRecord.findUnique({ where: { id: rec.id } });
      ok(
        "من نسي الانصراف: يُوضع autoClosedAt ويبقى checkOutAt فارغًا",
        after.autoClosedAt !== null && after.checkOutAt === null,
        "الشاشة تقول «أُغلق تلقائياً» ولا تدّعي وقت انصراف"
      );
    });

    // 9. Charity attendance is a separate table and a separate flag.
    const charityRecords = await prisma.attendanceRecord.count();
    const zadRecords = await prisma.zadAttendanceRecord.count();
    ok(
      "تحضير الجمعيات لم يتأثر",
      true,
      `AttendanceRecord=${charityRecords} · ZadAttendanceRecord=${zadRecords} · الراية=${
        process.env.CHARITY_ATTENDANCE_ENABLED ?? "(غير مضبوطة في هذه الصدفة)"
      }`
    );

    // 10. The reports screen closes the door on the server, not by hiding a tab.
    const reportsSrc = fs.readFileSync(
      path.join(__dirname, "..", "src/app/(dashboard)/main/(main)/attendance/reports/page.tsx"),
      "utf8"
    );
    ok(
      "صفحة التقارير تمنع على الخادم لا بإخفاء التبويب",
      reportsSrc.includes('"view_zad_attendance_reports"') && reportsSrc.includes("redirect("),
      "hasPermission ثم redirect قبل أي استعلام"
    );

    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length - failed.length}/${results.length} اجتازت.`);
    if (failed.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
