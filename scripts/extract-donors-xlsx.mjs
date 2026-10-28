/**
 * استخراجُ الجهات المانحة من `docs/حسابات الجهات المانحة.xlsx`
 * إلى `prisma/seed-data/donor-orgs.json`.
 *
 *     node scripts/extract-donors-xlsx.mjs
 *
 * والملفُ xlsx حزمةٌ مضغوطةٌ من XML، ولا مكتبةَ قراءةٍ في المشروع — فالقراءةُ
 * هنا بـ`unzip` إلى مجلدٍ مؤقّتٍ ثم بتعبيراتٍ على XML. وهذا يكفي لورقةٍ واحدةٍ
 * من أربعة أعمدة، ولا يستحقّ تبعيّةً جديدة.
 *
 * **والرابطُ ليس نصّاً في عمود**، بل ارتباطٌ تشعُّبيٌّ على خلية الاسم: مرجعُه
 * في `<hyperlink ref="A7" r:id="rId6"/>` داخل الورقة، وهدفُه في ملف العلاقات
 * `_rels/sheet2.xml.rels`. ومن قرأ الخلايا وحدها لم يجد رابطاً واحداً.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanDonorName } from "../src/lib/donorOrg.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "docs", "حسابات الجهات المانحة.xlsx");
const OUT = join(root, "prisma", "seed-data", "donor-orgs.json");
/** ورقةُ «حسابات الجهات المانحة» هي الثانية في الحزمة. */
const SHEET = "sheet2.xml";

const unesc = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, " ")
    .replace(/&amp;/g, "&");

const dir = mkdtempSync(join(tmpdir(), "zad-donors-"));
try {
  execFileSync("unzip", ["-o", "-q", SOURCE, "-d", dir], { stdio: "inherit" });

  const strings = [];
  for (const m of readFileSync(join(dir, "xl/sharedStrings.xml"), "utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let text = "";
    for (const t of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += t[1];
    strings.push(unesc(text));
  }

  const target = {};
  const rels = readFileSync(join(dir, `xl/worksheets/_rels/${SHEET}.rels`), "utf8");
  for (const m of rels.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]*)"/g)) target[m[1]] = unesc(m[2]);

  const xml = readFileSync(join(dir, "xl/worksheets", SHEET), "utf8");
  const linkOf = {};
  for (const m of xml.matchAll(/<hyperlink ref="([A-Z]+\d+)"[^>]*r:id="(rId\d+)"/g)) linkOf[m[1]] = target[m[2]];

  const rows = [];
  for (const r of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const n = Number(r[1]);
    if (n < 2) continue; // الصفُّ الأول عنوانٌ

    const cell = {};
    // الخلايا الفارغة تُكتب مُغلقةً على نفسها (`<c .../>`)، فلا بدّ من قبول
    // الصيغتين — وإلا امتدّ التعبيرُ فوقها إلى خليةٍ تالية ونُسبت قيمتُها إليها.
    for (const c of r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const inner = c[3];
      if (!inner) continue;
      const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      if (v === undefined) continue;
      cell[c[1]] = /t="s"/.test(c[2]) ? (strings[Number(v)] ?? "") : v;
    }

    const name = cleanDonorName(cell.A || "");
    if (!name) continue;
    rows.push({
      name,
      url: linkOf[`A${n}`] || null,
      fields: cleanDonorName(cell.D || "") || null,
    });
  }

  writeFileSync(OUT, JSON.stringify(rows, null, 2) + "\n", "utf8");

  const withUrl = rows.filter((r) => r.url).length;
  const withFields = rows.filter((r) => r.fields).length;
  console.log(`جهاتٌ مُستخرجة: ${rows.length} — برابط: ${withUrl} · بمجالات دعم: ${withFields}`);
  console.log(`العمودان B وC (اسم المستخدم وكلمة المرور) فارغان في الملف، فلا حساباتَ تُستورد.`);
  console.log(`كُتب إلى: ${OUT}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
