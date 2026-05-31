"use server";

import { prisma } from "@/lib/db";
import { compare } from "bcryptjs";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginUser(prevState: any, formData: FormData) {
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!phone || !password) {
    return { error: "يرجى إدخال رقم الجوال وكلمة المرور" };
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { phone },
    });

    if (!employee || !employee.isActive) {
      return { error: "البيانات غير صحيحة أو الحساب غير نشط" };
    }

    const isValidPassword = await compare(password, employee.password);

    if (!isValidPassword) {
      return { error: "كلمة المرور غير صحيحة" };
    }

    const sessionData = {
      id: employee.id,
      name: employee.name,
      phone: employee.phone,
      role: employee.role,
      permissions: employee.permissions,
    };

    const encryptedSession = await encrypt(sessionData);

    const cookieStore = await cookies();
    cookieStore.set("session", encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // يوم واحد
    });
  } catch (error) {
    return { error: "حدث خطأ أثناء محاولة تسجيل الدخول" };
  }

  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
