// جدولة قسطٍ عالق «بانتظار المنحة الأولى» بتاريخ أول منحة لجمعيته.
//
// processFirstGrant كانت تُستدعى من نموذجٍ ماليٍّ أُزيل من الواجهة، فلم تُجدوَل
// أقساط «أول منحة» قطّ. الإصلاح يجدولها عند اعتماد المنحة القادمة؛ وهذا السكربت
// لما فات: قسط «رواء سقيا الماء» (٥٧,٥٠٠) أُنشئ ٧ يوليو، وسُجّلت أول منحة للجمعية
// في اليوم نفسه.
//
// التشغيل: node scripts/backfill-first-grant-installment.js          (معاينة)
//          node scripts/backfill-first-grant-installment.js --apply  (تنفيذ)
require("dotenv").config();
const { randomUUID } = require("crypto");
const { Pool } = require("pg");

const APPLY = process.argv.includes("--apply");
const CHARITY = "رواء سقيا الماء";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: charities } = await client.query(`select id from "Charity" where name = $1`, [CHARITY]);
    if (charities.length !== 1) throw new Error(`الجمعية غير موجودة: ${CHARITY}`);
    const charityId = charities[0].id;

    const { rows: pending } = await client.query(
      `select id, amount, "createdAt" from "ContractInstallment"
       where "charityId" = $1 and "isLinkedToFirstGrant" = true and "dueDate" is null
       for update`,
      [charityId]
    );
    if (pending.length !== 1) throw new Error(`المتوقع قسطٌ عالق واحد، وُجد ${pending.length}`);
    const inst = pending[0];

    const { rows: grants } = await client.query(
      `select min("createdAt") as first from "FinancialLog" where "charityId" = $1 and type = 'ADD_GRANT'`,
      [charityId]
    );
    const grantDate = grants[0].first;
    if (!grantDate) throw new Error("لا منحة مسجّلة للجمعية");

    console.log(`القسط:      ${inst.id}`);
    console.log(`المبلغ:     ${inst.amount}`);
    console.log(`أُنشئ:      ${inst.createdAt.toISOString()}`);
    console.log(`أول منحة:   ${grantDate.toISOString()}  ← تاريخ الاستحقاق الجديد`);

    if (!APPLY) {
      await client.query("ROLLBACK");
      console.log("\nمعاينة فقط. للتنفيذ: --apply");
      return;
    }

    const upd = await client.query(
      `update "ContractInstallment" set "dueDate" = $1, "updatedAt" = now()
       where id = $2 and "dueDate" is null`,
      [grantDate, inst.id]
    );
    if (upd.rowCount !== 1) throw new Error(`عُدّل ${upd.rowCount} صفّ، والمتوقع ١`);

    await client.query(
      `insert into "AuditLog" (id, "actorType", "actorName", action, "targetType", "targetId", metadata)
       values ($1, 'SYSTEM', $2, 'UPDATE', 'ContractInstallment', $3, $4)`,
      [
        randomUUID(),
        "scripts/backfill-first-grant-installment.js",
        inst.id,
        JSON.stringify({ reason: "first_grant_backfill", charityId, charityName: CHARITY, amount: inst.amount, dueDate: grantDate }),
      ]
    );

    await client.query("COMMIT");
    console.log("\n✓ نُفّذ وسُجّل في سجل التدقيق");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("✗", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
