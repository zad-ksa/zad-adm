/**
 * استيرادُ دفترِ حساباتِ جهاتٍ مانحةٍ لجمعيةٍ واحدة.
 *
 *     npm run donors:book -- --file="docs/حسابات الجهات المانحة ( جمعية رؤية للطفولة.xlsx" --charity="رؤية للطفولة"
 *     npm run donors:book -- --file="..." --charity="..." --apply
 *
 * **وبلا `--apply` لا يُكتب حرف**: يُطبع ما سيُسجَّل وما سيُتجاوز ولماذا.
 *
 * ولمَ أداةٌ ثانيةٌ و`donors:accounts` موجودة؟ لأنّ هذا الدفترَ شكلٌ آخر:
 *
 *   ١ **الجمعيةُ في اسم الملفّ لا في اسم الورقة.** وتلك الأداةُ تعرف الجمعيةَ
 *     من عنوان الورقة («حسابات ‹س›») — وورقةُ هذا الدفتر عنوانُها «حسابات
 *     الجهات المانحة»، وهو بعينه العنوانُ الذي **تتخطّاه** تلك الأداة لأنّه في
 *     دفترها فهرسُ الجهات لا حساباتُ جمعية. فتشغيلُها على هذا الملفّ يقرأ صفراً
 *     ولا يُخطئ — وهو أسوأُ من خطأ.
 *   ٢ **وفيه ما تُسقطه تلك الأداة**: رابطُ بوّابة الجهة (ارتباطٌ تشعُّبيٌّ على
 *     خليّة الاسم) ومجالاتُ دعمها. وتلك تُنشئ الجهةَ الناقصةَ باسمها وحدَه،
 *     فتبقى صفحةُ الجهة بلا رابطٍ ولا مجالات والبيانُ في الملفّ.
 *
 * فالأداةُ تأخذ الملفَّ والجمعيةَ وسيطين، لأنّ الدفاترَ تأتي دفتراً لكل جمعية.
 *
 * **وخانةُ «اسم المستخدم» ثلاثةُ أشياءٍ لا شيءٌ واحد**: اسمُ دخولٍ، أو حالُ
 * طلبٍ («في انتظار القبول»)، أو **رابطُ تقديمٍ مباشر** — جهاتٌ لا حسابَ لها
 * وإنّما نموذجٌ يُفتح. فمن قرأ العمودَ اسماً سجّل حساباتٍ لا تفتح وأضاع
 * الروابط. فيُفرَّق بين الثلاثة: العربيُّ ملاحظةٌ، وما بدأ بـ`http` رابطُ
 * الجهة، وما بقي اسمُ دخول.
 *
 * **ولا يُكتب فوق رابطٍ أو مجالاتٍ قائمة**: تُملأ الفارغةُ فقط. فصفوفُ الجهات
 * في القاعدة مُراجَعةٌ بيدِ موظّف، ودفترُ جمعيةٍ واحدةٍ لا يُنصَّب حَكَماً على
 * ما كتبه غيرُها — أمّا الفارغُ فلا يُخسَر بملئه.
 *
 * **وجهةٌ تكرّرت في الورقة بحسابين لا يُخمَّن لها واحد**: الحسابُ واحدٌ لكل
 * جمعيةٍ عند كل جهة (`@@unique([donorOrgId, charityId])`)، فأحدُهما يَطمِس
 * الآخر بترتيب الصفوف لا بقصد. فتُعرض الصفوفُ وتُترك، ويُسجَّل الباقي.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { encryptSecret } from "../src/lib/encryption.ts";
import { cleanCredential, cleanDonorName, looksLikeNote, normalizeDonorName } from "../src/lib/donorOrg.ts";

const APPLY = process.argv.includes("--apply");
const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const FILE = arg("file");
const CHARITY = arg("charity");
if (!FILE || !CHARITY) {
  console.log(
    'الاستعمال:\n  npm run donors:book -- --file="docs/‹الدفتر›.xlsx" --charity="‹اسم الجمعية›" [--apply]'
  );
  process.exit(1);
}

const say = (s = "") => console.log(s);

const unesc = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, " ")
    .replace(/&amp;/g, "&");

/**
 * يفتح الحزمةَ ويُعيد أوراقَها وقارئاً لصفوفِ كلِّ ورقةٍ مع ارتباطاتها.
 *
 * والـxlsx حزمةٌ مضغوطةٌ من XML، ولا مكتبةَ قراءةٍ في المشروع — والقراءةُ
 * بـ`unzip` وتعبيراتٍ على XML تكفي لورقةٍ من أربعة أعمدةٍ ولا تستحقّ تبعيّة.
 */
function openBook(path) {
  const dir = mkdtempSync(join(tmpdir(), "zad-book-"));
  execFileSync("unzip", ["-o", "-q", path, "-d", dir]);

  const strings = [];
  for (const m of readFileSync(join(dir, "xl/sharedStrings.xml"), "utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let t = "";
    for (const x of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += x[1];
    strings.push(unesc(t));
  }

  const targets = {};
  const rels = readFileSync(join(dir, "xl/_rels/workbook.xml.rels"), "utf8");
  for (const m of rels.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) targets[m[1]] = m[2];

  const sheets = [];
  const wb = readFileSync(join(dir, "xl/workbook.xml"), "utf8");
  for (const m of wb.matchAll(/<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"/g)) {
    sheets.push({ name: unesc(m[1]), file: targets[m[2]] });
  }

  const readSheet = (file) => {
    const xml = readFileSync(join(dir, "xl", file), "utf8");

    // **الرابطُ ليس نصّاً في خليّة**: مرجعُه في `<hyperlink ref="A7" r:id=…/>`
    // وهدفُه في ملفّ علاقات الورقة. فمن قرأ الخلايا وحدَها لم يجد رابطاً واحداً.
    const target = {};
    try {
      const sheetRels = readFileSync(join(dir, `xl/worksheets/_rels/${file.split("/").pop()}.rels`), "utf8");
      for (const m of sheetRels.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]*)"/g)) target[m[1]] = unesc(m[2]);
    } catch {
      /* ورقةٌ بلا ارتباطات */
    }
    const linkOf = {};
    for (const m of xml.matchAll(/<hyperlink ref="([A-Z]+)(\d+)"[^>]*r:id="(rId\d+)"/g)) {
      linkOf[`${m[1]}${m[2]}`] = target[m[3]];
    }

    const rows = [];
    for (const r of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const cell = {};
      // الخلايا الفارغة تُكتب مُغلقةً على نفسها (`<c .../>`)، فتُقبل الصيغتان —
      // وإلّا امتدّ التعبيرُ فوقها إلى خليةٍ تالية ونُسبت قيمتُها إليها.
      for (const c of r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const inner = c[3];
        if (!inner) continue;
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        if (v === undefined) continue;
        cell[c[1]] = /t="s"/.test(c[2]) ? (strings[Number(v)] ?? "") : v;
      }
      rows.push({ n: Number(r[1]), cell, link: (col) => linkOf[`${col}${r[1]}`] ?? null });
    }
    return rows;
  };

  return { sheets, readSheet, close: () => rmSync(dir, { recursive: true, force: true }) };
}

/** العمودُ التالي لعمودٍ بحرفٍ واحد. يكفي: الدفاترُ أربعةُ أعمدة. */
const nextCol = (col) => String.fromCharCode(col.charCodeAt(0) + 1);

const isUrl = (v) => /^https?:\/\//i.test(v);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }),
});

const book = openBook(FILE);
try {
  // ── الجمعية ───────────────────────────────────────────────────────────────
  const charities = await prisma.charity.findMany({ select: { id: true, name: true } });
  const key = normalizeDonorName(CHARITY.replace(/^جمعية\s*/, ""));
  const hits = charities.filter((c) => {
    const n = normalizeDonorName(c.name);
    return n === key || n.startsWith(key + " ") || n.includes(key);
  });
  if (hits.length !== 1) {
    say(
      hits.length === 0
        ? `لا جمعيةَ في القاعدة تُطابق «${CHARITY}».`
        : `«${CHARITY}» تُطابق ${hits.length} جمعيات: ${hits.map((h) => h.name).join("، ")} — سمِّها بدقّة.`
    );
    process.exit(1);
  }
  const charity = hits[0];
  say(`الجمعية: ${charity.name}`);

  // ── الورقةُ وأعمدتُها ──────────────────────────────────────────────────────
  // تُعرف الورقةُ بعنوانِ «اسم الجهة المانحة» في صفٍّ منها، لا بترتيبها ولا
  // باسمها: الترتيبُ يتغيّر والاسمُ يختلف من دفترٍ إلى دفتر.
  let found = null;
  for (const sheet of book.sheets) {
    const rows = book.readSheet(sheet.file);
    for (const row of rows) {
      const cols = {};
      for (const [col, raw] of Object.entries(row.cell)) {
        const text = cleanDonorName(String(raw));
        if (text === "اسم الجهة المانحة") cols.donor = col;
        else if (text === "اسم المستخدم") cols.user = col;
        else if (text === "كلمة المرور") cols.pass = col;
        else if (text.includes("مجال")) cols.fields = col;
      }
      if (cols.donor && cols.user && cols.pass) {
        found = { sheet, rows, headerRow: row.n, cols, headerCell: row.cell };
        break;
      }
    }
    if (found) break;
  }
  if (!found) {
    say("لم يُعرف صفُّ العناوين في أيِّ ورقة — لا «اسم الجهة المانحة» في الدفتر.");
    process.exit(1);
  }

  const { sheet, rows, headerRow, cols, headerCell } = found;
  // عمودُ المجالات بلا عنوانٍ يدلُّ عليه: يُؤخذ التاليَ لكلمة المرور، **ويُطبع
  // عنوانُه كما هو** — فعنوانُ هذا الدفتر «الربدي»، وهو اسمُ جهةٍ سقط في خانة
  // العنوان. فالأخذُ بالموضع صحيحٌ والسكوتُ عنه ليس كذلك.
  if (!cols.fields) {
    const guess = nextCol(cols.pass);
    if (rows.some((r) => r.n > headerRow && r.cell[guess])) {
      cols.fields = guess;
      say(
        `عمودُ المجالات: ${guess} — بالموضع لا بالعنوان، فعنوانُه «${cleanDonorName(String(headerCell[guess] ?? ""))}».`
      );
    }
  }
  say(
    `الورقة: «${sheet.name}» · العناوينُ في الصفّ ${headerRow} · ` +
      `الجهة=${cols.donor} المستخدم=${cols.user} المرور=${cols.pass}${cols.fields ? ` المجالات=${cols.fields}` : ""}`
  );

  // ── الجهاتُ القائمة ───────────────────────────────────────────────────────
  const orgs = await prisma.donorOrg.findMany({ select: { id: true, name: true, url: true, fields: true } });
  const orgByNorm = new Map(orgs.map((o) => [normalizeDonorName(o.name), o]));

  const existingAccounts = new Set(
    (await prisma.donorAccount.findMany({ where: { charityId: charity.id }, select: { donorOrgId: true } })).map(
      (a) => a.donorOrgId
    )
  );

  // ── القراءة ───────────────────────────────────────────────────────────────
  const read = [];
  const seen = new Map(); // اسمٌ مسوّىً → أرقامُ صفوفه، لكشف التكرار
  for (const row of rows) {
    if (row.n <= headerRow) continue;
    const name = cleanDonorName(String(row.cell[cols.donor] ?? ""));
    if (!name) continue;

    const norm = normalizeDonorName(name);
    seen.set(norm, [...(seen.get(norm) ?? []), row.n]);

    const rawUser = cleanCredential(String(row.cell[cols.user] ?? ""));
    const rawPass = cleanCredential(String(row.cell[cols.pass] ?? ""));
    const fields = cleanDonorName(String(row.cell[cols.fields] ?? "")) || null;
    // رابطُ الخليّة أوّلاً، فإن لم يكن ورابطٌ في خانة المستخدم فهو رابطُ الجهة.
    const url = row.link(cols.donor) || (isUrl(rawUser) ? rawUser : null);

    let username = null;
    let password = null;
    let why = null;
    if (isUrl(rawUser)) why = "رابطُ تقديمٍ مباشر، لا حساب";
    else if (rawUser && looksLikeNote(rawUser)) why = `حالُ طلبٍ لا حساب: «${rawUser}»`;
    else if (rawPass && looksLikeNote(rawPass)) why = `حالُ طلبٍ في كلمة المرور: «${rawPass}»`;
    else if (!rawUser && !rawPass) why = "لا اسمَ ولا كلمةَ مرور";
    else if (!rawUser) why = "لا اسمَ مستخدم";
    else if (!rawPass) why = "لا كلمةَ مرور";
    else {
      username = rawUser;
      password = rawPass;
    }

    read.push({ n: row.n, name, norm, url, fields, username, password, why, org: orgByNorm.get(norm) ?? null });
  }

  const duplicated = new Set([...seen].filter(([, ns]) => ns.length > 1).map(([norm]) => norm));

  // ── الخطّة ────────────────────────────────────────────────────────────────
  const newOrgs = new Map(); // norm → {name, url, fields}
  const fillOrgs = []; // جهاتٌ قائمةٌ يُملأ فارغُها
  const accounts = [];
  const skipped = [];
  const conflicts = [];

  for (const r of read) {
    if (!r.org && !newOrgs.has(r.norm)) newOrgs.set(r.norm, { name: r.name, url: r.url, fields: r.fields });
    else if (!r.org) {
      // صفٌّ ثانٍ لجهةٍ جديدة: يُكمِل ما نقص في الأوّل ولا يُبدِّله.
      const pending = newOrgs.get(r.norm);
      pending.url ??= r.url;
      pending.fields ??= r.fields;
    } else {
      const patch = {};
      if (!r.org.url?.trim() && r.url) patch.url = r.url;
      if (!r.org.fields?.trim() && r.fields) patch.fields = r.fields;
      if (Object.keys(patch).length) fillOrgs.push({ org: r.org, patch, n: r.n });
    }

    if (r.why) {
      skipped.push({ n: r.n, name: r.name, why: r.why });
      continue;
    }
    if (duplicated.has(r.norm)) {
      conflicts.push(r);
      continue;
    }
    accounts.push(r);
  }

  say();
  say(`صفوفُ الورقة: ${read.length} جهةً`);
  say();
  say(`حساباتٌ تُسجَّل: ${accounts.length}`);
  const fresh = accounts.filter((a) => !a.org || !existingAccounts.has(a.org.id)).length;
  say(`  منها جديدٌ على هذه الجمعية: ${fresh} · ويُحدَّث: ${accounts.length - fresh}`);

  if (newOrgs.size) {
    say();
    say(`جهاتٌ ليست في القاعدة (${newOrgs.size}) — ${APPLY ? "تُنشأ" : "ستُنشأ"} برابطها ومجالاتها:`);
    for (const o of newOrgs.values()) {
      say(`  + ${o.name}${o.url ? `  ⟶ ${o.url}` : "  (بلا رابط)"}${o.fields ? "" : "  (بلا مجالات)"}`);
    }
  }

  if (fillOrgs.length) {
    say();
    say(`جهاتٌ قائمةٌ يُملأ فارغُها (${fillOrgs.length}) — ولا يُكتب فوق قائمٍ:`);
    for (const f of fillOrgs) {
      say(`  ~ ${f.org.name}: ${Object.keys(f.patch).map((k) => (k === "url" ? "الرابط" : "المجالات")).join(" و")}`);
    }
  }

  if (conflicts.length) {
    say();
    say(`⚠ جهةٌ تكرّرت بحسابين — تُركت كلُّها، فالحسابُ واحدٌ لكل جمعيةٍ عند كل جهة:`);
    for (const c of conflicts) say(`  ! صفّ ${c.n} · ${c.name} · ${c.username} / ${c.password}`);
    say("    اختر صفّاً وامسح الآخرَ من الملفّ، أو سجِّله من صفحة الجهة.");
  }

  if (skipped.length) {
    say();
    const byWhy = new Map();
    for (const s of skipped) {
      const k = s.why.startsWith("حالُ طلب") ? "حالُ طلبٍ في خانة الدخول" : s.why;
      byWhy.set(k, (byWhy.get(k) ?? 0) + 1);
    }
    say(`صفوفٌ بلا حسابٍ يُسجَّل: ${skipped.length}`);
    for (const [why, n] of [...byWhy].sort((a, b) => b[1] - a[1])) say(`  · ${why}: ${n}`);

    // نصفُ حسابٍ يُسمّى صفّاً صفّاً: ثغراتٌ يملؤها صاحبُها، لا عددٌ يُنسى.
    const half = skipped.filter((s) => s.why === "لا اسمَ مستخدم" || s.why === "لا كلمةَ مرور" || s.why.startsWith("حالُ طلب"));
    if (half.length) {
      say();
      say(`ونصفُ حسابٍ في ${half.length} صفّاً:`);
      for (const s of half) say(`  ! صفّ ${s.n} · ${s.name} — ${s.why}`);
    }
  }

  if (!APPLY) {
    say();
    say("هذه قراءةٌ فقط. للتنفيذ: أضف --apply");
    process.exit(0);
  }

  // ── الكتابة ───────────────────────────────────────────────────────────────
  for (const [norm, o] of newOrgs) {
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "DonorOrg" ("id", "name", "url", "fields", "kind", "updatedAt")
      VALUES (${id}, ${o.name}, ${o.url}, ${o.fields}, 'FOUNDATION', now())
      ON CONFLICT ("name") DO NOTHING
    `;
    const row = await prisma.donorOrg.findFirst({ where: { name: o.name }, select: { id: true, name: true } });
    if (row) orgByNorm.set(norm, row);
  }

  for (const f of fillOrgs) {
    await prisma.donorOrg.update({ where: { id: f.org.id }, data: f.patch });
  }

  let written = 0;
  for (const a of accounts) {
    const org = a.org ?? orgByNorm.get(a.norm);
    if (!org) continue;
    await prisma.donorAccount.upsert({
      where: { donorOrgId_charityId: { donorOrgId: org.id, charityId: charity.id } },
      create: {
        donorOrgId: org.id,
        charityId: charity.id,
        username: a.username,
        password: encryptSecret(a.password),
      },
      update: { username: a.username, password: encryptSecret(a.password) },
    });
    written++;
  }

  say();
  say(`أُنشئ: ${newOrgs.size} جهةً · مُلئ فارغُ: ${fillOrgs.length} · سُجِّل: ${written} حساباً.`);
  say(
    `والمجموعُ في القاعدة: ${await prisma.donorOrg.count()} جهةً · ` +
      `${await prisma.donorAccount.count({ where: { charityId: charity.id } })} حساباً لهذه الجمعية.`
  );
} finally {
  book.close();
  await prisma.$disconnect();
}
