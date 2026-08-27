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
 * The 10MB ceiling is not ours to choose: it is the per-file maximum on the
 * Cloudinary account, measured directly against it — 9.5MB uploads, 10.5MB
 * comes back "File size too large. Maximum is 10485760". The plan is Free.
 *
 * So no number written here can raise it. Setting these to 100MB, as they were
 * at first, would have recreated exactly the bug this whole change was meant to
 * remove: a limit the interface promises and the infrastructure refuses. Going
 * higher needs a paid Cloudinary plan, and then these numbers can follow.
 *
 * Avatars and logos stay well under it deliberately — a 10MB profile picture is
 * a mistake worth catching early, not a requirement worth supporting.
 */
const CLOUDINARY_MAX_BYTES = 10 * MB;

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

/** For messages: "10 ميجابايت". */
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
