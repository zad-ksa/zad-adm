/**
 * هجرةُ صلاحيات الجمعيات إلى النموذج الجديد — وتقريرُ «قبل/بعد» لكلِّ حساب.
 *
 * والنموذجُ الجديد (انظر `src/lib/charityPermissions.ts`):
 *   - لا شيءَ يُنال بالصفة: `isAdmin` صار علامةَ **حساب الجمعية الرسميِّ** وحدَه،
 *     وهو يحمل كلَّ الصلاحيات محسوبةً.
 *   - وكلُّ صلاحيّةٍ تتبع خدمةً، ولا تعمل إلا والخدمةُ مفوَّضةٌ للعضو.
 *   - و«الخدمات» تبويبٌ مشتقٌّ: يُعرض لمن له صلاحيّةٌ في خدمةٍ ما، ويسرد خدماتِه
 *     وحدَها. و«الخطة الإعلامية» يراها كلُّ عضوٍ اطّلاعاً.
 *
 * وثلاثةُ أعمالٍ تُنجَز هنا:
 *   ١ **تنقيةُ المتقاعد**: `view_services` و`view_media_plan` و`view_hr`
 *     و`create_design_requests` — قيمٌ مخزّنةٌ لا تعمل، ولا شاشةَ تُصحّحها.
 *   ٢ **حفظُ الوصول القائم**: تبويبٌ كان يُنال بتفويض الخدمة يُكتب الآن صلاحيّةً
 *     صريحةً — وإلّا فقد أصحابُه ما كانوا يرونه أمس.
 *   ٣ **تنزيلُ المديرين غير الرسميّين** أعضاءً بصلاحيّاتهم: يُرفع العلَمُ، وتُكتب
 *     لهم صلاحيّاتُ خدماتهم المفوَّضة.
 *
 * ولا يُمنح من هنا شيءٌ لم يكن يُرى: `edit_media_plan` صلاحيّةٌ جديدةٌ (اعتمادُ
 * الخطّة وتعديلُها) لا يحملها أحدٌ بعد الهجرة — تُمنح بيدٍ من شاشة الصلاحيات.
 *
 *   node -r dotenv/config scripts/migrate-charity-permissions.mjs
 *   node -r dotenv/config scripts/migrate-charity-permissions.mjs --apply
 *
 * وبلا `--apply` لا يُكتب حرف.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const APPLY = process.argv.includes("--apply");

const MEDIA = "الإعلامية";
const GOVERNANCE = "الحوكمة";

/** كتالوجُ الصلاحيات الجديد — مرآةٌ لـ`CHARITY_SERVICE_PERMISSIONS`. */
const SERVICE_PERMISSIONS = [
  { id: "view_design_requests", label: "طلبات التصاميم", service: MEDIA },
  { id: "edit_media_plan", label: "تحرير الخطة الإعلامية", service: MEDIA },
  { id: "view_governance", label: "الحوكمة", service: GOVERNANCE },
];
const MANAGE_IDS = ["manage_charity_users", "manage_charity_mail", "manage_attendance", "view_attendance_reports"];
const RETIRED = ["view_services", "view_media_plan", "view_hr", "create_design_requests"];

const serviceOf = (id) => SERVICE_PERMISSIONS.find((p) => p.id === id)?.service ?? null;
const labelOf = (id) =>
  SERVICE_PERMISSIONS.find((p) => p.id === id)?.label ??
  ({
    manage_charity_users: "إدارة حسابات الموظفين",
    manage_charity_mail: "إعدادات البريد",
    manage_attendance: "إعداد التحضير",
    view_attendance_reports: "تقارير الحضور",
  })[id] ??
  id;

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/** ما كان يُرى **قبل** الهجرة: الصفةُ تتجاوز كلَّ شيء، والتبويبُ يُنال بالربط. */
function before(member, links, charityServices) {
  const stored = new Set(member.permissions);
  const delegated = new Set(member.services);
  const tabs = [];

  const linkedGrant = (tabId) => {
    const needed = links.filter((l) => l.permissionId === tabId).map((l) => l.serviceName);
    if (needed.length === 0) return stored.has(tabId);
    return needed.some((name) => delegated.has(name));
  };

  if (member.isAdmin) {
    tabs.push("الخدمات", GOVERNANCE, "طلبات التصاميم", "الخطة الإعلامية");
    return { tabs, services: [...charityServices] };
  }

  if (linkedGrant("view_services")) tabs.push("الخدمات");
  if (linkedGrant("view_governance")) tabs.push(GOVERNANCE);
  if (linkedGrant("view_design_requests")) tabs.push("طلبات التصاميم");
  if (linkedGrant("view_media_plan")) tabs.push("الخطة الإعلامية");

  // وصفحةُ «الخدمات» كانت تعرض خدماتِ الجمعية كلَّها بلا ترشيح.
  return { tabs, services: tabs.includes("الخدمات") ? [...charityServices] : [] };
}

/** ما سيُرى **بعد** الهجرة، بالصلاحيّات المكتوبة. */
function after(member, permissions, charityServices) {
  // والخطّةُ الإعلاميّةُ يراها كلُّ عضوٍ اطّلاعاً.
  if (member.isOfficialAfter) {
    return { tabs: ["الخدمات", GOVERNANCE, "طلبات التصاميم", "الخطة الإعلامية"], services: [...charityServices] };
  }

  const held = new Set(permissions);
  const delegated = new Set(member.services);
  const effective = [...held].filter((id) => {
    const service = serviceOf(id);
    return !service || delegated.has(service);
  });

  const tabs = [];
  const mine = charityServices.filter((s) => effective.some((id) => serviceOf(id) === s));
  if (mine.length > 0) tabs.push("الخدمات");
  if (effective.includes("view_governance")) tabs.push(GOVERNANCE);
  if (effective.includes("view_design_requests")) tabs.push("طلبات التصاميم");
  tabs.push("الخطة الإعلامية");

  return { tabs, services: mine, effective };
}

async function run() {
  const [links, charities, memberships] = await Promise.all([
    prisma.permissionServiceLink.findMany({ select: { permissionId: true, serviceName: true } }),
    prisma.charity.findMany({ select: { id: true, name: true, services: { select: { name: true } } } }),
    prisma.charityUserCharity.findMany({
      select: {
        id: true,
        charityId: true,
        isAdmin: true,
        isActive: true,
        permissions: true,
        services: { select: { serviceName: true } },
        user: { select: { id: true, name: true, title: true } },
        charity: { select: { name: true } },
      },
    }),
  ]);

  const servicesOfCharity = new Map(
    charities.map((c) => [c.id, [...new Set(c.services.map((s) => s.name))].sort((a, b) => a.localeCompare(b, "ar"))])
  );

  // حسابُ الجمعية الرسميُّ: المسمّى `SYSTEM_ADMIN` حيث وُجد، وإلّا فالمديرُ
  // الوحيدُ في جمعيةٍ لا رسميَّ لها (الجمعيةُ التجريبيّة) — فلا تبقى جمعيةٌ بلا
  // حسابٍ يمنح.
  const officialByCharity = new Map();
  for (const m of memberships) {
    if (m.user.title === "SYSTEM_ADMIN") officialByCharity.set(m.charityId, m.user.id);
  }
  for (const c of charities) {
    if (officialByCharity.has(c.id)) continue;
    const admins = memberships.filter((m) => m.charityId === c.id && m.isAdmin);
    if (admins.length === 1) officialByCharity.set(c.id, admins[0].user.id);
  }

  const plan = [];

  for (const m of memberships) {
    const charityServices = servicesOfCharity.get(m.charityId) ?? [];
    const member = {
      permissions: m.permissions,
      services: m.services.map((s) => s.serviceName),
      isAdmin: m.isAdmin,
    };

    const isOfficialAfter = officialByCharity.get(m.charityId) === m.user.id;

    // الصلاحيّاتُ بعد الهجرة:
    //   • الحسابُ الرسميُّ: مصفوفةٌ فارغةٌ — يحمل كلَّ شيءٍ محسوباً.
    //   • وغيرُه: الإداريّةُ المخزّنةُ كما هي، ومعها صلاحيّاتُ ما كان يراه
    //     بتفويض خدمته (الحوكمة، وطلباتُ التصاميم).
    let permissions;
    if (isOfficialAfter) {
      permissions = [];
    } else {
      const kept = m.permissions.filter((p) => MANAGE_IDS.includes(p));
      const earned = [];
      const delegated = new Set(member.services);
      const wasAdmin = m.isAdmin;
      // المديرُ المُنزَّلُ يُعطى صلاحيّاتِ خدماتِه كلِّها — فما كان يراه بالصفة
      // يبقى له بصلاحيّةٍ مكتوبة.
      for (const def of SERVICE_PERMISSIONS) {
        if (def.id === "edit_media_plan") continue; // جديدةٌ: تُمنح بيد
        if (!delegated.has(def.service)) continue;
        if (wasAdmin || before(member, links, charityServices).tabs.includes(def.label) || def.id === "view_governance") {
          earned.push(def.id);
        }
      }
      permissions = [...new Set([...kept, ...earned])].filter((p) => !RETIRED.includes(p));
    }

    const b = before(member, links, charityServices);
    const a = after({ ...member, isOfficialAfter }, permissions, charityServices);

    const changed =
      isOfficialAfter !== m.isAdmin ||
      JSON.stringify([...m.permissions].sort()) !== JSON.stringify([...permissions].sort());

    plan.push({ m, isOfficialAfter, permissions, before: b, after: a, changed });
  }

  // ── التقرير ───────────────────────────────────────────────────────────────
  let charity = "";
  for (const row of plan.sort((x, y) =>
    x.m.charity.name.localeCompare(y.m.charity.name, "ar") || x.m.user.name.localeCompare(y.m.user.name, "ar")
  )) {
    if (row.m.charity.name !== charity) {
      charity = row.m.charity.name;
      console.log(`\n■ ${charity}`);
    }
    const kind = row.isOfficialAfter ? "حساب الجمعية" : row.m.isAdmin ? "مدير (يُنزَّل)" : "عضو";
    console.log(`  ${row.m.user.name} — ${kind}${row.m.isActive ? "" : " · معطَّل"}`);
    console.log(`     قبل : تبويبات [${row.before.tabs.join(" · ") || "لا شيء"}] · خدماتٌ معروضة ${row.before.services.length}`);
    console.log(`     بعد : تبويبات [${row.after.tabs.join(" · ") || "لا شيء"}] · خدماتٌ معروضة ${row.after.services.length}${row.after.services.length ? ` (${row.after.services.join("، ")})` : ""}`);
    console.log(`     الصلاحيات: ${row.permissions.length ? row.permissions.map(labelOf).join("، ") : row.isOfficialAfter ? "(الكلُّ محسوباً)" : "لا شيء"}`);
    if (row.changed) {
      const removed = row.m.permissions.filter((p) => !row.permissions.includes(p));
      const added = row.permissions.filter((p) => !row.m.permissions.includes(p));
      const bits = [];
      if (removed.length) bits.push(`يُحذف: ${removed.join("، ")}`);
      if (added.length) bits.push(`يُضاف: ${added.join("، ")}`);
      if (row.isOfficialAfter !== row.m.isAdmin) bits.push(row.isOfficialAfter ? "يُعلَّم حسابَ الجمعية" : "يُرفع علَمُ الإدارة");
      console.log(`     ◆ ${bits.join(" · ")}`);
    }
  }

  const writes = plan.filter((p) => p.changed);
  console.log(`\nالعضويّات: ${plan.length} · ما سيُكتب: ${writes.length}`);

  if (!APPLY) {
    console.log("\n[قراءةٌ فقط] أعدْ بـ--apply ليُكتب.");
    return;
  }

  for (const row of writes) {
    await prisma.$transaction([
      prisma.charityUserCharity.update({
        where: { id: row.m.id },
        data: { isAdmin: row.isOfficialAfter, permissions: row.permissions },
      }),
      prisma.auditLog.create({
        data: {
          actorType: "SYSTEM",
          actorName: "هجرةُ نموذج صلاحيات الجمعيات",
          action: "PERMISSION_CHANGE",
          targetType: "CharityUserCharity",
          targetId: row.m.id,
          metadata: {
            charity: row.m.charity.name,
            account: row.m.user.name,
            before: { isAdmin: row.m.isAdmin, permissions: row.m.permissions },
            after: { isOfficial: row.isOfficialAfter, permissions: row.permissions },
          },
        },
      }),
    ]);
  }

  console.log(`تمّ: كُتبت ${writes.length} عضويّة، ولكلٍّ أثرٌ في سجلّ التدقيق.`);
}

run()
  .catch((error) => {
    console.error("فشل:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
