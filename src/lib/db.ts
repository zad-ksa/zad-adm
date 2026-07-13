import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

// Create pg Pool with SSL support for production (Vercel)
const createPool = () => new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

// Prevent multiple instances of Prisma Client and Pool in development
const globalForPrisma = global as unknown as { 
  prisma: PrismaClient;
  pool: Pool;
  adapter: PrismaPg;
};

if (!globalForPrisma.pool) {
  globalForPrisma.pool = createPool();
  globalForPrisma.adapter = new PrismaPg(globalForPrisma.pool);
}

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter: globalForPrisma.adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
