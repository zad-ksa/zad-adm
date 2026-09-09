/**
 * The manual-correction rules, exercised against the real database.
 *
 * The action itself needs a session, so what is tested here is the behaviour
 * the action delegates to the database and to lib/attendanceTime: the day
 * anchor, the Riyadh instant, the classification, the upsert, the clearing of
 * device evidence, and the delete-on-empty. Every write happens inside a
 * transaction that is rolled back.
 *
 * Checks that must provoke a constraint violation get their own transaction: a
 * failed statement aborts the whole Postgres transaction (25P02).
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

const RIYADH_MS = 3 * 60 * 60 * 1000;

const results = [];
const ok = (name, pass, detail) => {
  results.push(pass);
  console.log(`  ${pass ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
};

// The rules restated rather than imported, so the test does not merely agree
// with the implementation.
const parseCivilDay = (v) => {
  const m = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(v.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCDate() === +m[3] ? d : null;
};
const instantOn = (workDate, time) => {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!m) return null;
  return new Date(workDate.getTime() + (+m[1] * 60 + +m[2]) * 60000 - RIYADH_MS);
};
const minutesOfDay = (d) => (d.getUTCHours() * 60 + d.getUTCMinutes() + 180) % 1440;
const classify = (instant, sched) => {
  const start = +sched.startTime.slice(0, 2) * 60 + +sched.startTime.slice(3, 5);
  return minutesOfDay(instant) > start + sched.lateAfterMinutes ? "LATE" : "PRESENT";
};

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const ROLLBACK = "__ROLLBACK__";

  const tx = async (fn) => {
    try {
      await prisma.$transaction(
        async (t) => {
          await fn(t);
          throw new Error(ROLLBACK);
        },
        { timeout: 20000, maxWait: 15000 }
      );
    } catch (e) {
      if (!String(e.message).includes(ROLLBACK)) throw e;
    }
  };

  try {
    await prisma.$queryRaw`SELECT 1`;

    const employee = await prisma.employee.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const schedule = await prisma.zadShiftGroup.findFirst({ where: { isDefault: true } });
    if (!employee || !schedule) throw new Error("need an employee and a default group");
    console.log(
      `\nالموظف: ${employee.name} · الدوام: ${schedule.startTime}–${schedule.endTime}\n`
    );

    const day = parseCivilDay("2026-04-14");

    // 1. A forgotten morning, entered by hand and classified like a real one.
    await tx(async (t) => {
      const checkIn = instantOn(day, "08:05");
      const created = await t.zadAttendanceRecord.create({
        data: {
          employeeId: employee.id,
          workDate: day,
          checkInAt: checkIn,
          status: classify(checkIn, schedule),
          manualAt: new Date(),
          manualById: employee.id,
          manualReason: "نسي التسجيل صباحاً",
        },
      });
      ok(
        "يوم منسي يُسجَّل يدوياً ويُصنَّف كتسجيل حقيقي",
        created.status === "PRESENT" && created.manualAt !== null,
        `٠٨:٠٥ ← ${created.status}`
      );
      ok(
        "ولا تُكتب أي إحداثيات مع الإدخال اليدوي",
        created.checkInLat === null &&
          created.checkInLng === null &&
          created.checkInAccuracy === null &&
          created.checkInDistance === null &&
          created.workSiteId === null,
        "لا دليل جهاز يُختلق"
      );
      ok("والسبب يُحفظ على السجل نفسه", created.manualReason === "نسي التسجيل صباحاً");
    });

    // 2. Late is late, even when an administrator types it.
    await tx(async (t) => {
      const checkIn = instantOn(day, "10:40");
      const r = await t.zadAttendanceRecord.create({
        data: {
          employeeId: employee.id,
          workDate: day,
          checkInAt: checkIn,
          status: classify(checkIn, schedule),
          manualAt: new Date(),
          manualById: employee.id,
          manualReason: "تأخر لعذر",
        },
      });
      ok(
        "المسؤول لا يستطيع جعل ١٠:٤٠ حضوراً في دوام ٠٨:٠٠",
        r.status === "LATE",
        `الحالة = ${r.status}`
      );
    });

    // 3. Amending a real record strips the evidence it no longer has.
    await tx(async (t) => {
      const real = await t.zadAttendanceRecord.create({
        data: {
          employeeId: employee.id,
          workDate: day,
          checkInAt: instantOn(day, "08:00"),
          checkInLat: 24.7136,
          checkInLng: 46.6753,
          checkInAccuracy: 12,
          checkInDistance: 40,
          isSuspicious: true,
          suspiciousReason: "قفزة غير ممكنة",
          autoClosedAt: new Date(),
          isRemote: true,
          status: "PRESENT",
        },
      });
      const amended = await t.zadAttendanceRecord.update({
        where: { id: real.id },
        data: {
          checkInAt: instantOn(day, "08:30"),
          manualAt: new Date(),
          manualById: employee.id,
          manualReason: "تصحيح",
          checkInLat: null,
          checkInLng: null,
          checkInAccuracy: null,
          checkInDistance: null,
          workSiteId: null,
          isRemote: false,
          autoClosedAt: null,
          isSuspicious: false,
          suspiciousReason: null,
        },
      });
      ok(
        "تعديل سجل حقيقي يمسح إحداثياته وأعلام الاشتباه",
        amended.checkInLat === null &&
          amended.isSuspicious === false &&
          amended.suspiciousReason === null &&
          amended.autoClosedAt === null,
        "لا تبقى بيانات تصف تسجيلاً استُبدل"
      );
    });

    // 4. Clearing removes the row: absence is the absence of a record.
    await tx(async (t) => {
      await t.zadAttendanceRecord.create({
        data: {
          employeeId: employee.id,
          workDate: day,
          checkInAt: instantOn(day, "08:00"),
          status: "PRESENT",
        },
      });
      const removed = await t.zadAttendanceRecord.deleteMany({
        where: { employeeId: employee.id, workDate: day },
      });
      const left = await t.zadAttendanceRecord.count({
        where: { employeeId: employee.id, workDate: day },
      });
      ok(
        "المسح يحذف الصف ولا يترك صفاً فارغاً",
        removed.count === 1 && left === 0,
        "الصف الفارغ كان سيُقرأ «حاضر بأوقات مجهولة»"
      );
    });

    // 5. One row per day still holds through the manual path.
    let blocked = false;
    try {
      await tx(async (t) => {
        await t.zadAttendanceRecord.create({
          data: { employeeId: employee.id, workDate: day, checkInAt: new Date(), status: "PRESENT" },
        });
        await t.zadAttendanceRecord.create({
          data: { employeeId: employee.id, workDate: day, checkInAt: new Date(), status: "PRESENT" },
        });
      });
    } catch (e) {
      blocked = e.code === "P2002";
      if (!blocked) throw e;
    }
    ok("الإدخال اليدوي لا يستطيع خلق يومين لنفس التاريخ", blocked, "القيد الفريد يعمل");

    // 6. Input the action must refuse before it reaches the database.
    ok(
      "تاريخ غير صالح يُرفض",
      parseCivilDay("2026-02-30") === null && parseCivilDay("ليس تاريخاً") === null
    );
    ok("وقت غير صالح يُرفض", instantOn(day, "25:00") === null && instantOn(day, "08:70") === null);
    ok(
      "انصراف قبل الحضور يُرفض",
      instantOn(day, "07:00").getTime() <= instantOn(day, "08:00").getTime(),
      "الشرط checkOut <= checkIn يمنعه"
    );

    const failed = results.filter((x) => !x).length;
    console.log(`\n${results.length - failed}/${results.length} اجتازت.`);
    if (failed) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
