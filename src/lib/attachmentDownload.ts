/**
 * Cloudinary serves an attachment straight from its own delivery URL — and
 * that URL is built from the sanitized, ASCII-only `public_id` minted in
 * uploadTicket.ts (Arabic and other non-ASCII characters in the original
 * filename are stripped out there, leaving mostly a timestamp). Opening or
 * saving that URL as-is makes the browser name the downloaded file after the
 * mangled public_id, silently discarding the real filename — e.g. "الخطة
 * التشغيلية...xlsx" is saved on disk as "2026_1790497368990.xlsx".
 *
 * Cloudinary's `fl_attachment:<name>` delivery flag fixes this at the URL
 * level: it makes Cloudinary answer with a Content-Disposition header
 * carrying whatever name we choose, so "حفظ باسم" / the browser's download
 * uses the original filename regardless of what the public_id looks like.
 */
export function attachmentHref(url: string | null | undefined, fileName?: string | null): string {
  if (!url) return url || "";
  if (!fileName) return url;

  const dot = fileName.lastIndexOf(".");
  const base = (dot > 0 ? fileName.slice(0, dot) : fileName).trim();
  if (!base) return url;

  // `:` and `,` are Cloudinary's own transformation delimiters, and `/` would
  // be read as a path separator — encodeURIComponent escapes all three (and
  // Arabic/Unicode) safely; Cloudinary decodes the flag value back before
  // writing the Content-Disposition header.
  const safeBase = encodeURIComponent(base);
  if (!safeBase) return url;

  return url.replace(/\/upload\//, `/upload/fl_attachment:${safeBase}/`);
}
