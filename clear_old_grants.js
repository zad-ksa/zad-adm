const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.charity.updateMany({
    data: {
      grants: 0
    }
  });
  console.log(`Updated ${result.count} charities, set grants to 0.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
