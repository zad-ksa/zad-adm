/**
 * قارئ xlsx بلا اعتماديات.
 *
 * ملف xlsx أرشيفُ zip فيه XML، فيُفكّ هنا بـzlib المدمج في Node ويُقرأ XML
 * بتعبيراتٍ نمطية. والغرض ألّا تُضاف حزمةٌ للمشروع من أجل تحويلٍ يُشغَّل مرّةً
 * عند بذر البيانات.
 *
 * ويُطابَق الخلايا المغلقة ذاتياً (`<c r="A4"/>`) قبل غيرها: لولا ذلك ابتلعت
 * الخلايا الفارغة ما بعدها فانتقلت القيم إلى أعمدةٍ ليست لها.
 */

const fs = require("fs");
const zlib = require("zlib");

// ── فكّ zip ─────────────────────────────────────────────────────────────────

/**
 * يقرأ دليل الأرشيف من آخره (End of Central Directory) ثم يفكّ كل مُدخَل.
 * ولا يُدعم إلا التخزين (0) والتفريغ (8)، وهما ما تستعمله xlsx.
 */
function unzip(buffer) {
  const files = new Map();

  // توقيع EOCD: PK\x05\x06 — يُبحث من الآخر لأن بعده تعليقٌ متغيّر الطول.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0 && i > buffer.length - 66000; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ملفٌ ليس zip سليماً");

  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);

  for (let n = 0; n < count; n++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);

    // الترويسة المحلية: طول الاسم والحقول الزائدة فيها قد يخالف ما في الدليل.
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);

    files.set(name, method === 0 ? raw : zlib.inflateRawSync(raw));
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

// ── قراءة الأوراق ───────────────────────────────────────────────────────────

const unesc = (s) =>
  String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");

const colOf = (ref) => {
  let n = 0;
  for (const ch of ref.replace(/[0-9]+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

function build(files) {
  const text = (name) => {
    const buf = files.get(name);
    return buf ? buf.toString("utf8") : null;
  };

  let shared = [];
  const ss = text("xl/sharedStrings.xml");
  if (ss) {
    shared = (ss.match(/<si>[\s\S]*?<\/si>|<si\/>/g) || []).map((si) =>
      unesc((si.match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).map((t) => t.replace(/<[^>]+>/g, "")).join(""))
    );
  }

  const relMap = {};
  for (const m of (text("xl/_rels/workbook.xml.rels") || "").matchAll(
    /<Relationship Id="([^"]+)"[^>]*Target="([^"]+)"/g
  )) {
    relMap[m[1]] = m[2];
  }

  /**
   * سماتُ `<sheet>` لا ترتيبَ لها.
   *
   * فـExcel يكتب `<sheet name="…" sheetId="2" r:id="rId5"/>`، وملفٌ مصدَّرٌ من
   * Google Sheets يكتب `<sheet state="visible" name="…" …/>` — فتعبيرٌ يَلزم
   * `name` أولَ السمات يُرجع صفرَ أوراقٍ من ملفٍ سليم، ويقرأ الجدولُ فارغاً بلا
   * خطأ. فتُقرأ الوسمُ كاملاً ثم تُنتزع سماتُه أيّاً كان ترتيبها.
   */
  const sheets = [...(text("xl/workbook.xml") || "").matchAll(/<sheet\s([^>]*?)\/?>/g)]
    .map((m) => {
      const at = m[1];
      const name = (at.match(/\bname="([^"]*)"/) || [])[1];
      const rid = (at.match(/\br:id="([^"]+)"/) || [])[1];
      if (name === undefined || !rid) return null;
      const target = relMap[rid] || "";
      return { name: unesc(name), path: target.startsWith("/") ? target.slice(1) : "xl/" + target };
    })
    .filter(Boolean);

  const sheet = (name) => {
    const sh = sheets.find((s) => s.name === name);
    const xml = sh ? text(sh.path) : null;
    if (!xml) return { rows: [], merges: [] };

    const merges = [...xml.matchAll(/<mergeCell ref="([A-Z]+\d+):([A-Z]+\d+)"/g)].map((m) => ({ a: m[1], b: m[2] }));
    const rows = [];
    for (const row of xml.match(/<row[^>]*\/>|<row[\s\S]*?<\/row>/g) || []) {
      const rn = Number((row.match(/<row[^>]*r="(\d+)"/) || [])[1] || 0);
      const cells = [];
      // المغلقة ذاتياً أولاً: وإلا ابتلعت الفارغة ما بعدها.
      for (const raw of row.match(/<c[^>]*\/>|<c[^>]*>[\s\S]*?<\/c>/g) || []) {
        const at = (raw.match(/<c([^>]*?)\/?>/) || [])[1] || "";
        const ref = (at.match(/r="([A-Z]+\d+)"/) || [])[1];
        const t = (at.match(/t="([^"]+)"/) || [])[1];
        let value = "";
        if (t === "s") value = shared[Number((raw.match(/<v>(\d+)<\/v>/) || [])[1])] ?? "";
        else if (t === "inlineStr") value = unesc((raw.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || "");
        else value = unesc((raw.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || "");
        if (ref) cells[colOf(ref)] = String(value).replace(/[ \t\r\n]+/g, " ").trim();
      }
      rows[rn] = cells;
    }
    return { rows, merges };
  };

  return { sheets, sheet };
}

/** يقرأ ملف .xlsx من مساره. */
function loadFile(filePath) {
  return build(unzip(fs.readFileSync(filePath)));
}

/** يقرأ أرشيفاً مفكوكاً سلفاً في مجلد — للتجربة والتشخيص. */
function loadDir(dir) {
  const path = require("path");
  const files = new Map();
  const walk = (current, prefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, key);
      else files.set(key, fs.readFileSync(full));
    }
  };
  walk(dir, "");
  return build(files);
}

module.exports = { loadFile, loadDir, unzip };
