import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { Client } from 'pg';
import { DEFAULT_ROLE_LABELS } from './src/lib/constants';

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });

  try {
    await client.connect();
    console.log("Seeding RoleDefinitions...");

    for (const [key, displayName] of Object.entries(DEFAULT_ROLE_LABELS)) {
      const isSystem = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "STRATEGY", "FINANCE", "CHARITY_CLIENT"].includes(key);
      
      const query = `
        INSERT INTO "RoleDefinition" (id, key, "displayName", "isSystem", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, NOW())
        ON CONFLICT (key) DO UPDATE 
        SET "displayName" = EXCLUDED."displayName",
            "isSystem" = EXCLUDED."isSystem",
            "updatedAt" = NOW();
      `;
      
      await client.query(query, [key, displayName, isSystem]);
      console.log(`Upserted role: ${key}`);
    }

    console.log("Seeding complete.");
  } catch (e) {
    console.error("Error seeding roles:", e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
