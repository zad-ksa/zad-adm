const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLogoUrls() {
  const charities = await prisma.charity.findMany({
    select: { name: true, logoUrl: true },
  });
  
  let totalSize = 0;
  for (const charity of charities) {
    const size = charity.logoUrl ? charity.logoUrl.length : 0;
    totalSize += size;
    if (size > 1000) {
      console.log(`Charity ${charity.name} has a large logo. Size: ${size} bytes`);
    }
  }
  console.log(`Total logo sizes: ${totalSize} bytes`);
}

checkLogoUrls()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
