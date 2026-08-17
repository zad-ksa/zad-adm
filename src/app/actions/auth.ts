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

export async function requestEmployeeOTP(phone: string) {
  try {
    if (!phone) {
      return { error: "يرجى إدخال رقم الجوال" };
    }

    const rl = checkRateLimit(`emp-otp-req:${phone}`, OTP_REQUEST_LIMIT.count, OTP_REQUEST_LIMIT.windowMs);
    if (!rl.allowed) {
      return { error: `عدد محاولات كبير، يرجى المحاولة بعد ${Math.ceil(rl.retryAfterSeconds / 60)} دقيقة` };
    }

    const employee = await prisma.employee.findUnique({
      where: { phone },
    });

    if (!employee) {
      return { error: "رقم الجوال غير مسجل أو الحساب غير نشط" };
    }

    if (!employee.isActive) {
      return { error: "الحساب غير نشط" };
    }

    if (process.env.NODE_ENV === "development" && phone === "0553973917") {
      // Local dev bypass
      return { success: true };
    }

    const authenticaResult = await sendAuthenticaOTP(phone);
    if (authenticaResult.error) {
      return { error: authenticaResult.error };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Employee OTP Request Error:", error);
    return { error: "حدث خطأ داخلي أثناء إرسال الرمز" };
  }
}

export async function verifyEmployeeOTP(phone: string, otp: string) {
  try {
    if (!phone || !otp) {
      return { error: "يرجى إدخال البيانات المطلوبة" };
    }

    const rl = checkRateLimit(`emp-otp-verify:${phone}`, OTP_VERIFY_LIMIT.count, OTP_VERIFY_LIMIT.windowMs);
    if (!rl.allowed) {
      return { error: `عدد محاولات كبير، يرجى المحاولة بعد ${Math.ceil(rl.retryAfterSeconds / 60)} دقيقة` };
    }

    if (process.env.NODE_ENV === "development" && phone === "0553973917") {
      // Local dev bypass - accept any OTP
    } else {
      const authenticaResult = await verifyAuthenticaOTP(phone, otp);
      if (authenticaResult.error) {
        await logAudit({ actorType: "EMPLOYEE", action: "LOGIN_FAILED", metadata: { phone, reason: "invalid_otp" } });
        return { error: authenticaResult.error };
      }
    }

    const employee = await prisma.employee.findUnique({
      where: { phone },
      include: { charity: true }
    });

    if (!employee || !employee.isActive) {
      await logAudit({ actorType: "EMPLOYEE", action: "LOGIN_FAILED", metadata: { phone, reason: "not_found_or_inactive" } });
      return { error: "الحساب غير موجود أو غير نشط" };
    }

    // Create JWT Session
    const sessionData = {
      id: employee.id,
      name: employee.name,
      phone: employee.phone,
      role: employee.role,
      permissions: employee.permissions,
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
      maxAge: SESSION_MAX_AGE_SECONDS, // 24h, refreshed via sliding renewal in proxy.ts
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: employee.id,
      actorName: employee.name,
      action: "LOGIN_SUCCESS",
      metadata: { method: "otp" },
    });

  } catch (error: any) {
    console.error("Employee OTP Verify Error:", error);
    return { error: "حدث خطأ داخلي أثناء التحقق من الرمز" };
  }

  redirect("/main");
}



export async function logout() {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (session) {
    await logAudit({
      actorType: session.userType === "CHARITY_USER" ? "CHARITY_USER" : "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "LOGOUT",
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/");
}

export async function setDeveloperOverrideEmployee(employeeId: string | null) {
  // getSession() only honours this cookie for sessions holding developer_mode,
  // but the action must enforce that itself rather than rely on a check living
  // in another module — otherwise a future change to getSession turns this into
  // a full privilege-escalation endpoint.
  //
  // originalId is accepted alongside developer_mode because while an override
  // is active getSession() replaces session.permissions with the impersonated
  // employee's — checking developer_mode alone would strand the developer in
  // the impersonated identity with no way to call this action and reset.
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  const isDeveloper = session?.permissions?.includes("developer_mode") || !!session?.originalId;
  if (!session || !isDeveloper) {
    throw new Error("غير مصرح");
  }

  const cookieStore = await cookies();
  if (employeeId) {
    cookieStore.set("dev_employee_override", employeeId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  } else {
    cookieStore.set("dev_employee_override", "DEVELOPER_RESET", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
}
