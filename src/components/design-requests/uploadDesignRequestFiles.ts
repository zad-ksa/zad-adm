import type { DesignRequestAttachmentInput } from "@/app/actions/designRequests";
import { uploadFiles, type UploadProgress } from "@/lib/clientUpload";
import type { UploadPurpose } from "@/lib/uploadPurposes";

export type { UploadProgress };

/**
 * Thin adapter over the shared uploader.
 *
 * This file used to carry its own copy of the signed-upload machinery. That now
 * lives in lib/clientUpload and serves every upload in the app, so all this does
 * is rename the result fields into the shape design-request attachments are
 * stored in.
 */
export async function uploadDesignRequestFiles(
  files: File[],
  onProgress?: (progress: UploadProgress) => void,
  purpose: UploadPurpose = "design_request"
): Promise<DesignRequestAttachmentInput[]> {
  const uploaded = await uploadFiles(files, purpose, onProgress);

  return uploaded.map((u) => ({
    fileUrl: u.url,
    publicId: u.publicId,
    // Cloudinary needs the same resource_type back when deleting the asset,
    // otherwise destroy() defaults to "image" and silently no-ops on raw files.
    resourceType: u.resourceType,
    fileName: u.name,
    fileSize: u.size,
  }));
}
