import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting to database...");
    await prisma.$connect();
    console.log("Connected successfully!");
    const count = await prisma.employee.count();
    console.log("Employees count:", count);
  } catch (err) {
    console.error("Connection error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
