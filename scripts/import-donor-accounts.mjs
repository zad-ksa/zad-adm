/**
 * استيرادُ حسابات الدخول من جداول الحسابات.
 *
 *     node -r dotenv/config --experimental-strip-types scripts/import-donor-accounts.mjs
 *     node -r dotenv/config --experimental-strip-types scripts/import-donor-accounts.mjs --apply
 *
 * **بلا `--apply` لا يُكتب حرف**: يُطبع ما سيُسجَّل وما سيُتجاوز ولماذا.
 *
 * ومصدرُه ملفّان:
 *
 * - `حسابات الجهات المانحة.xlsx` — ورقةٌ لكل جمعية باسم «حسابات ‹س›»،
 *   أعمدتُها: الجهة، اسم المستخدم، كلمة المرور، ملاحظات. **ولا يُفترض أنها
 *   A وB وC**: ورقةُ «حسابات المعاقد» تبدأ من العمود O، فيُبحث عن صفّ العناوين
 *   وتُؤخذ أعمدتُه كما هي.
 * - `حسابات زاد - الملف النهائي.xlsx` — ورقةٌ واحدةٌ لشركة زاد، واسمُ المستخدم
 *   وكلمةُ المرور فيها في عمودين متأخّرين بعد أعمدة حال التسجيل.
 *
 * وما لا يُسجَّل يُقال لا يُسكت عنه: صفٌّ بلا كلمة مرور، أو خانةُ دخولٍ فيها
 * كلامٌ عربيٌّ («جاري الارسال») فهي حالُ طلبٍ لا حساب — وتسجيلُها يَعِدُ بدخولٍ
 * لا يفتح.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { encryptSecret } from "../src/lib/encryption.ts";
import { cleanCredential, cleanDonorName, looksLikeNote, normalizeDonorName } from "../src/lib/donorOrg.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");

const CHARITY_BOOK = join(root, "docs", "حسابات الجهات المانحة.xlsx");
const ZAD_BOOK = join(root, "docs", "حسابات زاد - الملف النهائي.xlsx");

/**
 * هجاءاتٌ لجهةٍ واحدةٍ لا تُدركها التسويةُ الحرفية.
 *
 * و«العجيمي»/«العجمي» حرفٌ واحدٌ يفصل بينهما، والصدرُ والعجزُ واحدٌ
 * («مؤسسة عبد العزيز ومحمد … وعائلتهم الخيرية») — فهما جهةٌ واحدة. وإنشاءُ
 * صفٍّ ثانٍ لها يُعيد الداءَ الذي عولج: جهةٌ واحدةٌ بسطرين وأرقامٌ مقسومةٌ
 * بينهما.
 */
const ALIASES = [
  { from: "مؤسسة عبدالعزيز وسعد الموسى", to: "مؤسسة سعد وعبدالعزيز الموسى" },
  { from: "مؤسسة عبد العزيز ومحمد العجيمي وعائلتهم الخيرية", to: "مؤسسة عبد العزيز ومحمد العجمي وعائلتهم الخيرية" },
];

const unesc = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#10;/g, " ").replace(/&amp;/g, "&");

/** يفتح الحزمةَ ويُعيد قارئاً للأوراق باسمها. */
function openBook(path) {
  const dir = mkdtempSync(join(tmpdir(), "zad-accounts-"));
  execFileSync("unzip", ["-o", "-q", path, "-d", dir]);

  const strings = [];
  for (const m of readFileSync(join(dir, "xl/sharedStrings.xml"), "utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let t = "";
    for (const x of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += x[1];
    strings.push(unesc(t));
  }

  const rels = readFileSync(join(dir, "xl/_rels/workbook.xml.rels"), "utf8");
  const targets = {};
  for (const m of rels.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) targets[m[1]] = m[2];

  const sheets = [];
  const wb = readFileSync(join(dir, "xl/workbook.xml"), "utf8");
  for (const m of wb.matchAll(/<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"/g)) {
    sheets.push({ name: unesc(m[1]), file: targets[m[2]] });
  }

  const rowsOf = (file) => {
    const xml = readFileSync(join(dir, "xl", file), "utf8");
    const out = [];
    for (const r of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const cell = {};
      for (const c of r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const inner = c[3];
        if (!inner) continue;
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        if (v === undefined) continue;
        cell[c[1]] = /t="s"/.test(c[2]) ? (strings[Number(v)] ?? "") : v;
      }
      out.push({ n: Number(r[1]), cell });
    }
    return out;
  };

  return { sheets, rowsOf, close: () => rmSync(dir, { recursive: true, force: true }) };
}

/**
 * يجد صفَّ العناوين وأعمدتَه.
 *
 * `wants` خريطةُ مفتاحٍ ← عنوانٍ في الورقة. والبحثُ بالاحتواء لا بالتطابق:
 * العناوينُ تُكتب بمسافاتٍ زائدة.
 */
function findHeader(rows, wants) {
  for (const row of rows) {
    const found = {};
    for (const [col, raw] of Object.entries(row.cell)) {
      const text = cleanDonorName(String(raw));
      for (const [key, label] of Object.entries(wants)) {
        if (!found[key] && text === label) found[key] = col;
      }
    }
    if (Object.keys(found).length === Object.keys(wants).length) return { headerRow: row.n, cols: found };
  }
  return null;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }),
});

const say = (s = "") => console.log(s);

try {
  const charities = await prisma.charity.findMany({ select: { id: true, name: true } });
  const orgs = await prisma.donorOrg.findMany({ select: { id: true, name: true } });
  const orgByNorm = new Map(orgs.map((o) => [normalizeDonorName(o.name), o]));
  for (const a of ALIASES) {
    const t = orgByNorm.get(normalizeDonorName(a.to));
    if (t) orgByNorm.set(normalizeDonorName(a.from), t);
  }

  /** «حسابات الرأفة» ← صفُّ «الرأفة الإنسانية». */
  function charityFor(sheetName) {
    const key = normalizeDonorName(sheetName.replace(/^حسابات\s*/, ""));
    const hits = charities.filter((c) => {
      const n = normalizeDonorName(c.name);
      return n === key || n.startsWith(key + " ") || n.includes(key);
    });
    return hits.length === 1 ? hits[0] : null;
  }

  /** جداولُ القراءة: {charity, donorName, username, password} أو سببُ التجاوز. */
  const planned = [];
  const skipped = [];
  const missingOrgs = new Map();

  function take(charity, donorRaw, userRaw, passRaw, where) {
    const donorName = cleanDonorName(donorRaw || "");
    if (!donorName) return;

    const username = cleanCredential(userRaw || "");
    const password = cleanCredential(passRaw || "");

    if (!username || !password) {
      skipped.push({ where, donorName, why: !username && !password ? "لا اسمَ ولا كلمةَ مرور" : !username ? "لا اسمَ مستخدم" : "لا كلمةَ مرور" });
      return;
    }
    if (looksLikeNote(username) || looksLikeNote(password)) {
      skipped.push({ where, donorName, why: `حالُ طلبٍ لا حساب: «${looksLikeNote(username) ? username : password}»` });
      return;
    }

    const org = orgByNorm.get(normalizeDonorName(donorName));
    if (!org) {
      if (!missingOrgs.has(normalizeDonorName(donorName))) missingOrgs.set(normalizeDonorName(donorName), donorName);
    }
    planned.push({ charity, donorName, org, username, password, where });
  }

  // ── ملفُّ الجمعيات ────────────────────────────────────────────────────────
  const book = openBook(CHARITY_BOOK);
  try {
    for (const sheet of book.sheets) {
      if (!sheet.name.startsWith("حسابات ") || sheet.name === "حسابات الجهات المانحة") continue;

      const charity = charityFor(sheet.name);
      if (!charity) {
        say(`⚠ «${sheet.name}»: لا جمعيةَ تُطابقها في القاعدة — تُركت.`);
        continue;
      }

      const rows = book.rowsOf(sheet.file);
      const head = findHeader(rows, { donor: "اسم الجهة المانحة", user: "اسم المستخدم", pass: "كلمة المرور" });
      if (!head) {
        say(`⚠ «${sheet.name}»: لم يُعرف صفُّ العناوين — تُركت.`);
        continue;
      }

      for (const row of rows) {
        if (row.n <= head.headerRow) continue;
        take(charity, row.cell[head.cols.donor], row.cell[head.cols.user], row.cell[head.cols.pass], charity.name);
      }
    }
  } finally {
    book.close();
  }

  // ── ملفُّ زاد ─────────────────────────────────────────────────────────────
  const zadCharity = charities.find((c) => normalizeDonorName(c.name) === normalizeDonorName("شركة زاد"));
  const zadBook = openBook(ZAD_BOOK);
  try {
    if (!zadCharity) {
      say("⚠ «شركة زاد» غير موجودةٍ في القاعدة — تُرك ملفُها.");
    } else {
      const sheet = zadBook.sheets.find((s) => s.name === "حسابات الجهات المانحة");
      const rows = zadBook.rowsOf(sheet.file);
      const head = findHeader(rows, { donor: "اسم الجهة المانحة", user: "اسم المستخدم", pass: "كلمة المرور" });
      if (!head) {
        say("⚠ ملفُّ زاد: لم يُعرف صفُّ العناوين — تُرك.");
      } else {
        for (const row of rows) {
          if (row.n <= head.headerRow) continue;
          take(zadCharity, row.cell[head.cols.donor], row.cell[head.cols.user], row.cell[head.cols.pass], zadCharity.name);
        }
      }
    }
  } finally {
    zadBook.close();
  }

  // ── التقرير ───────────────────────────────────────────────────────────────
  const byCharity = new Map();
  for (const p of planned) {
    byCharity.set(p.where, (byCharity.get(p.where) ?? 0) + 1);
  }
  say("ما سيُسجَّل:");
  for (const [name, n] of [...byCharity].sort((a, b) => b[1] - a[1])) say(`  · ${name}: ${n} حساباً`);
  say(`  المجموع: ${planned.length}`);

  if (missingOrgs.size > 0) {
    say();
    say(`جهاتٌ ليست في جدول الجهات (${missingOrgs.size}) — ${APPLY ? "تُنشأ" : "ستُنشأ"} صفوفاً جديدة:`);
    for (const name of missingOrgs.values()) say(`  + ${name}`);
  }

  const byReason = new Map();
  for (const s of skipped) {
    const key = s.why.startsWith("حالُ طلب") ? "حالُ طلبٍ في خانة الدخول" : s.why;
    byReason.set(key, (byReason.get(key) ?? 0) + 1);
  }
  say();
  say(`صفوفٌ تُتجاوز: ${skipped.length}`);
  for (const [why, n] of [...byReason].sort((a, b) => b[1] - a[1])) say(`  · ${why}: ${n}`);

  // ما فيه نصفُ حسابٍ يُسمّى صفّاً صفّاً: هذه ثغراتٌ يملؤها صاحبُها، لا صفوفٌ
  // فارغةٌ تُعدّ وتُنسى.
  const half = skipped.filter((s) => s.why === "لا اسمَ مستخدم" || s.why === "لا كلمةَ مرور" || s.why.startsWith("حالُ طلب"));
  if (half.length > 0) {
    say();
    say(`ونصفُ حسابٍ في ${half.length} صفّاً — اسمٌ بلا كلمةِ مرورٍ أو العكس:`);
    for (const s of half) say(`  ! [${s.where}] ${s.donorName} — ${s.why}`);
  }

  if (!APPLY) {
    say();
    say("هذه قراءةٌ فقط. للتنفيذ: أعد التشغيل بـ --apply");
  } else {
    for (const [norm, display] of missingOrgs) {
      const id = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "DonorOrg" ("id", "name", "kind", "updatedAt")
        VALUES (${id}, ${display}, 'FOUNDATION', now())
        ON CONFLICT ("name") DO NOTHING
      `;
      const row = await prisma.donorOrg.findFirst({ where: { name: display }, select: { id: true, name: true } });
      orgByNorm.set(norm, row);
    }

    let written = 0;
    for (const p of planned) {
      const org = p.org ?? orgByNorm.get(normalizeDonorName(p.donorName));
      if (!org) continue;
      await prisma.donorAccount.upsert({
        where: { donorOrgId_charityId: { donorOrgId: org.id, charityId: p.charity.id } },
        create: {
          donorOrgId: org.id,
          charityId: p.charity.id,
          username: p.username,
          password: encryptSecret(p.password),
        },
        update: { username: p.username, password: encryptSecret(p.password) },
      });
      written++;
    }

    say();
    say(`سُجِّل: ${written} حساباً. والمجموع في القاعدة الآن: ${await prisma.donorAccount.count()}.`);
  }
} finally {
  await prisma.$disconnect();
}
