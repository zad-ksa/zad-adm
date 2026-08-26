/**
 * Upload limits shared between the browser and the server.
 *
 * Kept in a plain module rather than beside the server action that uses them,
 * because a "use server" file may only export async functions — a constant
 * exported from one fails the build.
 */

/**
 * Ceiling for design-request attachments.
 *
 * This is enforceable only because those files go straight from the browser to
 * Cloudinary. Anything routed through /api/upload is capped far lower by the
 * serverless platform's request body limit, whatever number that route claims.
 */
export const DESIGN_MAX_BYTES = 100 * 1024 * 1024;

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

/** Ready for an <input type="file" accept="..."> attribute. */
export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} كB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} مB`;
}
