"use server";

import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { hash } from "bcryptjs";

export async function updateProfile(data: {
  name: string;
  phone: string;
  password?: string;
  avatarUrl?: string | null;
}) {
  const session = (await cookies()).get("session")?.value;
  if (!session) {
    return { error: "غير مصرح لك بإجراء هذا التعديل" };
  }

  let currentUser;
  try {
    currentUser = await decrypt(session);
  } catch (e) {
    return { error: "انتهت صلاحية الجلسة" };
  }

  if (!currentUser || !currentUser.id) {
    return { error: "مستخدم غير صالح" };
  }

  const { name, phone, password, avatarUrl } = data;

  if (!name || !phone) {
    return { error: "الاسم ورقم الجوال مطلوبان" };
  }

  // Basic validation for Saudi phone numbers
  const cleanedPhone = phone.replace(/\D/g, "");
  if (!cleanedPhone.startsWith("05") || cleanedPhone.length !== 10) {
    return { error: "يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05 ويتكون من 10 أرقام" };
  }

  // Check if phone number is already registered by another employee
  const existingWithPhone = await prisma.employee.findFirst({
    where: {
      phone,
      id: { not: currentUser.id }
    }
  });

  if (existingWithPhone) {
    return { error: "رقم الجوال مسجل لموظف آخر" };
  }

  // Update object
  const updateData: any = {
    name,
    phone,
    avatarUrl
  };

  if (password && password.trim() !== "") {
    updateData.password = await hash(password, 10);
  }

  // Update database
  const updatedEmployee = await prisma.employee.update({
    where: { id: currentUser.id },
    data: updateData,
  });

  // Re-encrypt session data with updated employee details
  const sessionData = {
    id: updatedEmployee.id,
    name: updatedEmployee.name,
    phone: updatedEmployee.phone,
    role: updatedEmployee.role,
    permissions: updatedEmployee.permissions,
    navOrder: updatedEmployee.navOrder || [],
    avatarUrl: updatedEmployee.avatarUrl,
    charityId: updatedEmployee.charityId,
  };

  const encryptedSession = await encrypt(sessionData);

  // Set the updated session cookie
  const cookieStore = await cookies();
  cookieStore.set("session", encryptedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });

  return { success: "تم تحديث الملف الشخصي بنجاح", user: sessionData };
}

export async function updateNavOrder(newOrder: string[]) {
  const session = (await cookies()).get("session")?.value;
  if (!session) return { error: "غير مصرح" };

  let currentUser;
  try {
    currentUser = await decrypt(session);
  } catch (e) {
    return { error: "انتهت صلاحية الجلسة" };
  }

  if (!currentUser || !currentUser.id) return { error: "مستخدم غير صالح" };

  const updatedEmployee = await prisma.employee.update({
    where: { id: currentUser.id },
    data: { navOrder: newOrder },
  });

  const sessionData = {
    ...currentUser,
    navOrder: updatedEmployee.navOrder || [],
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

  return { success: true, navOrder: sessionData.navOrder };
}
