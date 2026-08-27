"use server";

import { v2 as cloudinary } from "cloudinary";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/auditLog";
import {
  UPLOAD_PURPOSES,
  ALLOWED_EXTENSIONS,
  MEDIA_EXTENSIONS,
  IMAGE_EXTENSIONS,
  IMAGE_ONLY_PURPOSES,
  maxLabelFor,
  type UploadPurpose,
} from "@/lib/uploadPurposes";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED = new Set<string>(ALLOWED_EXTENSIONS);
const MEDIA = new Set<string>(MEDIA_EXTENSIONS);
const IMAGES = new Set<string>(IMAGE_EXTENSIONS);

export type UploadTicket = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  resourceType: "auto" | "raw";
};

/**
 * Mints a short-lived Cloudinary signature so the browser uploads straight to
 * Cloudinary, without the bytes passing through this app.
 *
 * Why this replaced /api/upload: that route takes the file as a request body,
 * and a serverless function's request body is capped by the platform at a few
 * megabytes — far below the 25MB the route advertised and the 50MB the
 * approvals form promised. A 6MB attachment was rejected by the platform before
 * the handler ran, so the route's own size check never fired and the user saw a
 * bare "upload failed". Three different numbers, none of them the real one.
 * Raising any of them could not help, because the ceiling was never ours.
 *
 * What we give up by not seeing the bytes: the extension allowlist applies to
 * the *declared* filename, and the size is the one the client reports. Both
 * bound honest mistakes rather than a determined signed-in user; the backstop
 * for that is the Cloudinary account's own limits. What we keep is the part
 * that matters — the signature is minted only for a signed-in user, commits the
 * folder and public_id, and Cloudinary refuses any upload whose parameters do
 * not match what was signed. The client picks a purpose, never a folder.
 */
export async function createUploadTicket(
  purpose: UploadPurpose,
  fileName: string,
  fileSize: number
): Promise<{ ticket?: UploadTicket; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "غير مصرح" };

  const config = UPLOAD_PURPOSES[purpose];
  if (!config) return { error: "نوع رفع غير معروف" };

  if (!Number.isFinite(fileSize) || fileSize <= 0) return { error: "ملف غير صالح" };
  if (fileSize > config.maxBytes) {
    return { error: `حجم الملف يتجاوز الحد الأقصى المسموح (${maxLabelFor(purpose)})` };
  }

  const original = fileName || "file";
  const dot = original.lastIndexOf(".");
  const ext = dot !== -1 ? original.slice(dot + 1).toLowerCase() : "";
  const stem = dot !== -1 ? original.slice(0, dot) : original;

  if (!ext || !ALLOWED.has(ext)) return { error: "نوع الملف غير مدعوم" };
  if (IMAGE_ONLY_PURPOSES.includes(purpose) && !IMAGES.has(ext)) {
    return { error: "يجب اختيار صورة" };
  }

  const isMedia = MEDIA.has(ext);
  const resourceType: "auto" | "raw" = isMedia ? "auto" : "raw";

  // Raw files need the extension inside the public_id or Cloudinary serves them
  // with the wrong content type.
  const publicId =
    stem.replace(/[^a-zA-Z0-9_-]/g, "_") + "_" + Date.now() + (ext && !isMedia ? `.${ext}` : "");

  const timestamp = Math.round(Date.now() / 1000);

  // Every parameter the browser will send, minus the file and the ones
  // Cloudinary excludes by rule (api_key, resource_type, cloud_name).
  //
  // Only real Cloudinary upload parameters belong here. An invented one —
  // max_bytes was tried — is silently dropped by api_sign_request when building
  // the string to sign while the browser still sends it, so every upload fails
  // with "Invalid Signature" and nothing in the message says why.
  const signature = cloudinary.utils.api_sign_request(
    { folder: config.folder, public_id: publicId, timestamp },
    process.env.CLOUDINARY_API_SECRET as string
  );

  await logAudit({
    actorType: session.userType === "CHARITY_USER" ? "CHARITY_USER" : "EMPLOYEE",
    actorId: session.id,
    actorName: session.name,
    action: "FILE_UPLOAD",
    metadata: { fileName: original, size: fileSize, folder: config.folder, purpose },
  });

  return {
    ticket: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
      apiKey: process.env.CLOUDINARY_API_KEY as string,
      timestamp,
      signature,
      folder: config.folder,
      publicId,
      resourceType,
    },
  };
}
