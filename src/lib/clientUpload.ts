import { createUploadTicket } from "@/app/actions/uploadTicket";
import {
  maxBytesFor,
  maxLabelFor,
  type B2UploadTicket,
  type CloudinaryUploadTicket,
  type UploadPurpose,
  type UploadTicket,
} from "@/lib/uploadPurposes";

/**
 * Uploads files straight from the browser to the storage provider.
 *
 * Replaces POSTing to /api/upload, which routed the bytes through a serverless
 * function whose request body the platform caps at a few megabytes — see
 * createUploadTicket for why raising the advertised limits could never work.
 *
 * The result deliberately uses the same field names /api/upload returned
 * (url, publicId, resourceType, name, size) so callers migrate by swapping the
 * fetch for this call, without rewriting how they read the response.
 *
 * ---
 *
 * **والمزوّدُ يُقرأ من التذكرة لا يُختار هنا.** فالمتصفِّحُ لا يعرف أيَّ مزوّدٍ
 * يعمل اليوم ولا يجوز أن يعرف: التذكرةُ تأتيه موسومةً، فيرفع بما وُسمت به.
 * ولذلك تحوَّل الموقعُ من مزوّدٍ إلى مزوّدٍ بمتغيِّر بيئةٍ واحد، بلا نشرةِ كود.
 *
 * ملاحظةٌ لمن يُعدّل CSP: الرفعُ يخاطب مضيفاً **غيرَ** الذي يُقرأ منه —
 * `api.cloudinary.com` مقابل `res.cloudinary.com`، و`s3.<region>.backblazeb2.com`
 * مقابل `files.zad-co.sa`. والمضيفون الأربعةُ في `connect-src` في
 * `next.config.ts`، وإلّا سقط الرفعُ في المتصفِّح ولم يظهر في سجلِّ الشبكة
 * إلّا طلبٌ محجوب.
 */

export type UploadedFile = {
  url: string;
  publicId: string;
  resourceType: string;
  name: string;
  size: number;
};

export type UploadProgress = {
  fileName: string;
  /** 0–100, or null before the browser reports anything. */
  percent: number | null;
  /** 1-based position within this batch. */
  index: number;
  total: number;
};

function postToCloudinary(
  file: File,
  ticket: CloudinaryUploadTicket,
  onPercent?: (percent: number) => void
): Promise<{ secure_url: string; public_id: string; resource_type: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    // Every signed parameter must be present and identical to what was signed,
    // or Cloudinary answers 401.
    form.append("file", file);
    form.append("api_key", ticket.apiKey);
    form.append("timestamp", String(ticket.timestamp));
    form.append("signature", ticket.signature);
    form.append("folder", ticket.folder);
    form.append("public_id", ticket.publicId);

    // XHR rather than fetch purely for upload progress — fetch cannot report
    // it, and a large file with no feedback looks like a hung page.
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${ticket.cloudName}/${ticket.resourceType}/upload`
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onPercent) onPercent(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let body: Record<string, unknown> | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(body as never);
        return;
      }
      // Cloudinary puts the reason in { error: { message } }. Surfaced rather
      // than swallowed: "file too large" and "invalid signature" call for very
      // different responses from whoever hits them.
      const message =
        (body?.error as { message?: string } | undefined)?.message || `فشل الرفع (${xhr.status})`;
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("تعذّر الاتصال بخدمة الملفات"));
    xhr.onabort = () => reject(new Error("أُلغي الرفع"));

    xhr.send(form);
  });
}

/**
 * رفعٌ مباشرٌ إلى باك بليز بـ`PUT` على رابطٍ مُوقَّع.
 *
 * ولا نموذجَ ولا حقولَ: الجسمُ هو الملفُّ نفسُه، والإجازةُ في الرابط. وهذا
 * فرقٌ جوهريٌّ عن Cloudinary — تلك تأخذ `POST` بنموذجٍ تُوقَّع حقولُه، وهذه
 * تأخذ البايتاتِ خامّاً على مسارٍ مُوقَّع.
 *
 * و**نوعُ المحتوى يُرسل كما جاء في التذكرة لا كما يراه المتصفِّح**: باك بليز
 * تحفظ ما أُرسل وتُعيده حرفاً، فلو أُرسل `File.type` الفارغُ — وهو فارغٌ لـpsd
 * وindd وrar — خُدم الملفُّ خامّاً فنُزِّل ولم يُعرض، ولا يُصلح بعدها إلّا
 * بنسخِ الكائن.
 */
function putToB2(
  file: File,
  ticket: B2UploadTicket,
  onPercent?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", ticket.uploadUrl);
    xhr.setRequestHeader("Content-Type", ticket.contentType);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onPercent) onPercent(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      // باك بليز تردُّ خطأها XML لا JSON. ويُستخرج نصُّ الرسالة بقَصٍّ بسيطٍ لا
      // بمُحلِّل: الغايةُ سطرٌ يُقرأ، ومُحلِّلُ XML في المتصفِّح يسقط على جسمٍ
      // مقطوعٍ فيُخفي الخطأَ الأصليّ.
      const body = xhr.responseText || "";
      const detail = body.match(/<Message>([^<]+)</)?.[1]?.trim();
      // و٤٠٣ هنا شبه دائماً رابطٌ انتهى عمرُه: التذكرةُ تعيش عشرَ دقائق، وملفٌّ
      // كبيرٌ على شبكةٍ بطيئةٍ قد يتجاوزها. فيُقال للمستخدم ما يفعل لا ما جرى.
      const expired = xhr.status === 403 && /expired/i.test(body);
      reject(
        new Error(
          expired ? "انتهت صلاحية الرفع، حاول مرة أخرى" : detail || `فشل الرفع (${xhr.status})`
        )
      );
    };

    // والحالةُ صفرٌ في `onerror` تعني أنّ المتصفِّحَ لم يرَ ردّاً أصلاً، وأغلبُ
    // أسبابها على هذا المسار قاعدةُ CORS الناقصةُ على المستودع: التوقيعُ صحيح،
    // والطلبُ يُرسل، والردُّ يُحجب فلا يصل منه شيء. ولذلك يُسمّى السببُ في
    // النصّ: من رأى «تعذّر الاتصال» وحدَها قضى ساعةً يُراجع المفاتيح.
    xhr.onerror = () =>
      reject(new Error("تعذّر الاتصال بخدمة الملفات — راجع قواعد CORS على المستودع"));
    xhr.onabort = () => reject(new Error("أُلغي الرفع"));

    xhr.send(file);
  });
}

/**
 * يرفع ملفاً بتذكرةٍ جاهزة.
 *
 * ومُصدَّرٌ لأنّ مسارَ الاستبيان العامّ يُصدر تذكرتَه من فعلٍ آخرَ
 * (`createSurveyUploadTicket`) لا يطلب جلسة. وكان ذلك المسارُ يكتب رفعَه بيده
 * داخل الصفحة، فافترق عن هذا الملفّ في كلِّ شيءٍ — لا تقدُّمَ، ولا رسالةَ خطأٍ
 * من المزوّد، ولا مزوّدَ ثانياً. فصار كلُّ رفعٍ في الموقع يمرّ من هنا.
 */
export async function uploadWithTicket(
  file: File,
  ticket: UploadTicket,
  onPercent?: (percent: number) => void
): Promise<UploadedFile> {
  if (ticket.provider === "b2") {
    await putToB2(file, ticket, onPercent);
    return {
      url: ticket.publicUrl,
      // **فارغان عن قصد.** فالمفتاحُ يُشتقُّ من الرابط دائماً
      // (`keyFromPublicUrl`)، وعمودٌ اسمُه `cloudinaryPublicId` يحمل مفتاحَ باك
      // بليز كذبةٌ تُضلِّل من يقرؤه بعدنا. والأهمُّ أنّ `deletePlanFor` تقرأ
      // الرابطَ أوّلاً: فلو فرغ الرابطُ يوماً وبقي هذان، لحاولت الحذفَ من
      // Cloudinary بمفتاحٍ ليس لها — فتمضي «بنجاح» ويبقى الملفُّ أبداً.
      // والفراغُ يجعلها تمتنع وتقول السبب.
      publicId: "",
      resourceType: "",
      name: file.name,
      size: file.size,
    };
  }

  const result = await postToCloudinary(file, ticket, onPercent);
  return {
    url: result.secure_url,
    publicId: result.public_id,
    // Cloudinary needs the same resource_type back when deleting the asset,
    // otherwise destroy() defaults to "image" and silently no-ops on raw files.
    resourceType: result.resource_type || ticket.resourceType,
    name: file.name,
    size: file.size,
  };
}

/**
 * شاهدُ مهمّةٍ مُنجَزة.
 *
 * وتذكرتُه من `/api/tasks/upload-proof` لا من `createUploadTicket`: لذلك
 * المسارِ حدٌّ أصغرُ (عشرةُ ميجابايت)، وقائمةُ امتداداتٍ تقبل heic وheif
 * لأنّ الشاهدَ يُرفع من الجوّال، ومجلَّدٌ بالسنةِ والشهر. ولو أُلحق
 * بالأغراض المشتركة لوجب أن تقبل كلُّ الأغراضِ heic — وهي لا تُعرض في
 * أكثر المتصفِّحات، فلا تصلح صورةً رمزيّةً ولا شعاراً.
 */
export async function uploadTaskProof(
  file: File,
  onPercent?: (percent: number) => void
): Promise<UploadedFile> {
  const res = await fetch("/api/tasks/upload-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ticket) {
    throw new Error(data?.error || "فشل رفع الشاهد");
  }
  return uploadWithTicket(file, data.ticket as UploadTicket, onPercent);
}

/**
 * Uploads one file. Throws with a message worth showing the user.
 */
export async function uploadFile(
  file: File,
  purpose: UploadPurpose,
  onPercent?: (percent: number) => void
): Promise<UploadedFile> {
  // Checked here as well as on the server so an oversized file fails at once
  // instead of after a long doomed upload.
  if (file.size > maxBytesFor(purpose)) {
    throw new Error(`${file.name}: حجم الملف يتجاوز ${maxLabelFor(purpose)}`);
  }

  const { ticket, error } = await createUploadTicket(purpose, file.name, file.size);
  if (error || !ticket) throw new Error(`${file.name}: ${error || "تعذّر تجهيز الرفع"}`);

  return uploadWithTicket(file, ticket, onPercent);
}

/**
 * Uploads a batch, one at a time. Sequential on purpose: these are large files
 * on connections that are often not, and saturating the uplink makes every one
 * of them slower and the progress meaningless.
 *
 * Throws on the first failure rather than returning partial results — a caller
 * that silently kept the successful subset is exactly how attachments went
 * missing before.
 */
export async function uploadFiles(
  files: File[],
  purpose: UploadPurpose,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedFile[]> {
  const out: UploadedFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.({ fileName: file.name, percent: null, index: i + 1, total: files.length });
    out.push(
      await uploadFile(file, purpose, (percent) =>
        onProgress?.({ fileName: file.name, percent, index: i + 1, total: files.length })
      )
    );
  }
  return out;
}
