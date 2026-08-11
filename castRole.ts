import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });

  try {
    await client.connect();
    console.log("Connected. Starting role column cast...");
    await client.query(`ALTER TABLE "Employee" ALTER COLUMN "role" DROP DEFAULT;`);
    await client.query(`ALTER TABLE "Employee" ALTER COLUMN "role" TYPE text USING role::text;`);
    await client.query(`ALTER TABLE "Employee" ALTER COLUMN "role" SET DEFAULT 'STRATEGY';`);
    
    try {
      await client.query(`DROP TYPE "Role" CASCADE;`);
    } catch (e) {
      console.log("Enum Role could not be dropped.", (e as Error).message);
    }
    
    console.log("Cast successful!");
  } catch (e) {
    console.error("Error casting role column:", e);
  } finally {
    await client.end();
  }
}

main();
