import { config } from "dotenv";
config();
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Exists" : "MISSING");
console.log("NODE_ENV:", process.env.NODE_ENV);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    console.log("Trying query...");
    const res = await prisma.employee.count();
    console.log("Success! Employee count:", res);
  } catch (e) {
    console.error("Query failed:", e);
  } finally {
    await pool.end();
  }
}

test();
