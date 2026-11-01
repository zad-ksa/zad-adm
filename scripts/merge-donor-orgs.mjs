/**
 * دمجُ جهتين مانحتين في صفٍّ واحد.
 *
 *     node -r dotenv/config --experimental-strip-types scripts/merge-donor-orgs.mjs --keep="…" --drop="…"
 *     …                                                                            --apply
 *
 * **بلا `--apply` لا يُكتب حرف**: يُطبع ما سيُنقل وما سيُحذف، و**كلُّ اختلافٍ
 * بين الصفّين** — فحسابٌ لجمعيةٍ في الصفّين بكلمتي مرورٍ مختلفتين لا يُحسم
 * بالصدفة. والمُبقى يُرجَّح، والمُسقَط يُحذف بعد نقل ما ليس في المُبقى.
 *
 * ولا تُطبع كلماتُ المرور: يُقال «متطابقة» أو «مختلفة»، فمن أراد القيمةَ
 * قرأها من صفحة الجهة.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { decryptSecret } from "../src/lib/encryption.ts";
import { cleanDonorName } from "../src/lib/donorOrg.ts";

const APPLY = process.argv.includes("--apply");
const argOf = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const KEEP = argOf("keep");
const DROP = argOf("drop");
/**
 * قيمٌ تُحسم يداً: الاسمُ والرابطُ والمجالات.
 *
 * فالمجالاتُ في الصفّين قد تتكامل لا تتعارض، والرابطان قد يكونا مسارين في
 * بوّابةٍ واحدة — واختيارُ أحدهما بالصدفة (الأوّلَ مثلاً) يُسقط نصفَ المعلومة.
 * فمن يدمج يقول ما يُبقي.
 */
const RENAME = argOf("rename");
const URL_ARG = argOf("url");
const FIELDS_ARG = argOf("fields");

if (!KEEP || !DROP) {
  console.error("الاستعمال: --keep=\"اسم الجهة المُبقاة\" --drop=\"اسم الجهة المدموجة\" [--rename=\"اسم جديد\"] [--apply]");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }),
});

const say = (s = "") => console.log(s);

const SELECT = {
  id: true,
  name: true,
  url: true,
  fields: true,
  kind: true,
  intakeStatus: true,
  opensAt: true,
  closesAt: true,
  notes: true,
  accounts: { select: { id: true, username: true, password: true, charityId: true, charity: { select: { name: true } } } },
  grants: { select: { id: true } },
};

try {
  const keep = await prisma.donorOrg.findUnique({ where: { name: KEEP }, select: SELECT });
  const drop = await prisma.donorOrg.findUnique({ where: { name: DROP }, select: SELECT });
  if (!keep) throw new Error(`لا جهةَ باسم «${KEEP}»`);
  if (!drop) throw new Error(`لا جهةَ باسم «${DROP}»`);
  if (keep.id === drop.id) throw new Error("الصفّان واحد");

  say(`المُبقاة: ${keep.name}  (حسابات ${keep.accounts.length} · منح ${keep.grants.length})`);
  say(`المدموجة: ${drop.name}  (حسابات ${drop.accounts.length} · منح ${drop.grants.length})`);

  // ── اختلافاتُ بيانات الجهة ───────────────────────────────────────────────
  const diffs = [];
  for (const key of ["url", "fields", "kind", "intakeStatus", "notes"]) {
    const a = keep[key] ?? null;
    const b = drop[key] ?? null;
    if (String(a ?? "") !== String(b ?? "")) diffs.push({ key, keep: a, drop: b });
  }
  for (const key of ["opensAt", "closesAt"]) {
    const a = keep[key] ? keep[key].toISOString().slice(0, 10) : null;
    const b = drop[key] ? drop[key].toISOString().slice(0, 10) : null;
    if (a !== b) diffs.push({ key, keep: a, drop: b });
  }

  say();
  if (diffs.length === 0) {
    say("بياناتُ الجهتين متطابقة.");
  } else {
    say(`اختلافاتٌ في بيانات الجهة (${diffs.length}):`);
    for (const d of diffs) {
      say(`  · ${d.key}:`);
      say(`      المُبقاة : ${d.keep === null ? "—" : String(d.keep).slice(0, 110)}`);
      say(`      المدموجة: ${d.drop === null ? "—" : String(d.drop).slice(0, 110)}`);
    }
  }

  // ── الحسابات ─────────────────────────────────────────────────────────────
  const keepByCharity = new Map(keep.accounts.map((a) => [a.charityId, a]));
  const moving = [];
  const clashes = [];
  for (const acc of drop.accounts) {
    const mine = keepByCharity.get(acc.charityId);
    if (!mine) {
      moving.push(acc);
      continue;
    }
    const sameUser = mine.username === acc.username;
    const samePass = decryptSecret(mine.password) === decryptSecret(acc.password);
    if (!sameUser || !samePass) clashes.push({ acc, mine, sameUser, samePass });
  }

  say();
  say(`حساباتٌ تُنقل إلى المُبقاة (${moving.length}):`);
  for (const a of moving) say(`  + ${a.charity.name}: ${a.username}`);
  if (moving.length === 0) say("  لا شيء");

  say();
  if (clashes.length === 0) {
    say("لا تعارضَ في الحسابات المشتركة: المستخدمُ وكلمةُ المرور متطابقان في كلّ جمعية.");
  } else {
    say(`⚠ حساباتٌ في الصفّين وتختلف (${clashes.length}) — تُبقى نسخةُ المُبقاة وتُحذف الأخرى:`);
    for (const c of clashes) {
      const bits = [
        `المستخدم ${c.sameUser ? "متطابق" : `مختلف (المُبقاة: ${c.mine.username} · المدموجة: ${c.acc.username})`}`,
        `كلمة المرور ${c.samePass ? "متطابقة" : "مختلفة"}`,
      ];
      say(`  ! ${c.acc.charity.name}: ${bits.join(" · ")}`);
    }
    say("  وتحقّقْ من هذه الحسابات في بوّابة الجهة: الصحيحُ واحدٌ منهما، والسكربتُ لا يعرفه.");
  }

  const newName = RENAME ? cleanDonorName(RENAME) : null;
  const edits = {};
  if (newName && newName !== keep.name) edits.name = newName;
  if (URL_ARG !== null && URL_ARG !== keep.url) edits.url = URL_ARG || null;
  if (FIELDS_ARG !== null && FIELDS_ARG !== keep.fields) edits.fields = FIELDS_ARG || null;

  if (Object.keys(edits).length > 0) {
    say();
    say("تعديلاتٌ على المُبقاة:");
    for (const [key, value] of Object.entries(edits)) say(`  · ${key} = ${String(value ?? "—").slice(0, 120)}`);
  }

  if (!APPLY) {
    say();
    say("هذه قراءةٌ فقط. للتنفيذ: أعد التشغيل بـ --apply");
  } else {
    await prisma.$transaction(async (tx) => {
      // المنحُ أولاً: لا تعارضَ فيها، فالمنحةُ تُشير إلى جهةٍ واحدة.
      const grants = await tx.grantApplication.updateMany({
        where: { donorOrgId: drop.id },
        data: { donorOrgId: keep.id },
      });
      // ثم الحساباتُ غيرُ المتعارضة. والقيدُ الفريد `(donorOrgId, charityId)`
      // يمنع نقلَ ما له نظيرٌ، فيُنقل المسموحُ وحده ويُحذف الباقي مع الصفّ.
      for (const acc of moving) {
        await tx.donorAccount.update({ where: { id: acc.id }, data: { donorOrgId: keep.id } });
      }
      /**
       * ما تبقّى من حسابات المدموجة يُحذف صريحاً.
       *
       * و`DonorAccount.donorOrgId` موضوعٌ على `Restrict` عن قصد: حذفُ جهةٍ لا
       * يَجرُف حساباتِ عشرِ جمعياتٍ وكلماتَ مرورها ضِمناً. فالحذفُ هنا بأمرٍ
       * مكتوبٍ على ما أُعلن في التقرير — لا جرفٌ صامتٌ من القاعدة.
       */
      const left = await tx.donorAccount.deleteMany({ where: { donorOrgId: drop.id } });
      await tx.donorOrg.delete({ where: { id: drop.id } });
      if (Object.keys(edits).length > 0) {
        await tx.donorOrg.update({ where: { id: keep.id }, data: edits });
      }
      say();
      say(`نُقل: ${grants.count} منحة و${moving.length} حساباً. وحُذف صفُّ «${drop.name}» ومعه ${left.count} حساباً (مكرَّراً أو متعارضاً).`);
    });

    const after = await prisma.donorOrg.findUnique({
      where: { id: keep.id },
      select: { name: true, _count: { select: { accounts: true, grants: true } } },
    });
    say(`الآن: «${after.name}» — حسابات ${after._count.accounts} · منح ${after._count.grants}`);
  }
} catch (e) {
  console.error("فشل:", e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
