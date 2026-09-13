/**
 * يتحقّق من إعادة تسمية «شجرة المعرفة» إلى «مكتبة النماذج»، ومن النقل الجديد.
 *
 * إعادة التسمية جرت في الشيفرة وحدها: الجدول في القاعدة ما زال "KnowledgeNode"
 * ونوع التعداد "KnowledgeNodeKind"، ويصلهما Prisma بـ@@map. فإن اختلف ما في
 * المخطّط عمّا في القاعدة حرفاً واحداً، انكسرت كل قراءة للمكتبة في الإنتاج —
 * ولهذا يقرأ هذا السكربت الاسمين من المخطّط ويقابلهما بفهرس القاعدة، لا يفترضهما.
 *
 * وما يلي ذلك يجري داخل معاملة تُلغى في آخرها: لا صفّ يبقى، ولا ملف يُرفع،
 * ولا شيء في الإنتاج يتغيّر.
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

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

/** نفس قاعدة «(2)» التي في moveTemplateNodes، لاختبارها على أسماء حقيقية. */
function nextFreeName(taken, name) {
  if (!taken.has(name)) return name;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${name} (${i})`;
    if (!taken.has(candidate)) return candidate;
  }
  return name;
}

/**
 * حاجز الدورة كما في الإجراء: من المقصد صعوداً، إن كان أحد المنقولين في
 * الطريق فالمقصد داخل ما ننقله.
 */
async function wouldDetach(client, targetId, movingIds) {
  const moving = new Set(movingIds);
  if (targetId && moving.has(targetId)) return true;
  let cursor = targetId;
  for (let depth = 0; cursor && depth < 100; depth++) {
    const r = await client.query('SELECT "parentId" FROM "KnowledgeNode" WHERE id = $1', [cursor]);
    if (!r.rows.length) break;
    const parentId = r.rows[0].parentId;
    if (parentId && moving.has(parentId)) return true;
    cursor = parentId;
  }
  return false;
}

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  const client = await pool.connect();

  try {
    // ── ١) الاسمان في المخطّط يقابلان ما في القاعدة ──────────────────────────
    console.log("\n① التسمية: الشيفرة تغيّرت والقاعدة لم تتغيّر");

    const schema = fs.readFileSync(path.join(__dirname, "..", "prisma", "schema.prisma"), "utf8");
    check(
      schema.includes('@@map("KnowledgeNode")') && schema.includes("model TemplateNode {"),
      'المخطّط: model TemplateNode مربوط بجدول "KnowledgeNode"'
    );
    check(
      schema.includes('@@map("KnowledgeNodeKind")') && schema.includes("enum TemplateNodeKind {"),
      'المخطّط: enum TemplateNodeKind مربوط بنوع "KnowledgeNodeKind"'
    );
    check(!/model KnowledgeNode\b/.test(schema), "لم يبقَ في المخطّط اسم النموذج القديم");

    const tbl = await client.query(
      `SELECT to_regclass('"KnowledgeNode"') IS NOT NULL AS present`
    );
    check(tbl.rows[0].present, 'الجدول "KnowledgeNode" موجود في الإنتاج بالاسم القديم');

    const enumType = await client.query(
      `SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS vals
         FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'KnowledgeNodeKind'`
    );
    check(
      (enumType.rows[0].vals || []).join(",") === "FOLDER,FILE",
      "نوع التعداد في القاعدة: FOLDER,FILE",
      "وجدتُ: " + (enumType.rows[0].vals || []).join(",")
    );

    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'KnowledgeNode' ORDER BY ordinal_position`
    );
    const names = cols.rows.map((r) => r.column_name);
    check(
      ["id", "name", "kind", "parentId", "fileUrl", "publicId", "resourceType", "fileSize"].every((c) =>
        names.includes(c)
      ),
      "الأعمدة التي يقرأها الإجراء موجودة كلها"
    );

    // ── ٢) الـSQL الخام في البحث ما زال يصيب الجدول ─────────────────────────
    console.log("\n② البحث الشجري: اسم الجدول داخل SQL الخام لم يُعَد تسميته");

    const searchSql = fs.readFileSync(
      path.join(__dirname, "..", "src", "app", "actions", "templateLibrary.ts"),
      "utf8"
    );
    const rawHits = (searchSql.match(/"KnowledgeNode"/g) || []).length;
    check(rawHits === 4, "الإجراء يذكر الجدول باسمه القديم في الاستعلام الخام ٤ مرات", "وجدتُ " + rawHits);

    const searchRun = await client.query(`
      WITH RECURSIVE subtree AS (
        SELECT n.* FROM "KnowledgeNode" n WHERE n."parentId" IS NULL
        UNION ALL
        SELECT c.* FROM "KnowledgeNode" c JOIN subtree s ON c."parentId" = s.id
      )
      SELECT COUNT(*)::int AS n FROM subtree
    `);
    check(Number.isInteger(searchRun.rows[0].n), "الاستعلام العَودي يعمل على الإنتاج", "عقد المكتبة: " + searchRun.rows[0].n);

    const before = await client.query('SELECT COUNT(*)::int AS n FROM "KnowledgeNode"');
    const beforeCount = before.rows[0].n;

    // ── ٣) النقل، داخل معاملة تُلغى ─────────────────────────────────────────
    console.log("\n③ النقل: على بيانات حقيقية، ثم تراجُع");
    await client.query("BEGIN");

    const mk = async (name, kind, parentId) => {
      const r = await client.query(
        `INSERT INTO "KnowledgeNode" (id, name, kind, "parentId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2::"KnowledgeNodeKind", $3, NOW(), NOW())
         RETURNING id`,
        [name, kind, parentId]
      );
      return r.rows[0].id;
    };

    const a = await mk("أ-تحقّق", "FOLDER", null);
    const b = await mk("ب-تحقّق", "FOLDER", a);
    const c = await mk("ج-تحقّق", "FOLDER", b);
    const other = await mk("مجلد-آخر", "FOLDER", null);
    const f1 = await mk("ملف-١.pdf", "FILE", null);
    const f2 = await mk("ملف-٢.pdf", "FILE", null);

    // نقل ملفين معاً إلى مجلد
    await client.query('UPDATE "KnowledgeNode" SET "parentId" = $1 WHERE id = ANY($2)', [other, [f1, f2]]);
    const landed = await client.query(
      'SELECT COUNT(*)::int AS n FROM "KnowledgeNode" WHERE "parentId" = $1',
      [other]
    );
    check(landed.rows[0].n === 2, "تحديدٌ من ملفين يهبط في المجلد المقصود معاً");

    // الحاجز: أ إلى داخل ج (وج من ذرّية أ)
    check(await wouldDetach(client, c, [a]), "مرفوض: نقل مجلد إلى داخل حفيده — يقطعه عن الجذر");
    check(await wouldDetach(client, b, [a, f1]), "مرفوض كذلك حين يكون المجلد ضمن تحديد مختلط");
    check(await wouldDetach(client, a, [a]), "مرفوض: نقل مجلد إلى داخل نفسه");
    check(!(await wouldDetach(client, other, [a])), "مسموح: نقل مجلد إلى مجلد ليس من ذرّيته");
    check(!(await wouldDetach(client, null, [a, b, c])), "مسموح دائماً: النقل إلى الجذر");

    // الصعود إلى الأب: ج إلى أ
    await client.query('UPDATE "KnowledgeNode" SET "parentId" = $1 WHERE id = $2', [a, c]);
    const moved = await client.query('SELECT "parentId" FROM "KnowledgeNode" WHERE id = $1', [c]);
    check(moved.rows[0].parentId === a, "النقل إلى درجة أعلى في المسار يعمل");

    // تشابه الأسماء: مجلد باسم مأخوذ في المقصد
    const clashSrc = await mk("مجلد-آخر", "FOLDER", a);
    const taken = new Set(
      (
        await client.query(
          `SELECT name FROM "KnowledgeNode" WHERE "parentId" IS NULL AND kind = 'FOLDER'`
        )
      ).rows.map((r) => r.name)
    );
    const resolved = nextFreeName(taken, "مجلد-آخر");
    check(resolved === "مجلد-آخر (2)", "الاسم المكرّر يصير «(2)» بدل أن يفشل النقل", "صار: " + resolved);
    await client.query('UPDATE "KnowledgeNode" SET "parentId" = NULL, name = $1 WHERE id = $2', [
      resolved,
      clashSrc,
    ]);
    const twins = await client.query(
      `SELECT COUNT(*)::int AS n FROM "KnowledgeNode"
        WHERE "parentId" IS NULL AND kind = 'FOLDER' AND name LIKE 'مجلد-آخر%'`
    );
    check(twins.rows[0].n === 2, "المجلدان يتجاوران في الجذر باسمين مختلفين");

    // اسم فارغ في المقصد لا يُلمَس
    const untouched = nextFreeName(new Set(["غيره"]), "مجلد-آخر");
    check(untouched === "مجلد-آخر", "الاسم غير المأخوذ يبقى كما هو");

    await client.query("ROLLBACK");

    const after = await client.query('SELECT COUNT(*)::int AS n FROM "KnowledgeNode"');
    check(
      after.rows[0].n === beforeCount,
      `التراجع نظيف: العقد ${beforeCount} قبل و${after.rows[0].n} بعد`
    );

    console.log(`\n${pass}/${pass + fail} ناجحة`);
    if (fail) process.exitCode = 1;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
