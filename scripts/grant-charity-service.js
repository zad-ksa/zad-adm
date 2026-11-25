/**
 * يفوّض خدمةً لأعضاء الجمعيات التي أُسندت إليها — ولا مستلمَ بلا تفويض.
 *
 * **المشكلة التي كُتب لها**: إسنادُ الخدمة إلى الجمعية (صفُّ `Service`) شيء،
 * وتفويضُ عضوٍ بها (صفُّ `CharityMemberService`) شيءٌ آخر. وبريدُ الخدمة
 * يذهب إلى المفوَّضين بها وحدَهم، فجمعيةٌ أُسندت إليها الخدمة ولم يُفوَّض فيها
 * أحدٌ تُقرأ «لا مستلم». وهذا ما وقع لـ«التسويق وتنمية الموارد المالية»:
 * أُسندت إلى إحدى عشرة جمعية، وفُوّض بها عضوٌ واحدٌ في المنصّة كلها.
 *
 * **ولا يُشغَّل بلا `--apply`**: يطبع ما سيفعله ويقف. راجع القائمة ثمّ أعده
 * بـ`--apply`.
 *
 * **والأضيقُ هو الافتراضيّ**: الحسابُ الرسميُّ للجمعية وحدَه — وهو ما يكفي
 * لئلّا يبقى بريدٌ بلا مستلم. و`--all-members` يفوّض كلَّ عضوٍ نشط، ولا
 * تستعمله إلّا بقصد: تفويضُ الخدمة شرطُ ظهور صلاحيّاتها، ومنها ما يكشف
 * حساباتِ الدخول عند الجهات المانحة.
 *
 * **ولا يحذف شيئاً ولا يكرّر**: يُضيف ما ليس موجوداً فقط، وإعادةُ تشغيله
 * بلا أثر.
 *
 * التشغيل:
 *   node scripts/grant-charity-service.js                      # عرضٌ فقط
 *   node scripts/grant-charity-service.js --apply
 *   node scripts/grant-charity-service.js --service "الحوكمة" --apply
 *   node scripts/grant-charity-service.js --all-members --apply
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DEFAULT_SERVICE = "التسويق وتنمية الموارد المالية";

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, "..", ".env");
  const m = /^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m.exec(fs.readFileSync(envPath, "utf8"));
  if (!m) throw new Error("DATABASE_URL not found");
  return m[1];
}

function args() {
  const argv = process.argv.slice(2);
  const at = argv.indexOf("--service");
  return {
    apply: argv.includes("--apply"),
    allMembers: argv.includes("--all-members"),
    service: at >= 0 && argv[at + 1] ? argv[at + 1] : DEFAULT_SERVICE,
  };
}

async function main() {
  const { apply, allMembers, service } = args();
  const pool = new Pool({ connectionString: connectionString() });
  const client = await pool.connect();

  try {
    const assigned = await client.query(
      `SELECT DISTINCT c."id", c."name"
         FROM "Charity" c
         JOIN "Service" s ON s."charityId" = c."id"
        WHERE s."name" = $1
          AND COALESCE(c."isInternal", FALSE) = FALSE
        ORDER BY c."name"`,
      [service]
    );

    if (assigned.rowCount === 0) {
      console.log(`لا جمعية أسندت إليها خدمة «${service}».`);
      return;
    }

    console.log(`الخدمة: «${service}»`);
    console.log(`المفوَّض: ${allMembers ? "كل عضو نشط" : "الحساب الرسمي وحده"}`);
    console.log(`الوضع: ${apply ? "تطبيق" : "عرض فقط — أضف --apply للتنفيذ"}`);
    console.log("");

    const plan = [];
    const blocked = [];

    for (const charity of assigned.rows) {
      const members = await client.query(
        `SELECT m."id", m."isAdmin", u."name"
           FROM "CharityUserCharity" m
           JOIN "CharityUser" u ON u."id" = m."charityUserId"
          WHERE m."charityId" = $1 AND m."isActive" = TRUE
          ORDER BY m."isAdmin" DESC, u."name"`,
        [charity.id]
      );

      if (members.rowCount === 0) {
        blocked.push({ charity: charity.name, reason: "لا أعضاء نشطين — أنشئ حسابا أولا" });
        continue;
      }

      const targets = allMembers ? members.rows : members.rows.filter((m) => m.isAdmin);
      if (targets.length === 0) {
        // جمعيةٌ لها أعضاءُ ولا حسابَ رسميّ: لا يُخمَّن أحدُهم، ويُقال ذلك.
        blocked.push({
          charity: charity.name,
          reason: `لا حساب رسمي (${members.rowCount} عضوا) — فوض يدويا أو شغله بـ --all-members`,
        });
        continue;
      }

      for (const member of targets) {
        const exists = await client.query(
          `SELECT 1 FROM "CharityMemberService" WHERE "membershipId" = $1 AND "serviceName" = $2`,
          [member.id, service]
        );
        if (exists.rowCount > 0) continue;
        plan.push({ charity: charity.name, member: member.name, membershipId: member.id });
      }
    }

    if (plan.length === 0) {
      console.log("لا تفويض ينقص — كل من يستحق مفوَّض.");
    } else {
      console.log(`سيفوَّض ${plan.length} عضوا:`);
      console.table(plan.map(({ charity, member }) => ({ charity, member })));
    }

    if (blocked.length > 0) {
      console.log("");
      console.log("ويبقى بلا مستلم (لا يعالجه هذا السكربت):");
      console.table(blocked);
    }

    if (!apply || plan.length === 0) {
      console.log("");
      console.log(apply ? "لا شيء ليطبق." : "لم يكتب شيء. أعده بـ --apply للتنفيذ.");
      return;
    }

    // صفقةٌ واحدة: إمّا أن تُكتب كلُّها أو لا يُكتب شيء.
    await client.query("BEGIN");
    try {
      for (const row of plan) {
        await client.query(
          `INSERT INTO "CharityMemberService" ("membershipId", "serviceName", "grantedAt")
           VALUES ($1, $2, NOW())
           ON CONFLICT ("membershipId", "serviceName") DO NOTHING`,
          [row.membershipId, service]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    console.log("");
    console.log(`فُوّض ${plan.length} عضوا.`);
    console.log("ولا يغني التفويض عن الصلاحية: صلاحية الخدمة تظل خامدة حتى تمنح للعضو.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
