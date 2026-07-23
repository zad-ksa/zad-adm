import { prisma } from './src/lib/db';

async function main() {
  const result = await prisma.charity.updateMany({
    data: {
      grants: 0
    }
  });
  console.log(`Updated ${result.count} charities, set grants to 0.`);
}

main().catch(console.error).finally(() => process.exit(0));
