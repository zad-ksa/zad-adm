const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to DB...");
  const t0 = performance.now();
  
  const [
    charities,
    surveyResponsesGrouped,
    hexagonalResponsesGrouped,
    programsGrouped,
    programsAgg,
    dbNewsItems
  ] = await Promise.all([
    prisma.charity.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.surveyResponse.groupBy({
      by: ['charityName'],
      _count: { id: true }
    }),
    prisma.hexagonalResponse.groupBy({
      by: ['charityName'],
      _count: { id: true }
    }),
    prisma.program.groupBy({
      by: ['charityId'],
      _count: { id: true },
      _sum: { beneficiaries: true }
    }),
    prisma.program.aggregate({
      _count: { id: true },
      _sum: { beneficiaries: true }
    }),
    prisma.news.findMany({ take: 5, orderBy: { createdAt: "desc" } })
  ]);

  const t1 = performance.now();
  console.log(`Queries took ${t1 - t0} milliseconds.`);
  console.log(`Found ${charities.length} charities.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
