import type { DesignRequestAttachmentInput } from "@/app/actions/designRequests";
import { createDesignUploadTicket } from "@/app/actions/uploadSignature";
import { DESIGN_MAX_BYTES } from "@/lib/uploadLimits";

/**
 * Uploads design-request attachments straight from the browser to Cloudinary.
 *
 * These used to POST to /api/upload, which meant the bytes travelled through a
 * serverless function. That function's request body is capped by the platform
 * well below the 25MB the route advertised: a 6MB file was rejected before the
 * handler ever ran, so the route's own size check — and its Arabic error
 * message — never fired, and the user saw a bare "failed to upload".
 *
 * Going direct removes our server from the file path entirely, which is the
 * only way a 100MB attachment can work. The server still authorises every
 * upload: it mints a signature (see createDesignUploadTicket) that commits the
 * folder and the public_id, and Cloudinary refuses anything that does not match
 * what was signed. The size ceiling is checked before the ticket is issued —
 * Cloudinary has no signable per-upload size parameter.
 *
 * Note for whoever touches the CSP: this talks to api.cloudinary.com, which is
 * a different host from the res.cloudinary.com that serves the files back.
 * Both need to be in connect-src or uploads fail silently at the browser.
 */

export type UploadProgress = {
  fileName: string;
  /** 0–100, or null while the browser has not reported anything yet. */
  percent: number | null;
};

function uploadToCloudinary(
  file: File,
  ticket: NonNullable<Awaited<ReturnType<typeof createDesignUploadTicket>>["ticket"]>,
  onProgress?: (percent: number) => void
): Promise<{ secure_url: string; public_id: string; resource_type: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    // Order does not matter to Cloudinary, but every signed parameter must be
    // present and identical to what was signed, or it returns 401.
    form.append("file", file);
    form.append("api_key", ticket.apiKey);
    form.append("timestamp", String(ticket.timestamp));
    form.append("signature", ticket.signature);
    form.append("folder", ticket.folder);
    form.append("public_id", ticket.publicId);

    const xhr = new XMLHttpRequest();
    // XHR rather than fetch purely for upload progress — fetch cannot report it,
    // and a 100MB file with no feedback looks like a hung page.
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${ticket.cloudName}/${ticket.resourceType}/upload`
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
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

      // Cloudinary puts the reason in { error: { message } } — surfaced rather
      // than swallowed, because "file too large" and "invalid signature" need
      // very different responses from whoever hits them.
      const message =
        (body?.error as { message?: string } | undefined)?.message || `فشل الرفع (${xhr.status})`;
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("تعذّر الاتصال بخدمة الملفات"));
    xhr.onabort = () => reject(new Error("أُلغي الرفع"));

    xhr.send(form);
  });
}

export async function uploadDesignRequestFiles(
  files: File[],
  onProgress?: (progress: UploadProgress) => void
): Promise<DesignRequestAttachmentInput[]> {
  const uploaded: DesignRequestAttachmentInput[] = [];

  for (const file of files) {
    // Checked here as well as on the server so an oversized file fails at once
    // instead of after a long doomed upload.
    if (file.size > DESIGN_MAX_BYTES) {
      throw new Error(`${file.name}: حجم الملف يتجاوز 100 ميجابايت`);
    }

    onProgress?.({ fileName: file.name, percent: null });

    const { ticket, error } = await createDesignUploadTicket(file.name, file.size);
    if (error || !ticket) {
      throw new Error(`${file.name}: ${error || "تعذّر تجهيز الرفع"}`);
    }

    const result = await uploadToCloudinary(file, ticket, (percent) =>
      onProgress?.({ fileName: file.name, percent })
    );

    uploaded.push({
      fileUrl: result.secure_url,
      publicId: result.public_id,
      // Cloudinary needs the same resource_type back when deleting the asset,
      // otherwise destroy() defaults to "image" and silently no-ops on raw files.
      resourceType: result.resource_type || ticket.resourceType,
      fileName: file.name,
      fileSize: file.size,
    });
  }

  return uploaded;
}
