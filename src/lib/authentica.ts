export const AUTHENTICA_API_URL = "https://api.authentica.sa/api/v2";

export async function sendAuthenticaOTP(phone: string) {
  // Format phone to E.164 without '+' assuming Saudi Arabia (+966)
  // Ensure the phone starts with +966
  let formattedPhone = phone;
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "+966" + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith("+")) {
    formattedPhone = "+" + formattedPhone;
  }

  const payload = {
    method: "sms",
    phone: formattedPhone,
  };

  try {
    const response = await fetch(`${AUTHENTICA_API_URL}/send-otp`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Authorization": process.env.AUTHENTICA_API_KEY || "",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Authentica Send OTP Error:", data);
      return { error: data.message || "حدث خطأ أثناء إرسال رمز التحقق عبر Authentica" };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Authentica Send OTP Catch Error:", error);
    return { error: "حدث خطأ داخلي أثناء التواصل مع خدمة Authentica" };
  }
}

export async function verifyAuthenticaOTP(phone: string, otp: string) {
  let formattedPhone = phone;
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "+966" + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith("+")) {
    formattedPhone = "+" + formattedPhone;
  }

  const payload = {
    phone: formattedPhone,
    otp: otp,
  };

  try {
    const response = await fetch(`${AUTHENTICA_API_URL}/verify-otp`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Authorization": process.env.AUTHENTICA_API_KEY || "",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Authentica Verify OTP Error:", data);
      return { error: data.message || "فشل التحقق من الرمز المدخل عبر Authentica" };
    }

    // Usually Authentica returns {"verified": true} or {"status": "verified"} or similar
    // We will consider response.ok as success, but double check 'verified' if available.
    if (data.verified === false) {
      return { error: "رمز التحقق المدخل غير صحيح أو منتهي الصلاحية" };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Authentica Verify OTP Catch Error:", error);
    return { error: "حدث خطأ داخلي أثناء التواصل مع خدمة Authentica للتحقق" };
  }
}
