const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Simple parser for .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*["']?(.*?)["']?\s*$/);
    if (match) {
      process.env.DATABASE_URL = match[1];
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in environment or .env file.");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const newsItems = [
  {
    charityName: "أثر القيم",
    category: "الإعلامية",
    title: "تصميم الهوية البصرية للجمعية",
    description: "تم تصميم كليشة أثر القيم وإعادة تصميم الشعار، والختم",
    createdAt: new Date("2026-05-24T12:00:00Z")
  },
  {
    charityName: "إدارة زاد",
    category: "التقنية",
    title: "إطلاق لوحة التحكم الرئيسية",
    description: "تم إطلاق الداشبورد بشكل متكامل",
    createdAt: new Date("2026-05-24T12:00:00Z")
  },
  {
    charityName: "عدة جمعيات",
    category: "الاستراتيجية",
    title: "تذكير استكمال الاستبيانات",
    description: "تم تذكير الجمعيات باستكمال استبيانات الاستراتيجية",
    createdAt: new Date("2026-05-24T12:00:00Z")
  },
  {
    charityName: "المعاقد التعليمية",
    category: "تنمية الموارد",
    title: "الموافقة على فرصة دعم في إحسان",
    description: "تمت الموافقة على فرصة في إحسان بقيمة 100,000 ريال (كفالة تعليمية حصص تقوية للطلاب)",
    createdAt: new Date("2026-05-21T12:00:00Z")
  },
  {
    charityName: "ضماد الإسعافية",
    category: "تنمية الموارد",
    title: "الموافقة على فرصة دعم للرعاية الصحية في إحسان",
    description: "تمت الموافقة على فرصة في إحسان بقيمة 150,000 ريال (الرعاية الصحية للحجاج)",
    createdAt: new Date("2026-05-20T12:00:00Z")
  },
  {
    charityName: "إدارة زاد",
    category: "تكليف",
    title: "تكليف موظف بالجمعيات",
    description: "تم تكليف عبدالله المحزري بالجمعيات التالية: الرأفة - أثر القيم - مكين",
    createdAt: new Date("2026-05-20T12:00:00Z")
  },
  {
    charityName: "ضماد الإسعافية",
    category: "الاستراتيجية",
    title: "الاجتماع بالجمعية لإرسال الاستبيانات",
    description: "تم الإجتماع بالجمعية وإرسال لهم استبيانات الاستراتيجية",
    createdAt: new Date("2026-05-20T12:00:00Z")
  },
  {
    charityName: "إدارة زاد",
    category: "استقطاب",
    title: "انضمام عضو جديد لفريق زاد",
    description: "التحق عبدالله المحزري لفريق زاد في خدمة تنمية المالية",
    createdAt: new Date("2026-05-19T12:00:00Z")
  },
  {
    charityName: "الرأفة الإنسانية",
    category: "الاستراتيجية",
    title: "الاجتماع بالجمعية لإرسال الاستبيانات",
    description: "تم الإجتماع بالجمعية وإرسال لهم استبيانات الاستراتيجية",
    createdAt: new Date("2026-05-19T12:00:00Z")
  },
  {
    charityName: "رواق المسجد",
    category: "الاستراتيجية",
    title: "الاجتماع بالجمعية لإرسال الاستبيانات",
    description: "تم الإجتماع بالجمعية وإرسال لهم استبيانات الاستراتيجية",
    createdAt: new Date("2026-05-18T12:00:00Z")
  },
  {
    charityName: "أثر القيم",
    category: "الاستراتيجية",
    title: "الاجتماع بالجمعية لإرسال الاستبيانات",
    description: "تم الإجتماع بالجمعية وإرسال لهم استبيانات الاستراتيجية",
    createdAt: new Date("2026-05-17T12:00:00Z")
  },
  {
    charityName: "ضماد الإسعافية",
    category: "تنمية الموارد",
    title: "اجتماع تنسيقي لتنمية الموارد",
    description: "اجتماع تنسيقي فيما يتعلق بتنمية موارد الجمعية",
    createdAt: new Date("2026-05-11T12:00:00Z")
  },
  {
    charityName: "الرأفة الإنسانية",
    category: "تنمية الموارد",
    title: "تحديث حساب الصندوق",
    description: "تم تحديث حساب الصندوق",
    createdAt: new Date("2026-05-01T12:00:00Z")
  }
];

async function seed() {
  await client.connect();
  console.log("Connected to database.");

  // Delete existing news
  console.log("Deleting old news...");
  await client.query('DELETE FROM "News"');

  // Insert new news
  console.log("Inserting new news...");
  const queryText = `
    INSERT INTO "News" (id, "charityName", category, title, description, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;

  // Generate UUID helper
  const crypto = require('crypto');

  for (const item of newsItems) {
    const id = crypto.randomUUID();
    const now = new Date();
    await client.query(queryText, [
      id,
      item.charityName,
      item.category,
      item.title,
      item.description,
      item.createdAt,
      now
    ]);
  }

  console.log("Successfully seeded 13 news items!");
  await client.end();
}

seed().catch(err => {
  console.error("Error seeding news:", err);
  client.end();
});
