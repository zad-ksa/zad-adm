"use server";

import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Formats phone numbers (e.g. 0500000000 -> +966500000000)
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("05") && cleaned.length === 10) {
    return "+966" + cleaned.substring(1);
  }
  if (cleaned.startsWith("966") && cleaned.length === 12) {
    return "+" + cleaned;
  }
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  return "+" + cleaned;
}

export async function sendOTP(phone: string) {
  if (!phone) {
    return { error: "يرجى إدخال رقم الجوال" };
  }

  // 1. Verify employee exists and is active in database
  const employee = await prisma.employee.findUnique({
    where: { phone },
  });

  if (!employee || !employee.isActive) {
    return { error: "رقم الجوال غير مسجل أو الحساب غير نشط" };
  }

  const formattedPhone = formatPhone(phone);
  const apiKey = process.env.AUTHENTICA_API_KEY;

  // 2. Send OTP
  if (!apiKey) {
    // Simulation Mode (Local Development)
    const simulatedOtp = "1234";
    console.log(`\n--- [SIMULATION MODE] ---`);
    console.log(`Sending OTP to: ${formattedPhone}`);
    console.log(`Code: ${simulatedOtp}`);
    console.log(`-------------------------\n`);
    
    // Store simulated OTP in cookies temporarily for local validation
    const cookieStore = await cookies();
    cookieStore.set("simulated_otp", JSON.stringify({ phone, code: simulatedOtp }), {
      httpOnly: true,
      maxAge: 300, // 5 minutes
      path: "/",
    });
    
    return { success: true, isSimulated: true };
  }

  try {
    const response = await fetch("https://api.authentica.sa/api/v2/send-otp", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Authorization": apiKey,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        method: "sms",
        template_id: 4,
      }),
    });

    const data = await response.json();

    if (!response.ok || (data && data.status === "failed")) {
      return { error: data.message || "فشل إرسال رمز التحقق عبر المزود" };
    }

    return { success: true };
  } catch (error) {
    console.error("Authentica sendOTP error:", error);
    return { error: "تعذر الاتصال بمزود خدمة التحقق" };
  }
}

export async function verifyOTP(phone: string, otp: string) {
  if (!phone || !otp) {
    return { error: "يرجى إدخال رمز التحقق" };
  }

  const employee = await prisma.employee.findUnique({
    where: { phone },
  });

  if (!employee || !employee.isActive) {
    return { error: "الحساب غير نشط أو تم حذفه" };
  }

  const formattedPhone = formatPhone(phone);
  const apiKey = process.env.AUTHENTICA_API_KEY;
  let isVerified = false;

  if (!apiKey) {
    // Validate Simulation Mode
    const cookieStore = await cookies();
    const simCookie = cookieStore.get("simulated_otp")?.value;
    
    if (simCookie) {
      const { phone: simPhone, code: simCode } = JSON.parse(simCookie);
      if (simPhone === phone && (simCode === otp || otp === "1234")) {
        isVerified = true;
        cookieStore.delete("simulated_otp");
      }
    } else if (otp === "1234") {
      isVerified = true;
    }
  } else {
    // Validate with Authentica API
    try {
      const response = await fetch("https://api.authentica.sa/api/v2/verify-otp", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Authorization": apiKey,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          otp: otp,
          method: "sms",
        }),
      });

      const data = await response.json();

      if (response.ok && data && data.status !== "failed" && !data.error) {
        isVerified = true;
      } else if (data && (data.message || data.error)) {
        return { error: data.message || data.error || "رمز التحقق غير صحيح" };
      }
    } catch (error) {
      console.error("Authentica verifyOTP error:", error);
      return { error: "حدث خطأ أثناء الاتصال بالخادم للتحقق" };
    }
  }

  if (!isVerified) {
    return { error: "رمز التحقق غير صحيح أو انتهت صلاحيته" };
  }

  // Create JWT Session
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
    maxAge: 60 * 60 * 24, // 1 day
  });

  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/");
}
