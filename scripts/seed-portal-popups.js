/**
 * يكتب إشعارين انبثاقيين للجمعيات، **معطَّلين**:
 *
 *  ١) إشعارُ التحديث العام — يظهر في أيِّ صفحةٍ تُفتح من البوّابة (`ANY`).
 *  ٢) إشعارُ تنمية الموارد المالية — يظهر عند فتح تبويبه (`FUNDRAISING`).
 *
 * **ولا يُفعَّل أحدُهما من هنا**: التفعيلُ قرارُ موعدٍ لا قرارُ نصّ — يُفعَّل
 * من «لوحة زاد ← الإشعارات الانبثاقية» بزرٍّ، بعد أن يصل التحديثُ إلى
 * المنصّة. وإشعارٌ يسبق تحديثَه يَعِد بما لا يراه القارئ.
 *
 * **ويعيد التشغيلَ بلا ضرر**: يُعرف الإشعارُ بعنوانه، فيُحدَّث متنُه وموضعُه
 * ولا تُمسّ حالُه. فلو فُعِّل ثمّ أُعيد تشغيلُ السكربت بقي يعمل، ولو أُغلق
 * عند قارئٍ بقي مُغلقاً عنده — سطورُ `PortalPopupSeen` لا تُحذف.
 *
 * التشغيل:
 *   node scripts/seed-portal-popups.js
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { randomUUID } = require("crypto");

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, "..", ".env");
  const m = /^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m.exec(fs.readFileSync(envPath, "utf8"));
  if (!m) throw new Error("DATABASE_URL not found");
  return m[1];
}

/**
 * متنُ الإشعار نصٌّ لا HTML: البوّابةُ ترسمه بـ`whitespace-pre-line`، فالسطرُ
 * الفارغُ فاصلُ فقرةٍ والشَّرطةُ أوّلُ بند. ولا وسوم.
 */
const POPUPS = [
  {
    title: "تحديث على منصة زاد",
    pageKey: "ANY",
    repeatMode: "ONCE",
    body: [
      "حدثنا واجهة المنصة لتكون أوضح وأسرع في القراءة، وشكل الأقسام صار واحدا في البوابة كلها.",
      "",
      "أبرز ما تغير:",
      "- الخدمات: تعرف أين وصلت كل خدمة من خدماتك، ومرحلتها الحالية وخطوتها وما أنجز منها. ودليل الخدمات يعرض مراحل كل خدمة وخطواتها كاملة.",
      "- دليل الحوكمة: أعيد بناؤه على معايير حجم جمعيتك. المؤشرات تطوى وتفتح، والشاهد المطلوب تحت سؤاله مباشرة، وفيه بحث يصل إلى الكلمة ولو كتبتها بلا همزة أو تشكيل، وفهرس جانبي يقول أين أنت في الصفحة.",
      "- طلبات التصاميم: تبويبات أوضح لحالات الطلب، وأرقام أعلى الصفحة تقول ما ينتظر اعتمادك، وترتيب التنفيذ تتحكمون فيه فيما لم يبدأ به المصمم.",
      "- الموارد البشرية: الشاشات على الشكل الموحد نفسه.",
      "",
      "وإن لاحظتم شيئا غير مفهوم أو ناقصا، أخبرونا ليعدل.",
    ].join("\n"),
  },
  {
    title: "قسم تنمية الموارد المالية",
    pageKey: "FUNDRAISING",
    repeatMode: "ONCE",
    body: [
      "هذا القسم يجمع عملكم مع الجهات المانحة في مكان واحد.",
      "",
      "ما يمكنكم فعله فيه:",
      "- الجهات المانحة: قائمة الجهات وحالة الرفع عند كل واحدة، ومواعيد الفتح والإغلاق. والقريب موعده ملون لينتبه له.",
      "- حسابكم عند الجهة: اسم المستخدم وكلمة المرور تكتبونها وتعدلونها بأنفسكم، وتنسخ بضغطة.",
      "- مجالات المنح: تحت كل مجال تقترحون مشاريعكم، من خطتكم التشغيلية أو من خارجها، مع ملاحظة تبين ما يميز المشروع في هذا المجال.",
      "- مصير المقترح: يظهر على كل مقترح ما صار إليه عند فريق زاد — قيد الاقتراح، أو رفع للجهة، أو مؤجل.",
      "- المنح المرفوعة: ما رفعته الجمعية إلى الجهات وحالة كل طلب.",
      "",
      "والمقترح لا يعني الرفع: الرفع يتولاه فريق زاد، وما يكتب هنا يبنى عليه.",
    ].join("\n"),
  },
];

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  const client = await pool.connect();

  try {
    const exists = await client.query(
      "SELECT to_regclass('public.\"PortalPopup\"') AS t"
    );
    if (!exists.rows[0].t) {
      console.error(
        'جدول "PortalPopup" غير موجود. طبق prisma/sql/portal-popups.sql أولا ثم أعد تشغيل هذا السكربت.'
      );
      process.exitCode = 1;
      return;
    }

    for (const popup of POPUPS) {
      const found = await client.query(
        'SELECT "id", "isActive" FROM "PortalPopup" WHERE "title" = $1 LIMIT 1',
        [popup.title]
      );

      if (found.rowCount > 0) {
        const row = found.rows[0];
        // وحالُه لا تُمسّ: لو فُعِّل ثمّ أُعيد التشغيل بقي يعمل.
        await client.query(
          'UPDATE "PortalPopup" SET "body" = $1, "pageKey" = $2, "repeatMode" = $3, "updatedAt" = NOW() WHERE "id" = $4',
          [popup.body, popup.pageKey, popup.repeatMode, row.id]
        );
        console.log(
          `حُدِّث: «${popup.title}» — ${popup.pageKey} — ${row.isActive ? "يعمل" : "معطل"}`
        );
        continue;
      }

      await client.query(
        `INSERT INTO "PortalPopup"
           ("id", "title", "body", "pageKey", "charityIds", "repeatMode", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, ARRAY[]::TEXT[], $5, FALSE, NOW(), NOW())`,
        [randomUUID(), popup.title, popup.body, popup.pageKey, popup.repeatMode]
      );
      console.log(`أُضيف معطلا: «${popup.title}» — ${popup.pageKey}`);
    }

    console.log("");
    console.log("التفعيل من: لوحة زاد ← الإشعارات الانبثاقية ← زر «تفعيل».");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
