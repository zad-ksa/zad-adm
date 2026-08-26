"use server";

import { v2 as cloudinary } from "cloudinary";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/auditLog";
import { ALLOWED_EXTENSIONS, MEDIA_EXTENSIONS, DESIGN_MAX_BYTES } from "@/lib/uploadLimits";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// This path never sees the bytes, so it can only vet the declared extension.
const ALLOWED = new Set<string>(ALLOWED_EXTENSIONS);
const MEDIA = new Set<string>(MEDIA_EXTENSIONS);

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
 * Issues a short-lived Cloudinary signature so the browser can upload straight
 * to Cloudinary, without the bytes passing through this app at all.
 *
 * Why this exists: /api/upload accepts the file as a request body, and a
 * serverless function's request body is capped far below the 25MB that route
 * advertises — a 6MB attachment was already failing in production, rejected by
 * the platform before the handler ran, so the friendly Arabic size message
 * never even fired. Raising the number in that route cannot fix it, because the
 * ceiling is not ours. The only way to accept a 100MB file is for the file not
 * to touch us.
 *
 * What we give up: we no longer see the bytes, so the extension allowlist is
 * applied to the *declared* name and the size limit is checked against a size
 * the client reports rather than by reading the buffer. The signature is what keeps
 * this from being an open upload endpoint — it is minted only for a signed-in
 * user, it commits the folder and public_id, and Cloudinary rejects anything
 * whose parameters do not match what was signed.
 */
export async function createDesignUploadTicket(
  fileName: string,
  fileSize: number
): Promise<{ ticket?: UploadTicket; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "غير مصرح" };

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return { error: "ملف غير صالح" };
  }
  // Cloudinary has no per-upload size parameter that can be signed, so the
  // ceiling is enforced here and again in the browser before the upload starts.
  // Both read a size the client reports, so this bounds honest mistakes — a
  // wrong file picked by accident — not a determined signed-in user. The real
  // backstop for that is the Cloudinary account's own limits.
  if (fileSize > DESIGN_MAX_BYTES) {
    return { error: "حجم الملف يتجاوز الحد الأقصى المسموح (100 ميجابايت)" };
  }

  const original = fileName || "file";
  const dot = original.lastIndexOf(".");
  const ext = dot !== -1 ? original.slice(dot + 1).toLowerCase() : "";
  const stem = dot !== -1 ? original.slice(0, dot) : original;

  if (!ext || !ALLOWED.has(ext)) {
    return { error: "نوع الملف غير مدعوم" };
  }

  const isMedia = MEDIA.has(ext);
  const resourceType: "auto" | "raw" = isMedia ? "auto" : "raw";

  // Raw files need the extension baked into the public_id or Cloudinary serves
  // them with the wrong content type — same rule as /api/upload.
  const publicId =
    stem.replace(/[^a-zA-Z0-9_-]/g, "_") + "_" + Date.now() + (ext && !isMedia ? `.${ext}` : "");

  const folder = "zad_design_requests";
  const timestamp = Math.round(Date.now() / 1000);

  // Every parameter the browser will send, except the file itself and the ones
  // Cloudinary excludes by rule (api_key, resource_type, cloud_name). If the
  // browser alters any of these, the signature stops matching and the upload is
  // refused — that is what stops a leaked ticket becoming a free file host.
  //
  // Only add real Cloudinary upload parameters here. An unknown one — max_bytes
  // was tried — is dropped by api_sign_request when building the string to
  // sign, while the browser still sends it, so every upload fails with
  // "Invalid Signature" and the cause is nowhere in the message.
  const paramsToSign: Record<string, string | number> = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET as string
  );

  await logAudit({
    actorType: session.userType === "CHARITY_USER" ? "CHARITY_USER" : "EMPLOYEE",
    actorId: session.id,
    actorName: session.name,
    action: "FILE_UPLOAD",
    metadata: { fileName: original, size: fileSize, folder, direct: true },
  });

  return {
    ticket: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
      apiKey: process.env.CLOUDINARY_API_KEY as string,
      timestamp,
      signature,
      folder,
      publicId,
      resourceType,
    },
  };
}
