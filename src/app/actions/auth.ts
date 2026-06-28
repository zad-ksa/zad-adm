"use server";

import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";

export async function loginWithPassword(phone: string, password: string) {
  try {
    if (!phone || !password) {
      return { error: "يرجى إدخال رقم الجوال وكلمة المرور" };
    }

    // 1. Verify employee exists and is active in database
    const employee = await prisma.employee.findUnique({
      where: { phone },
    });

    if (!employee) {
      return { error: "رقم الجوال غير مسجل أو الحساب غير نشط" };
    }

    if (!employee.isActive) {
      return { error: "الحساب غير نشط" };
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
    console.error("Login Error:", error);
    return { error: "حدث خطأ داخلي: " + (error.message || "Unknown error") };
  }
  
  const employee = await prisma.employee.findUnique({
    where: { phone },
    include: { charity: true }
  });
  
  if (employee?.role === "CHARITY_CLIENT" && employee.charity) {
    redirect(`/charity/${encodeURIComponent(employee.charity.name)}`);
  }
  
  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/");
}
