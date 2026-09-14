export const AUTHENTICA_API_URL = "https://api.authentica.sa/api/v2";

/**
 * نتيجة نداء Authentica.
 *
 * عند الفشل تحمل ثلاثة: رسالةً عربية تُعرض للمستخدم، ورمز HTTP، ورسالة المزوّد
 * الخام. كانت الرسالة الخام تُعرض للمستخدم مباشرةً، فلما انهارت الخدمة عند
 * ماهر المحمادي رأى «Server Error» بالإنجليزية — نصَّ Laravel الافتراضي — ولم
 * يُسجَّل شيء، فلم يُعرف السبب إلا بالتخمين. الآن تُترجَم للمستخدم، وتُحفَظ
 * الخام لسجلّ التدقيق.
 */
export type AuthenticaResult =
  | {
      success: true;
      data: unknown;
      error?: undefined;
      status?: undefined;
      providerMessage?: undefined;
    }
  | {
      success?: undefined;
      error: string;
      /** رمز HTTP من المزوّد، أو null إن لم يُوصَل إليه أصلاً. */
      status: number | null;
      /** نصّ المزوّد كما وصل، مقصوصاً — لسجلّ التدقيق لا للمستخدم. */
      providerMessage: string | null;
    };

type Kind = "send" | "verify";

function formatPhone(phone: string) {
  // E.164 assuming Saudi Arabia (+966).
  if (phone.startsWith("0")) return "+966" + phone.substring(1);
  if (!phone.startsWith("+")) return "+" + phone;
  return phone;
}

function hasArabic(text: string) {
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0x0600 && code <= 0x06ff) return true;
  }
  return false;
}

/**
 * ما يراه المستخدم.
 *
 * رسالة المزوّد العربية تُعرض كما هي: كُتبت له. والإنجليزية تُستبدل بحسب
 * الرمز، لأن «Server Error» أو «Unauthenticated» لا تقول لعضو جمعية ماذا يفعل.
 */
function userMessage(kind: Kind, status: number | null, providerMessage: string | null) {
  if (providerMessage && hasArabic(providerMessage)) return providerMessage;

  if (status === null) {
    return kind === "send"
      ? "تعذّر الاتصال بخدمة الرسائل، يرجى المحاولة بعد قليل"
      : "تعذّر الاتصال بخدمة الرسائل للتحقق من الرمز، يرجى المحاولة بعد قليل";
  }
  if (status === 429) {
    return "طلباتٌ كثيرة على خدمة الرسائل، يرجى المحاولة بعد دقائق";
  }
  if (status >= 500) {
    return kind === "send"
      ? "تعذّر إرسال رمز التحقق الآن بسبب عطلٍ مؤقت في خدمة الرسائل، يرجى المحاولة بعد قليل"
      : "تعذّر التحقق من الرمز الآن بسبب عطلٍ مؤقت في خدمة الرسائل، يرجى المحاولة بعد قليل";
  }
  // 4xx: عند التحقق هو في الغالب رمزٌ خاطئ أو منتهٍ؛ وعند الإرسال رقمٌ ترفضه الخدمة.
  return kind === "send"
    ? "تعذّر إرسال رمز التحقق إلى هذا الرقم، يرجى التأكد منه أو المحاولة لاحقاً"
    : "رمز التحقق المدخل غير صحيح أو منتهي الصلاحية";
}

/**
 * سبب الفشل لسجلّ التدقيق، مستنتجاً من الرمز.
 *
 * يفرّق بين ما يقع على المستخدم (رمزٌ خاطئ) وما يقع على المزوّد (عطلٌ أو
 * انقطاع) — وهو ما لم يكن السجلّ يفرّق بينه، فكان كل فشلٍ «invalid_otp».
 */
export function authenticaFailureReason(status: number | null) {
  if (status === null) return "provider_unreachable";
  if (status >= 500) return "provider_error";
  if (status === 429) return "provider_rate_limited";
  return "invalid_otp";
}

/**
 * يقرأ الردّ نصّاً ثم يحاول تحليله. المزوّد المنهار قد يُرجع صفحة HTML لا
 * JSON، وresponse.json() كان يرمي عندها فيضيع رمز HTTP كله في مسار catch.
 */
async function readBody(response: Response): Promise<{ data: any; message: string | null }> {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    const raw = data?.message ?? data?.error ?? null;
    return { data, message: raw === null ? null : String(raw).slice(0, 300) };
  } catch {
    return { data: null, message: text ? text.slice(0, 300) : null };
  }
}

async function call(kind: Kind, path: string, payload: Record<string, unknown>): Promise<AuthenticaResult> {
  let response: Response;
  try {
    response = await fetch(`${AUTHENTICA_API_URL}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Authorization": process.env.AUTHENTICA_API_KEY || "",
      },
      body: JSON.stringify(payload),
    });
  } catch (error: any) {
    console.error(`Authentica ${kind} unreachable:`, error);
    const providerMessage = error?.message ? String(error.message).slice(0, 300) : null;
    return { error: userMessage(kind, null, providerMessage), status: null, providerMessage };
  }

  const { data, message } = await readBody(response);

  if (!response.ok) {
    console.error(`Authentica ${kind} error:`, response.status, data ?? message);
    return {
      error: userMessage(kind, response.status, message),
      status: response.status,
      providerMessage: message,
    };
  }

  // Usually Authentica returns {"verified": true} or similar; an explicit
  // false is a wrong or expired code even though HTTP said 200.
  if (kind === "verify" && data?.verified === false) {
    return {
      error: "رمز التحقق المدخل غير صحيح أو منتهي الصلاحية",
      status: response.status,
      providerMessage: message ?? "verified: false",
    };
  }

  return { success: true, data };
}

export async function sendAuthenticaOTP(phone: string): Promise<AuthenticaResult> {
  return call("send", "/send-otp", { method: "sms", phone: formatPhone(phone), template_id: 9 });
}

export async function verifyAuthenticaOTP(phone: string, otp: string): Promise<AuthenticaResult> {
  return call("verify", "/verify-otp", { phone: formatPhone(phone), otp });
}
