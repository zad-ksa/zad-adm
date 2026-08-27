/**
 * Where each kind of upload goes, and how big it may be.
 *
 * The browser sends a purpose key, never a folder or a limit. Both are resolved
 * here, server-side, from a closed set — so a signed upload ticket cannot be
 * aimed at an arbitrary Cloudinary folder or talked into a larger ceiling by
 * whoever is holding it.
 *
 * Limits differ on purpose: an avatar has no business being 10MB, and capping
 * it low turns "user picked the wrong file" into an instant, legible error
 * rather than a long upload followed by a puzzling one.
 */

export const MB = 1024 * 1024;

/**
 * 100MB per file.
 *
 * Cloudinary enforces its own per-file maximum, and it varies by resource type
 * and plan — a raw upload was observed being refused above 10MB with "File size
 * too large. Maximum is 10485760". This number is therefore the ceiling the app
 * applies, not a guarantee Cloudinary will accept everything under it.
 *
 * That is workable because rejections are no longer silent: every upload path
 * now surfaces the message Cloudinary returns, verbatim, next to the file it
 * concerns. A file this app allows but Cloudinary refuses fails loudly and
 * says why, instead of vanishing from the attachment list the way it used to.
 *
 * Avatars and logos stay far below it deliberately — a huge profile picture is
 * a mistake worth catching early, not a requirement worth supporting.
 */
const CLOUDINARY_MAX_BYTES = 100 * MB;

export const UPLOAD_PURPOSES = {
  design_request: { folder: "zad_design_requests", maxBytes: CLOUDINARY_MAX_BYTES },
  design_deliverable: { folder: "zad_design_requests", maxBytes: CLOUDINARY_MAX_BYTES },
  mail_attachment: { folder: "zad_mail_attachments", maxBytes: CLOUDINARY_MAX_BYTES },
  approval_attachment: { folder: "zad_approvals", maxBytes: CLOUDINARY_MAX_BYTES },
  governance_file: { folder: "zad_governance", maxBytes: CLOUDINARY_MAX_BYTES },
  service_file: { folder: "zad_services", maxBytes: CLOUDINARY_MAX_BYTES },
  avatar: { folder: "zad_avatars", maxBytes: 5 * MB },
  charity_logo: { folder: "zad_charity_logos", maxBytes: 5 * MB },
} as const;

export type UploadPurpose = keyof typeof UPLOAD_PURPOSES;

export function maxBytesFor(purpose: UploadPurpose): number {
  return UPLOAD_PURPOSES[purpose].maxBytes;
}

/** For messages: "100 ميجابايت". */
export function maxLabelFor(purpose: UploadPurpose): string {
  return `${Math.round(maxBytesFor(purpose) / MB)} ميجابايت`;
}

/** File types the app accepts anywhere. */
export const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "gif", "webp",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
  "psd", "ai", "eps", "indd",
  "zip", "rar",
  "mp4", "webm", "mp3", "wav",
] as const;

/** Cloudinary treats these as media; everything else is uploaded as "raw". */
export const MEDIA_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "mp4", "webm"] as const;

/** Only images, for avatars and logos. */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"] as const;

/** Purposes that must be an image — enforced when the ticket is minted. */
export const IMAGE_ONLY_PURPOSES: UploadPurpose[] = ["avatar", "charity_logo"];

/** Ready for an <input type="file" accept="..."> attribute. */
export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");
export const ACCEPT_IMAGES = IMAGE_EXTENSIONS.map((e) => `.${e}`).join(",");

export function formatBytes(bytes: number): string {
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} كB`;
  return `${(bytes / MB).toFixed(1)} مB`;
}
