/**
 * بذر الكيان الداخلي: صفُّ «شركة زاد» في جدول Charity بعلامة isInternal.
 *
 *   node -r dotenv/config scripts/seed-internal-entity.js          # تجريبي
 *   node -r dotenv/config scripts/seed-internal-entity.js --write  # ينفّذ
 *
 * ولماذا صفٌّ في جدول الجمعيات؟ لأن ما تحتاجه زاد — أهدافٌ ومؤشراتٌ ومبادراتٌ
 * ومنحٌ — مربوطٌ كلّه بـcharityId إلزامياً، فصفٌّ حقيقيٌّ يُشغّله بلا تعديل.
 * والبديل (charityId = null كما في طلبات التصاميم) يكسر القيود الفريدة لأن
 * NULL ≠ NULL في Postgres، فيمرّ بُعدان برمزٍ واحد.
 *
 * وهو مستثنًى من قوائم الجمعيات كلّها عبر EXTERNAL_CHARITIES في
 * src/lib/charityScope.ts، ويظهر في الشريط الجانبي تحت الاستراتيجية وتنمية
 * الموارد وحدهما. ولا بوّابة له ولا عقود.
 *
 * وقابلٌ للإعادة: يُطابق بالاسم فيُحدّث العلامة ولا يُكرّر.
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const WRITE = process.argv.includes("--write");
const NAME = "شركة زاد";

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("لا DATABASE_URL في البيئة");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const existing = await prisma.charity.findUnique({
      where: { name: NAME },
      select: { id: true, isInternal: true },
    });

    console.log(`${WRITE ? "تنفيذ" : "تجريبي (بلا كتابة)"} — الكيان: «${NAME}»`);

    if (existing) {
      console.log(`  موجود (${existing.id})، isInternal = ${existing.isInternal}`);
      if (!existing.isInternal) {
        console.log("  → سيُعلَّم كيانَاً داخلياً");
        if (WRITE) await prisma.charity.update({ where: { id: existing.id }, data: { isInternal: true } });
      } else {
        console.log("  → لا تغيير");
      }
    } else {
      console.log("  → سيُنشأ صفٌّ جديد بعلامة isInternal");
      if (WRITE) {
        await prisma.charity.create({
          data: {
            name: NAME,
            isInternal: true,
            // لا عقد لزاد مع نفسها: الحقول المالية تبقى على أصفارها، وهي
            // مستثناةٌ من شاشة العقود أصلاً.
            strategyTimelineName: "التخطيط الاستراتيجي",
          },
        });
      }
    }

    // تحقّقٌ بعد الكتابة: كم جمعيةً خارجية وكم كياناً داخلياً.
    const [external, internal] = await Promise.all([
      prisma.charity.count({ where: { isInternal: false } }),
      prisma.charity.findMany({ where: { isInternal: true }, select: { name: true } }),
    ]);
    console.log(`\nالجمعيات المتعاقدة: ${external}`);
    console.log(`الكيانات الداخلية: ${internal.length}${internal.length ? " — " + internal.map((c) => c.name).join("، ") : ""}`);

    if (!WRITE) console.log("\nلم يُكتب شيء. أعد التشغيل بـ--write للتنفيذ.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("فشل البذر:", e.message);
  process.exit(1);
});
