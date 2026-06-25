import { prisma } from '../src/lib/db';
const cats = ['الاستراتيجية','التقنية','تنمية الموارد','الإعلامية','تكليف','استقطاب'];
const r = await prisma.achievementCategory.createMany({ data: cats.map(name => ({ name })), skipDuplicates: true });
console.log('created:', r.count);
await prisma.$disconnect();
