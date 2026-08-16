import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/auditLog";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

// Allowlist (not a blocklist) — covers every file type the app's features
// actually need (mail/design-request/task attachments, charity logos), while
// rejecting executables/scripts that have no legitimate use here.
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
  "psd", "ai", "eps", "indd",
  "zip", "rar",
  "mp4", "webm", "mp3", "wav",
]);

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    // Optional; defaults to the historical folder so existing callers are unaffected.
    const folder = (formData.get("folder") as string) || "zad_charity_logos";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "حجم الملف يتجاوز الحد الأقصى المسموح (25 ميجابايت)" }, { status: 413 });
    }

    const originalName = file.name || "file";
    const lastDotIndex = originalName.lastIndexOf(".");
    const nameWithoutExt = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
    const ext = lastDotIndex !== -1 ? originalName.substring(lastDotIndex + 1) : "";

    if (!ext || !ALLOWED_EXTENSIONS.has(ext.toLowerCase())) {
      return NextResponse.json({ error: "نوع الملف غير مدعوم" }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary using a promise
    const result = await new Promise((resolve, reject) => {
      const isMedia = ["jpg", "jpeg", "png", "gif", "webp", "mp4", "webm"].includes(ext.toLowerCase());
      const resourceType = isMedia ? "auto" : "raw";

      cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          // Cloudinary for raw files needs the extension in the public_id to serve it correctly
          public_id: nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, "_") + "_" + Date.now() + (ext && !isMedia ? `.${ext}` : ""),
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    await logAudit({
      actorType: session.userType === "CHARITY_USER" ? "CHARITY_USER" : "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "FILE_UPLOAD",
      metadata: { fileName: file.name, size: file.size, folder },
    });

    return NextResponse.json({
      url: (result as any).secure_url,
      publicId: (result as any).public_id,
      // Cloudinary needs the same resource_type back when deleting the asset,
      // otherwise destroy() defaults to "image" and silently no-ops on raw files.
      resourceType: (result as any).resource_type,
      name: file.name,
      size: file.size
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
