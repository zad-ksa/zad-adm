"use server";

import { prisma } from "@/lib/db";
import { encrypt, getSession, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { cookies } from "next/headers";
import { hashPassword, normalizeEmail, validateCredentialPair } from "@/lib/password";

// Both actions below previously decrypted the session cookie by hand instead of
// calling getSession(). That skipped getSession's database check, so a
// deactivated or deleted employee holding a still-valid cookie could keep
// editing their profile and refreshing their session indefinitely.
//
// They also refuse to run while a developer override is active: both rewrite
// the session cookie from the *current* session identity, which during
// impersonation is the impersonated employee — writing that back would
// permanently replace the developer's own identity (and their developer_mode)
// in the cookie.
async function requireRealEmployee() {
  const session = await getSession();
  if (!session || !session.id) return { error: "غير مصرح لك بإجراء هذا التعديل" as const };
  if (session.originalId) {
    return { error: "لا يمكن تعديل الملف الشخصي أثناء تفعيل وضع انتحال هوية موظف آخر" as const };
  }
  return { session };
}

export async function updateProfile(data: {
  name: string;
  phone: string;
  /**
   * The login address, set by its owner rather than by an administrator.
   *
   * Undefined means «leave it alone» — older callers that do not know about
   * this field must not silently wipe it. null means «remove email login».
   */
  email?: string | null;
  password?: string;
  avatarUrl?: string | null;
}) {
  const auth = await requireRealEmployee();
  if ("error" in auth) return { error: auth.error };
  const currentUser = auth.session;

  const { name, phone, email: emailInput, password, avatarUrl } = data;

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

  // Whether half a credential is acceptable depends on what is already
  // stored: typing only a new password is fine once an address exists.
  const current = await prisma.employee.findUnique({
    where: { id: currentUser.id },
    select: { email: true, password: true },
  });

  const emailProvided = emailInput !== undefined;
  const wantsEmail = !!emailInput?.trim();

  const pairProblem = validateCredentialPair(emailInput, password, {
    hasExistingEmail: !!current?.email,
    hasExistingPassword: !!current?.password,
  });
  if (pairProblem) return { error: pairProblem };

  const email = wantsEmail ? normalizeEmail(emailInput!) : null;

  if (email && email !== current?.email) {
    const takenBy = await prisma.employee.findFirst({
      where: { email, id: { not: currentUser.id } },
    });
    if (takenBy) return { error: "البريد الإلكتروني مسجل لموظف آخر" };
  }

  // Update object
  const updateData: any = {
    name,
    phone,
    avatarUrl
  };

  if (emailProvided) {
    updateData.email = email;
    // Removing the address retires email login, so the hash goes with it.
    if (!email) updateData.password = null;
  }

  if (password && password.trim() !== "") {
    updateData.password = await hashPassword(password.trim());
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
    // @ts-ignore
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
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return { success: "تم تحديث الملف الشخصي بنجاح", user: sessionData };
}

export async function updateNavOrder(newOrder: string[]) {
  const auth = await requireRealEmployee();
  if ("error" in auth) return { error: auth.error };
  const currentUser = auth.session;

  const updatedEmployee = await prisma.employee.update({
    where: { id: currentUser.id },
    // @ts-ignore
    data: { navOrder: newOrder },
  });

  // Strip the JWT's own claims and getSession's derived flag before re-signing,
  // so they are not baked into the new token as if they were session data.
  const { exp, iat, nbf, isDeveloper, ...baseSession } = currentUser as Record<string, unknown>;

  const sessionData = {
    ...baseSession,
    // @ts-ignore
    navOrder: updatedEmployee.navOrder || [],
  };

  const encryptedSession = await encrypt(sessionData);

  const cookieStore = await cookies();
  cookieStore.set("session", encryptedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return { success: true, navOrder: sessionData.navOrder };
}
