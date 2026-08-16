"use server";

import { prisma } from "@/lib/db";
import { encrypt, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sendAuthenticaOTP, verifyAuthenticaOTP } from "@/lib/authentica";
import { checkRateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/auditLog";

const OTP_REQUEST_LIMIT = { count: 3, windowMs: 15 * 60 * 1000 }; // 3 / 15 min
const OTP_VERIFY_LIMIT = { count: 5, windowMs: 15 * 60 * 1000 }; // 5 / 15 min

export async function requestCharityOTP(phone: string) {
  try {
    if (!phone) {
      return { error: "يرجى إدخال رقم الجوال" };
    }

    const rl = checkRateLimit(`charity-otp-req:${phone}`, OTP_REQUEST_LIMIT.count, OTP_REQUEST_LIMIT.windowMs);
    if (!rl.allowed) {
      return { error: `عدد محاولات كبير، يرجى المحاولة بعد ${Math.ceil(rl.retryAfterSeconds / 60)} دقيقة` };
    }

    const cleanPhone = phone.trim();
    const phoneVariants = [
      cleanPhone,
      cleanPhone.startsWith("0") ? cleanPhone : "0" + cleanPhone,
      cleanPhone.replace(/^0+/, "")
    ];
    // Dev-only bypass — must never activate outside local development, regardless of the phone dialed.
    const isDevPhone = process.env.NODE_ENV === "development" && phoneVariants.some(p => p.includes("553973917"));

    let user = await prisma.charityUser.findFirst({
      where: { phone: { in: phoneVariants } },
      include: {
        charities: {
          include: { charity: true }
        }
      }
    });

    // Auto-create dev test account if phone is 0553973917 and user doesn't exist in DB
    if (!user && isDevPhone) {
      const firstCharity = await prisma.charity.findFirst();
      if (firstCharity) {
        user = await prisma.charityUser.create({
          data: {
            name: "حساب جمعية (تطوير)",
            phone: "0553973917",
            title: "FULL_TIME",
            isActive: true,
            charities: {
              create: {
                charityId: firstCharity.id
              }
            }
          },
          include: {
            charities: {
              include: { charity: true }
            }
          }
        });
      }
    }

    if (!user) {
      return { error: "رقم الجوال غير مسجل كحساب جمعية" };
    }

    if (!user.isActive) {
      return { error: "الحساب غير نشط، يرجى مراجعة إدارة زاد" };
    }

    // Direct Login for local dev phone 0553973917 without requesting or sending OTP
    if (isDevPhone) {
      if (user.charities.length === 0) {
        return { error: "هذا الحساب غير مرتبط بأي جمعية" };
      }

      const defaultCharity = user.charities[0].charity;

      const sessionData = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        title: user.title,
        permissions: user.permissions,
        charityId: defaultCharity.id,
        userType: "CHARITY_USER"
      };

      const encryptedSession = await encrypt(sessionData);

      const cookieStore = await cookies();
      cookieStore.set("session", encryptedSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS, // 24h, refreshed via sliding renewal in proxy.ts
      });

      if (user.charities.length > 1) {
        redirect("/select-charity");
      } else {
        redirect(`/portal/${encodeURIComponent(user.charities[0].charity.name)}`);
      }
    }

    // Call Authentica to send OTP for normal users
    const authenticaResult = await sendAuthenticaOTP(phone);
    if (authenticaResult.error) {
      return { error: authenticaResult.error };
    }

    return { success: true };
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("OTP Request Error:", error);
    return { error: "حدث خطأ داخلي أثناء إرسال الرمز" };
  }
}

export async function verifyCharityOTP(phone: string, otp: string) {
  let userWithCharities = null;
  try {
    if (!phone || !otp) {
      return { error: "يرجى إدخال البيانات المطلوبة" };
    }

    const rl = checkRateLimit(`charity-otp-verify:${phone.trim()}`, OTP_VERIFY_LIMIT.count, OTP_VERIFY_LIMIT.windowMs);
    if (!rl.allowed) {
      return { error: `عدد محاولات كبير، يرجى المحاولة بعد ${Math.ceil(rl.retryAfterSeconds / 60)} دقيقة` };
    }

    const cleanPhone = phone.trim();
    const phoneVariants = [
      cleanPhone,
      cleanPhone.startsWith("0") ? cleanPhone : "0" + cleanPhone,
      cleanPhone.replace(/^0+/, "")
    ];
    // Dev-only bypass — must never activate outside local development, regardless of the phone dialed.
    const isDevPhone = process.env.NODE_ENV === "development" && phoneVariants.some(p => p.includes("553973917"));

    // Skip Authentica OTP check for local dev test phone 0553973917
    if (!isDevPhone) {
      const authenticaResult = await verifyAuthenticaOTP(phone, otp);
      if (authenticaResult.error) {
        await logAudit({ actorType: "CHARITY_USER", action: "LOGIN_FAILED", metadata: { phone: cleanPhone, reason: "invalid_otp" } });
        return { error: authenticaResult.error };
      }
    }

    let user = await prisma.charityUser.findFirst({
      where: { phone: { in: phoneVariants } },
      include: {
        charities: {
          include: { charity: true }
        }
      }
    });

    if (!user || !user.isActive) {
      await logAudit({ actorType: "CHARITY_USER", action: "LOGIN_FAILED", metadata: { phone: cleanPhone, reason: "not_found_or_inactive" } });
      return { error: "الحساب غير موجود أو غير نشط" };
    }

    if (user.charities.length === 0) {
      return { error: "هذا الحساب غير مرتبط بأي جمعية" };
    }

    userWithCharities = user;

    // Use the first charity as default for the session
    const defaultCharity = user.charities[0].charity;

    const sessionData = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      title: user.title,
      permissions: user.permissions,
      charityId: defaultCharity.id,
      userType: "CHARITY_USER"
    };

    const encryptedSession = await encrypt(sessionData);

    const cookieStore = await cookies();
    cookieStore.set("session", encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS, // 24h, refreshed via sliding renewal in proxy.ts
    });

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: user.id,
      actorName: user.name,
      action: "LOGIN_SUCCESS",
      metadata: { method: "otp", charityId: defaultCharity.id },
    });

  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("OTP Verify Error:", error);
    return { error: "حدث خطأ داخلي أثناء التحقق من الرمز" };
  }

  // Redirect based on number of charities
  if (userWithCharities.charities.length > 1) {
    redirect("/select-charity");
  } else {
    redirect(`/portal/${encodeURIComponent(userWithCharities.charities[0].charity.name)}`);
  }
}

export async function selectCharitySession(charityId: string) {
  let charityName = "";
  try {
    const { getSession, encrypt } = await import("@/lib/auth");
    const session = await getSession();
    
    if (!session || session.userType !== "CHARITY_USER") {
      return { error: "غير مصرح" };
    }

    // Verify user is actually linked to this charity
    const link = await prisma.charityUserCharity.findUnique({
      where: {
        charityUserId_charityId: {
          charityUserId: session.id,
          charityId: charityId
        }
      },
      include: { charity: true }
    });

    if (!link) {
      return { error: "ليس لديك صلاحية الوصول لهذه الجمعية" };
    }

    charityName = link.charity.name;

    const sessionData = {
      ...session,
      charityId: charityId
    };

    const encryptedSession = await encrypt(sessionData);

    const cookieStore = await cookies();
    cookieStore.set("session", encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS, // 24h, refreshed via sliding renewal in proxy.ts
    });

  } catch (error) {
    console.error("Select Charity Error:", error);
    return { error: "حدث خطأ أثناء تبديل الجمعية" };
  }

  // Redirect to the newly selected charity portal
  redirect(`/portal/${encodeURIComponent(charityName)}`);
}
