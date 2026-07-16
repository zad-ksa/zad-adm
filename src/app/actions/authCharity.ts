"use server";

import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requestCharityOTP(phone: string) {
  try {
    if (!phone) {
      return { error: "يرجى إدخال رقم الجوال" };
    }

    const user = await prisma.charityUser.findUnique({
      where: { phone },
    });

    if (!user) {
      return { error: "رقم الجوال غير مسجل كحساب جمعية" };
    }

    if (!user.isActive) {
      return { error: "الحساب غير نشط، يرجى مراجعة إدارة زاد" };
    }

    // In the future, integrate with Taqnyat or Unifonic here to send OTP via SMS.
    // For now, OTP is hardcoded to "0000".

    return { success: true };
  } catch (error: any) {
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

    if (otp !== "0000") {
      return { error: "رمز التحقق غير صحيح" };
    }

    const user = await prisma.charityUser.findUnique({
      where: { phone },
      include: {
        charities: {
          include: { charity: true }
        }
      }
    });

    if (!user || !user.isActive) {
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
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

  } catch (error: any) {
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
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

  } catch (error) {
    console.error("Select Charity Error:", error);
    return { error: "حدث خطأ أثناء تبديل الجمعية" };
  }

  // Redirect to the newly selected charity portal
  redirect(`/portal/${encodeURIComponent(charityName)}`);
}
