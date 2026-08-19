import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import { hash } from "bcryptjs";

dotenv.config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Create a dummy charity
  let charity = await prisma.charity.findFirst({
    where: { name: "جمعية تجريبية للتطوير" }
  });

  if (!charity) {
    charity = await prisma.charity.create({
      data: {
        name: "جمعية تجريبية للتطوير",
        size: "MEDIUM",
      }
    });
    console.log("✅ تم إنشاء جمعية تجريبية");
  }

  // 2. Create an Employee (Zad Employee) with phone 0553973917
  let employee = await prisma.employee.findUnique({
    where: { phone: "0553973917" }
  });

  if (!employee) {
    const hashedPassword = await hash("123456", 10);
    employee = await prisma.employee.create({
      data: {
        name: "موظف زاد (تطوير)",
        phone: "0553973917",
        password: hashedPassword,
        role: "SYSTEM_ADMIN",
        permissions: ["developer_mode", "manage_hr"],
        isActive: true,
      }
    });
    console.log("✅ تم إنشاء حساب موظف زاد للتطوير (0553973917)");
  } else {
    // Ensure permissions include manage_hr
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        permissions: Array.from(new Set([...employee.permissions, "developer_mode", "manage_hr"]))
      }
    });
    console.log("✅ تم تحديث صلاحيات موظف زاد للتطوير");
  }

  // 3. Create a CharityUser (Association Employee) with phone 0553973917
  let charityUser = await prisma.charityUser.findUnique({
    where: { phone: "0553973917" }
  });

  if (!charityUser) {
    charityUser = await prisma.charityUser.create({
      data: {
        name: "موظف جمعية (تطوير)",
        phone: "0553973917",
        title: "SYSTEM_ADMIN",
        permissions: ["manage_hr", "view_reports"],
        isActive: true,
        charities: {
          create: {
            charityId: charity.id
          }
        }
      }
    });
    console.log("✅ تم إنشاء حساب جمعية للتطوير (0553973917)");
  } else {
    // Ensure user has permissions and is linked to the dummy charity
    await prisma.charityUser.update({
      where: { id: charityUser.id },
      data: {
        permissions: Array.from(new Set([...charityUser.permissions, "manage_hr", "view_reports"]))
      }
    });

    const link = await prisma.charityUserCharity.findFirst({
      where: { charityUserId: charityUser.id, charityId: charity.id }
    });

    if (!link) {
      await prisma.charityUserCharity.create({
        data: {
          charityUserId: charityUser.id,
          charityId: charity.id
        }
      });
    }
    console.log("✅ تم تحديث حساب الجمعية للتطوير");
  }

  console.log("🎉 اكتمل إعداد الحسابات الوهمية بنجاح!");
  console.log("يمكنك الآن تسجيل الدخول برقم الجوال: 0553973917");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
