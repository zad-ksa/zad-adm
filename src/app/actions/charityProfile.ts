"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/auditLog";
import { hashPassword, normalizeEmail, validateCredentialPair } from "@/lib/password";

/**
 * A charity account setting up its own email login.
 *
 * Self-service on purpose. There are 26 accounts to reach, and no member of Zad
 * staff knows what address any of them wants to use — so the person who owns
 * the account is the only one who can answer, and the only one for whom the
 * password stays a secret.
 *
 * Nothing else about the account is editable here: name, phone, title and
 * permissions belong to whoever administers the charity.
 */
export async function updateCharityCredentials(data: {
  /** undefined leaves it alone; null removes email login entirely. */
  email?: string | null;
  password?: string;
}) {
  const session = await getSession();
  if (!session || session.userType !== "CHARITY_USER") {
    return { error: "غير مصرح" };
  }

  const current = await prisma.charityUser.findUnique({
    where: { id: session.id },
    select: { email: true, password: true, isActive: true },
  });

  if (!current || !current.isActive) {
    return { error: "الحساب غير موجود أو غير نشط" };
  }

  const emailProvided = data.email !== undefined;
  const wantsEmail = !!data.email?.trim();

  const problem = validateCredentialPair(data.email, data.password, {
    hasExistingEmail: !!current.email,
    hasExistingPassword: !!current.password,
  });
  if (problem) return { error: problem };

  const email = wantsEmail ? normalizeEmail(data.email!) : null;

  if (email && email !== current.email) {
    const takenBy = await prisma.charityUser.findFirst({
      where: { email, id: { not: session.id } },
    });
    if (takenBy) return { error: "البريد الإلكتروني مسجل لحساب آخر" };
  }

  const updateData: { email?: string | null; password?: string | null } = {};

  if (emailProvided) {
    updateData.email = email;
    // Removing the address retires email login, so the hash goes with it —
    // a password nothing can reach is dead weight in the table.
    if (!email) updateData.password = null;
  }

  if (data.password && data.password.trim() !== "") {
    updateData.password = await hashPassword(data.password.trim());
  }

  if (Object.keys(updateData).length === 0) {
    return { success: "لا يوجد تغيير" };
  }

  await prisma.charityUser.update({ where: { id: session.id }, data: updateData });

  await logAudit({
    actorType: "CHARITY_USER",
    actorId: session.id,
    actorName: session.name,
    action: "CREDENTIALS_UPDATED",
    targetType: "CharityUser",
    targetId: session.id,
    // Never the password, not even its length.
    metadata: { emailSet: !!updateData.email, passwordChanged: !!data.password?.trim() },
  });

  return { success: email ? "تم حفظ بيانات الدخول" : "تم إيقاف الدخول بالبريد" };
}
