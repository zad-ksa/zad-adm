const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log("Connecting...");
  const start = Date.now();
  const charity = await prisma.charity.findFirst();
  console.log("Connected and fetched 1 charity in", Date.now() - start, "ms");
  
  if (!charity) {
    console.log("No charity found");
    return;
  }
  
  const start2 = Date.now();
  await prisma.charity.findUnique({
    where: { name: charity.name },
    include: { financialLogs: true }
  });
  console.log("Fetched finance data in", Date.now() - start2, "ms");
  
  const start3 = Date.now();
  await prisma.surveyResponse.findMany({
    orderBy: { createdAt: "desc" },
  });
  console.log("Fetched all survey responses in", Date.now() - start3, "ms");
}

test().catch(console.error).finally(() => prisma.$disconnect());
