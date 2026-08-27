import { createUploadTicket, type UploadTicket } from "@/app/actions/uploadTicket";
import { maxBytesFor, maxLabelFor, type UploadPurpose } from "@/lib/uploadPurposes";

/**
 * Uploads files straight from the browser to Cloudinary.
 *
 * Replaces POSTing to /api/upload, which routed the bytes through a serverless
 * function whose request body the platform caps at a few megabytes — see
 * createUploadTicket for why raising the advertised limits could never work.
 *
 * The result deliberately uses the same field names /api/upload returned
 * (url, publicId, resourceType, name, size) so callers migrate by swapping the
 * fetch for this call, without rewriting how they read the response.
 *
 * Note for whoever edits the CSP: this talks to api.cloudinary.com, a different
 * origin from the res.cloudinary.com that serves files back. Both must be in
 * connect-src or uploads fail at the browser with nothing in the network log
 * but a blocked request.
 */

export type UploadedFile = {
  url: string;
  publicId: string;
  resourceType: string;
  name: string;
  size: number;
};

export type UploadProgress = {
  fileName: string;
  /** 0–100, or null before the browser reports anything. */
  percent: number | null;
  /** 1-based position within this batch. */
  index: number;
  total: number;
};

function putToCloudinary(
  file: File,
  ticket: UploadTicket,
  onPercent?: (percent: number) => void
): Promise<{ secure_url: string; public_id: string; resource_type: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    // Every signed parameter must be present and identical to what was signed,
    // or Cloudinary answers 401.
    form.append("file", file);
    form.append("api_key", ticket.apiKey);
    form.append("timestamp", String(ticket.timestamp));
    form.append("signature", ticket.signature);
    form.append("folder", ticket.folder);
    form.append("public_id", ticket.publicId);

    // XHR rather than fetch purely for upload progress — fetch cannot report
    // it, and a large file with no feedback looks like a hung page.
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${ticket.cloudName}/${ticket.resourceType}/upload`
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onPercent) onPercent(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let body: Record<string, unknown> | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(body as never);
        return;
      }
      // Cloudinary puts the reason in { error: { message } }. Surfaced rather
      // than swallowed: "file too large" and "invalid signature" call for very
      // different responses from whoever hits them.
      const message =
        (body?.error as { message?: string } | undefined)?.message || `فشل الرفع (${xhr.status})`;
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("تعذّر الاتصال بخدمة الملفات"));
    xhr.onabort = () => reject(new Error("أُلغي الرفع"));

    xhr.send(form);
  });
}

/**
 * Uploads one file. Throws with a message worth showing the user.
 */
export async function uploadFile(
  file: File,
  purpose: UploadPurpose,
  onPercent?: (percent: number) => void
): Promise<UploadedFile> {
  // Checked here as well as on the server so an oversized file fails at once
  // instead of after a long doomed upload.
  if (file.size > maxBytesFor(purpose)) {
    throw new Error(`${file.name}: حجم الملف يتجاوز ${maxLabelFor(purpose)}`);
  }

  const { ticket, error } = await createUploadTicket(purpose, file.name, file.size);
  if (error || !ticket) throw new Error(`${file.name}: ${error || "تعذّر تجهيز الرفع"}`);

  const result = await putToCloudinary(file, ticket, onPercent);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    // Cloudinary needs the same resource_type back when deleting the asset,
    // otherwise destroy() defaults to "image" and silently no-ops on raw files.
    resourceType: result.resource_type || ticket.resourceType,
    name: file.name,
    size: file.size,
  };
}

/**
 * Uploads a batch, one at a time. Sequential on purpose: these are large files
 * on connections that are often not, and saturating the uplink makes every one
 * of them slower and the progress meaningless.
 *
 * Throws on the first failure rather than returning partial results — a caller
 * that silently kept the successful subset is exactly how attachments went
 * missing before.
 */
export async function uploadFiles(
  files: File[],
  purpose: UploadPurpose,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedFile[]> {
  const out: UploadedFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.({ fileName: file.name, percent: null, index: i + 1, total: files.length });
    out.push(
      await uploadFile(file, purpose, (percent) =>
        onProgress?.({ fileName: file.name, percent, index: i + 1, total: files.length })
      )
    );
  }
  return out;
}
