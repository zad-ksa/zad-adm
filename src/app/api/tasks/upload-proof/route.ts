import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSession } from "@/lib/auth";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Images only: the upload below applies Cloudinary image transformations
// (quality/fetch_format auto) that are meaningless for other types, and both
// call sites in TasksClient.tsx use accept="image/*".
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"]);

export async function POST(request: Request) {
  try {
    // Any authenticated employee may attach a proof to their own task, so this
    // is a session check rather than a permission check.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "حجم الملف يتجاوز الحد الأقصى المسموح (10 ميجابايت)" },
        { status: 413 }
      );
    }

    const originalName = file.name || "";
    const lastDotIndex = originalName.lastIndexOf(".");
    const ext = lastDotIndex !== -1 ? originalName.substring(lastDotIndex + 1).toLowerCase() : "";

    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "نوع الملف غير مدعوم، يُقبل رفع الصور فقط" }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a dynamic folder based on current year/month
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const folderPath = `tasks_proofs/${year}/${month}`;

    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: folderPath,
          resource_type: "image",
          quality: "auto", // Automatically compress the image
          fetch_format: "auto", // Serve best format (webp/avif)
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
