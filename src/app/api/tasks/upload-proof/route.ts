import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSession } from "@/lib/auth";
import { newStorageKey, presignUpload, uploadProvider } from "@/lib/b2";
import { contentTypeFor } from "@/lib/mime";
import type { UploadTicket } from "@/lib/uploadPurposes";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Images only: both call sites in TasksClient.tsx use accept="image/*", and a
// proof of a completed task is a photo or a screenshot.
//
// وتُقبل heic وheif هنا ولا تُقبلان في بقيّة المواضع: الشاهدُ يُرفع من الجوّال
// غالباً، وكاميرا آيفون تُخرج heic افتراضاً. ولو أُحيلت هذه القائمةُ إلى
// `ALLOWED_EXTENSIONS` المشتركة لسقط أكثرُ الشواهد، أو لقُبلت heic للصور
// الرمزيّةِ والشعاراتِ — وهي لا تُعرض في أكثر المتصفِّحات.
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"]);

/**
 * يُصدر تذكرةَ رفعٍ لشاهدِ مهمّة — ولا يستقبل البايتات.
 *
 * وكان يستقبلها: `formData()` ثمّ `upload_stream` إلى Cloudinary. وفيه العيبُ
 * نفسُه الذي أُخرج منه `/api/upload` — جسمُ الطلب في دالّةٍ عديمةِ الخادم
 * تحجزه المنصّةُ عند أربعةٍ ونصفٍ من الميجابايت تقريباً، **فتُرفض الصورةُ قبل
 * أن يُنفَّذ سطرٌ من هذا الملفّ**. فحدُّ العشرةِ المكتوبُ أدناه لم يكن يُفحَص
 * أصلاً في الملفّات التي تتجاوز ذلك، ورأى المستخدمُ «فشل رفع الشاهد» بلا سبب.
 * وصورةُ جوّالٍ حديثٍ تتجاوز الأربعةَ ونصفَ بلا كلفة.
 *
 * فالآن تمرّ البايتاتُ من المتصفِّح إلى المزوّد مباشرةً، وحدُّ العشرةِ يُفحَص
 * على الحجم المُعلَن قبل أن تُصدر التذكرة، فيُرفض الكبيرُ **فوراً** وبعبارةٍ
 * تقول الحدَّ بالرقم.
 *
 * وما فُقد في الطريق: `quality: "auto"` و`fetch_format: "auto"` اللتان كانت
 * Cloudinary تضغط بهما الصورةَ عند الرفع. ورفعٌ مباشرٌ بتوقيعٍ لا يحمل
 * تحويلاً، والمزوّدُ الذي نمضي إليه لا يُحوِّل أصلاً. والثمنُ مقبول: شاهدٌ
 * بحجمه الأصليِّ تحتَ عشرةِ ميجابايت، مقابل شاهدٍ يُرفض قبل أن يُرى.
 */
export async function POST(request: Request) {
  try {
    // Any authenticated employee may attach a proof to their own task, so this
    // is a session check rather than a permission check.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const fileName = typeof body?.fileName === "string" ? body.fileName : "";
    const fileSize = Number(body?.fileSize);

    if (!fileName) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "ملف غير صالح" }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "حجم الملف يتجاوز الحد الأقصى المسموح (10 ميجابايت)" },
        { status: 413 }
      );
    }

    const lastDotIndex = fileName.lastIndexOf(".");
    const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex + 1).toLowerCase() : "";
    const nameWithoutExt = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "نوع الملف غير مدعوم، يُقبل رفع الصور فقط" }, { status: 415 });
    }

    // Folder by year/month, as before: the shape of the stored keys is what
    // makes a year of proofs browsable in the provider's own console.
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const folderPath = `tasks_proofs/${year}/${month}`;

    if (uploadProvider() === "b2") {
      const key = newStorageKey(folderPath, fileName);
      const target = presignUpload(key);
      const ticket: UploadTicket = {
        provider: "b2",
        uploadUrl: target.uploadUrl,
        publicUrl: target.publicUrl,
        key: target.key,
        contentType: contentTypeFor(key),
      };
      return NextResponse.json({ ticket });
    }

    const publicId = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, "_") + "_" + Date.now();
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { folder: folderPath, public_id: publicId, timestamp },
      process.env.CLOUDINARY_API_SECRET as string
    );

    const ticket: UploadTicket = {
      provider: "cloudinary",
      cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
      apiKey: process.env.CLOUDINARY_API_KEY as string,
      timestamp,
      signature,
      folder: folderPath,
      publicId,
      // "auto" لا "image": المسارُ المُوقَّع يُرفع عليه بـ`auto` فتستنبط
      // Cloudinary النوعَ من البايتات، والقائمةُ أعلاه تحصره في الصور أصلاً.
      resourceType: "auto",
    };
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Upload ticket error:", error);
    return NextResponse.json({ error: "تعذّر تجهيز الرفع" }, { status: 500 });
  }
}
