import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    // Optional; defaults to the historical folder so existing callers are unaffected.
    const folder = (formData.get("folder") as string) || "zad_charity_logos";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary using a promise
    const result = await new Promise((resolve, reject) => {
      // Extract original filename without extension and the extension
      const originalName = file.name || "file";
      const lastDotIndex = originalName.lastIndexOf(".");
      const nameWithoutExt = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
      const ext = lastDotIndex !== -1 ? originalName.substring(lastDotIndex + 1) : "";
      
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
