/**
 * يتحقّق من مجموعات الصلاحيات على قاعدة الإنتاج، داخل معاملة تُلغى.
 *
 * ويُجرّب استعلام getSession نفسه بـPrisma لا بمحاكاةٍ له بالـSQL: المرشّح
 * المتشعّب (roles.some.role.key) هو الموضع الذي ينكسر فيه الأمر بهدوء — لو
 * كانت العلاقة موصوفةً خطأً في المخطّط لم يُرجِع شيئاً بلا أن يرفع خطأً، فتبقى
 * المجموعات بلا أثر ويظنّ المدير أنه منح.
 *
 * لا شيء يبقى: المعاملة تُلغى برفع خطأٍ في آخرها — وهي الطريقة الوحيدة
 * لاختبار كتابةٍ حقيقية على بياناتٍ حقيقية بلا أن نغيّرها.
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

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

/** رمزٌ للتراجع: نرفعه لنُلغي المعاملة بعد أن نتحقّق داخلها. */
const ROLLBACK = "ROLLBACK_SENTINEL";

/** نفس دالة auth.ts حرفاً بحرف — لا نسخةٌ منها تشبهها. */
async function bundlePermissions(tx, employeeId, roleKey) {
  const rows = await tx.permissionBundle.findMany({
    where: {
      OR: [
        { employees: { some: { employeeId } } },
        ...(roleKey ? [{ roles: { some: { role: { key: roleKey } } } }] : []),
      ],
    },
    select: { permissions: true },
  });
  return rows.flatMap((r) => r.permissions);
}

/** نفس getEmployeeServiceNames حرفاً بحرف — null تعني «بلا تقييد». */
async function serviceNamesFor(tx, employeeId, roleKey) {
  const rows = await tx.employeeServiceAccess.findMany({
    where: { employeeId },
    select: { serviceName: true },
  });
  const bundles = await tx.permissionBundle.findMany({
    where: {
      services: { isEmpty: false },
      OR: [
        { employees: { some: { employeeId } } },
        ...(roleKey ? [{ roles: { some: { role: { key: roleKey } } } }] : []),
      ],
    },
    select: { services: true },
  });
  const names = new Set([...rows.map((r) => r.serviceName), ...bundles.flatMap((b) => b.services)]);
  return names.size === 0 ? null : [...names];
}

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log("");
    console.log("① الحالة قبل أي شيء");
    const before = {
      bundles: await prisma.permissionBundle.count(),
      empLinks: await prisma.employeeBundle.count(),
      roleLinks: await prisma.roleBundle.count(),
    };
    check(
      before.bundles === 0 && before.empLinks === 0 && before.roleLinks === 0,
      "الجداول فارغة في الإنتاج — لا أحد كسب ولا فقد بإضافتها",
      JSON.stringify(before)
    );

    const victim = await prisma.employee.findFirst({
      where: { isActive: true, role: { not: "ADMIN" } },
      select: { id: true, name: true, role: true, permissions: true },
      orderBy: { name: "asc" },
    });
    if (!victim) throw new Error("لا موظف نشط لنختبر عليه");
    const role = await prisma.roleDefinition.findUnique({
      where: { key: victim.role },
      select: { id: true, displayName: true },
    });
    console.log(
      `  (الموظف: ${victim.name} · مسمّاه: ${role?.displayName ?? victim.role} · صلاحياته المخزّنة: ${victim.permissions.length})`
    );

    try {
      await prisma.$transaction(
        async (tx) => {
          console.log("");
          console.log("② المنح للموظف مباشرةً");

          const a = await tx.permissionBundle.create({
            data: {
              name: "تحقّق-أ",
              description: "مؤقّتة",
              permissions: ["manage_news", "manage_surveys"],
            },
            select: { id: true },
          });
          const b = await tx.permissionBundle.create({
            data: { name: "تحقّق-ب", permissions: ["manage_meetings"] },
            select: { id: true },
          });

          await tx.employeeBundle.create({ data: { employeeId: victim.id, bundleId: a.id } });

          let got = await bundlePermissions(tx, victim.id, victim.role);
          check(
            got.includes("manage_news") && got.includes("manage_surveys"),
            "المجموعة الممنوحة تصل الموظف باستعلام الجلسة نفسه",
            got.join(",")
          );

          console.log("");
          console.log("③ عدّة مجموعات للموظف الواحد — وهو الفرق عن المسمى");
          await tx.employeeBundle.create({ data: { employeeId: victim.id, bundleId: b.id } });
          got = await bundlePermissions(tx, victim.id, victim.role);
          check(
            ["manage_news", "manage_surveys", "manage_meetings"].every((p) => got.includes(p)),
            "المجموعتان تجتمعان عليه، ولا تحلّ إحداهما محلّ الأخرى"
          );

          console.log("");
          console.log("④ الربط بالمسمى الوظيفي: يسري على حامليه بلا مزامنة");
          if (role) {
            const c = await tx.permissionBundle.create({
              data: { name: "تحقّق-مسمّى", permissions: ["manage_communication"] },
              select: { id: true },
            });
            await tx.roleBundle.create({ data: { roleId: role.id, bundleId: c.id } });

            got = await bundlePermissions(tx, victim.id, victim.role);
            check(
              got.includes("manage_communication"),
              "صلاحية مجموعة المسمى تصل الموظف — والمرشّح المتشعّب يعمل"
            );

            const other = await tx.employee.findFirst({
              where: { role: victim.role, id: { not: victim.id }, isActive: true },
              select: { id: true, name: true },
            });
            if (other) {
              const hers = await bundlePermissions(tx, other.id, victim.role);
              check(
                hers.includes("manage_communication") && !hers.includes("manage_news"),
                `تصل زميله في المسمى (${other.name}) ولا تصله مجموعاتُه الشخصية`
              );
            } else {
              console.log("  (لا زميل في المسمى نفسه — تُخطّى مقارنةُ الزميل)");
            }

            // لا يُلمَس عمود الموظف: هذا هو الفرق كلّه عن «مزامنة» المسمى.
            const after = await tx.employee.findUnique({
              where: { id: victim.id },
              select: { permissions: true },
            });
            check(
              after.permissions.length === victim.permissions.length,
              "Employee.permissions لم يُلمَس — لا نسخ ولا دهس",
              `${victim.permissions.length} ← ${after.permissions.length}`
            );
          }

          console.log("");
          console.log("⑤ النزع يسحب ما أعطته المجموعة وحده");
          await tx.permissionBundle.delete({ where: { id: a.id } });
          got = await bundlePermissions(tx, victim.id, victim.role);
          check(
            !got.includes("manage_news") && got.includes("manage_meetings"),
            "حذف مجموعةٍ يسحب صلاحياتها ويُبقي صلاحيات الأخرى"
          );
          const orphans = await tx.employeeBundle.count({ where: { bundleId: a.id } });
          check(orphans === 0, "روابط المجموعة المحذوفة تتلاشى بالتتالي");

          const direct = await tx.employee.findUnique({
            where: { id: victim.id },
            select: { permissions: true },
          });
          check(
            direct.permissions.length === victim.permissions.length,
            "وصلاحيات الموظف المباشرة سالمة بعد الحذف"
          );

          console.log("");
          console.log("⑥ الخدمات في المجموعات");

          const service = await tx.service.findFirst({ select: { name: true }, orderBy: { name: "asc" } });
          if (!service) {
            console.log("  (لا خدمات في القاعدة — يُخطّى القسم)");
          } else {
            // المجموعة «ب» ما زالت عليه وخدماتها فارغة: أول تأكيدٍ أن وجود
            // مجموعةٍ لا يُقيّد بنفسه، وإنما الاتحاد الناتج.
            let scope = await serviceNamesFor(tx, victim.id, victim.role);
            check(
              scope === null,
              "مجموعةٌ بلا خدمات لا تُقيّد حاملها — يبقى بلا تقييد",
              JSON.stringify(scope)
            );

            const s1 = await tx.permissionBundle.create({
              data: { name: "تحقّق-خدمة", permissions: [], services: [service.name] },
              select: { id: true },
            });
            await tx.employeeBundle.create({ data: { employeeId: victim.id, bundleId: s1.id } });

            scope = await serviceNamesFor(tx, victim.id, victim.role);
            check(
              Array.isArray(scope) && scope.length === 1 && scope[0] === service.name,
              `خدمة المجموعة تصل الموظف: ${service.name}`,
              JSON.stringify(scope)
            );

            if (role) {
              const other = await tx.employee.findFirst({
                where: { role: victim.role, id: { not: victim.id }, isActive: true },
                select: { id: true, name: true },
              });
              const before = other ? await serviceNamesFor(tx, other.id, victim.role) : null;
              check(before === null, "زميله في المسمى ما زال بلا تقييد قبل الربط");

              const s2 = await tx.permissionBundle.create({
                data: { name: "تحقّق-خدمة-مسمّى", permissions: [], services: [service.name] },
                select: { id: true },
              });
              await tx.roleBundle.create({ data: { roleId: role.id, bundleId: s2.id } });

              if (other) {
                const after = await serviceNamesFor(tx, other.id, victim.role);
                check(
                  Array.isArray(after) && after.includes(service.name),
                  `خدمة مجموعة المسمى تصل زميله (${other.name})`,
                  JSON.stringify(after)
                );
              }
            }

            // الاتحاد لا الاستبدال: منحٌ مباشر يجتمع مع خدمة المجموعة.
            const second = await tx.service.findFirst({
              where: { name: { not: service.name } },
              select: { name: true, charityId: true },
              orderBy: { name: "asc" },
            });
            if (second) {
              await tx.employeeServiceAccess.create({
                data: { employeeId: victim.id, serviceName: second.name },
              });
              scope = await serviceNamesFor(tx, victim.id, victim.role);
              check(
                Array.isArray(scope) && scope.includes(service.name) && scope.includes(second.name),
                "المنح المباشر وخدمة المجموعة يجتمعان ولا يحلّ أحدهما محلّ الآخر",
                JSON.stringify(scope)
              );
            }
          }

          throw new Error(ROLLBACK);
        },
        { timeout: 30_000, maxWait: 20_000 }
      );
    } catch (e) {
      if (!(e instanceof Error) || e.message !== ROLLBACK) throw e;
    }

    // اختبار التكرار في معاملةٍ وحده: مخالفة قيدٍ في Postgres تُجهض المعاملة
    // كلّها (25P02)، فكل أمرٍ بعدها يُرفض. وضعُه مع البقية كان يقتل ما يليه.
    console.log("");
    console.log("⑦ المفتاح المركّب يمنع تكرار المنح");
    let duplicateRefused = false;
    try {
      await prisma.$transaction(async (tx) => {
        const x = await tx.permissionBundle.create({
          data: { name: "تحقّق-تكرار", permissions: ["manage_news"] },
          select: { id: true },
        });
        await tx.employeeBundle.create({ data: { employeeId: victim.id, bundleId: x.id } });
        try {
          await tx.employeeBundle.create({ data: { employeeId: victim.id, bundleId: x.id } });
        } catch {
          duplicateRefused = true;
        }
        throw new Error(ROLLBACK);
      });
    } catch (e) {
      if (!(e instanceof Error) || e.message !== ROLLBACK) {
        // المعاملة المُجهَضة تُرجِع 25P02 عند التراجع أحياناً؛ المهم أن القيد رفض.
        if (!duplicateRefused) throw e;
      }
    }
    check(duplicateRefused, "منحٌ مكرّر للموظف نفسه مرفوض على مستوى القاعدة");

    console.log("");
    console.log("⑧ بعد التراجع");
    const after = {
      bundles: await prisma.permissionBundle.count(),
      empLinks: await prisma.employeeBundle.count(),
      roleLinks: await prisma.roleBundle.count(),
    };
    check(
      after.bundles === before.bundles &&
        after.empLinks === before.empLinks &&
        after.roleLinks === before.roleLinks,
      "لا صفّ بقي من الاختبار",
      JSON.stringify(after)
    );

    console.log("");
    console.log(`${pass}/${pass + fail} ناجحة`);
    if (fail) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
