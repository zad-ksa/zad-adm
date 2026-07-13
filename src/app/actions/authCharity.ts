"use server";

import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";

export async function loginCharityWithNumber(charityNumber: string, password: string) {
  try {
    if (!charityNumber || !password) {
      return { error: "يرجى إدخال رقم الجمعية وكلمة المرور" };
    }

    // 1. Verify employee (charity client account) exists in database using phone field which stores charity number
    const employee = await prisma.employee.findUnique({
      where: { phone: charityNumber },
      include: { charity: true }
    });

    if (!employee) {
      return { error: "رقم الجمعية غير مسجل" };
    }

    if (!employee.isActive) {
      return { error: "الحساب غير نشط، يرجى مراجعة إدارة زاد" };
    }

    if (employee.role !== "CHARITY_CLIENT") {
      return { error: "هذا الحساب ليس حساب جمعية" };
    }

    if (!employee.password) {
      return { error: "هذا الحساب لا يملك كلمة مرور" };
    }

    // 2. Compare password
    const isPasswordValid = await compare(password, employee.password);
    if (!isPasswordValid) {
      return { error: "كلمة المرور غير صحيحة" };
    }

    // 3. Create JWT Session
    const sessionData = {
      id: employee.id,
      name: employee.name,
      phone: employee.phone,
      role: employee.role,
      permissions: employee.permissions,
      // @ts-ignore
      navOrder: employee.navOrder || [],
      avatarUrl: employee.avatarUrl,
      charityId: employee.charityId,
    };

    const encryptedSession = await encrypt(sessionData);

    const cookieStore = await cookies();
    cookieStore.set("session", encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

  } catch (error: any) {
    console.error("Charity Login Error:", error);
    return { error: "حدث خطأ داخلي: " + (error.message || "Unknown error") };
  }
  
  // We do redirection outside the try/catch block because Next.js redirect throws a special error
  const employee = await prisma.employee.findUnique({
    where: { phone: charityNumber },
    include: { charity: true }
  });
  
  if (employee?.role === "CHARITY_CLIENT" && employee.charity) {
    redirect(`/charity/${encodeURIComponent(employee.charity.name)}/overview`);
  } else {
    redirect("/charity-login");
  }
}
