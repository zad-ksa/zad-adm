import type { DesignRequestAttachmentInput } from "@/app/actions/designRequests";

const DESIGN_REQUESTS_FOLDER = "zad_design_requests";

/**
 * Uploads files one-by-one to the shared /api/upload route (same endpoint the
 * mail feature uses), but — unlike ComposeModal — keeps `publicId`/`resourceType`
 * so the attachment can actually be deleted from Cloudinary later.
 */
export async function uploadDesignRequestFiles(files: File[]): Promise<DesignRequestAttachmentInput[]> {
  const uploaded: DesignRequestAttachmentInput[] = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", DESIGN_REQUESTS_FOLDER);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      throw new Error(`فشل رفع الملف: ${file.name}`);
    }
    const data = await res.json();
    uploaded.push({
      fileUrl: data.url,
      publicId: data.publicId,
      resourceType: data.resourceType || "raw",
      fileName: file.name,
      fileSize: file.size,
    });
  }

  return uploaded;
}
