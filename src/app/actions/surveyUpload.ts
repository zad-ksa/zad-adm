"use server";

import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  ALLOWED_EXTENSIONS,
  MEDIA_EXTENSIONS,
  MB,
  type UploadTicket,
} from "@/lib/uploadPurposes";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED = new Set<string>(ALLOWED_EXTENSIONS);
const MEDIA = new Set<string>(MEDIA_EXTENSIONS);

/**
 * Survey attachments are capped well below everything else.
 *
 * This is the only upload in the app an anonymous stranger can reach, so the
 * ceiling is set by what a survey answer plausibly needs — a photo, a scanned
 * page — not by what the platform could carry.
 */
const SURVEY_MAX_BYTES = 10 * MB;
const SURVEY_FOLDER = "zad_survey_uploads";

/** Per survey, per window. Generous for a respondent, useless as a pipe. */
const SURVEY_UPLOAD_LIMIT = { count: 30, windowMs: 10 * 60 * 1000 };

/**
 * Issues a Cloudinary upload ticket for someone answering a public survey.
 *
 * Custom surveys are answered by people with no account — that is the whole
 * point of them — but every upload path in the app requires a session. So
 * attaching a file to a survey answered "غير مصرح" and, worse, the failure was
 * swallowed: respondents submitted believing the file went with it.
 *
 * The authorisation here is not a session but the survey itself: a ticket is
 * minted only for a survey that exists and is currently active. That is the same
 * bar as answering the survey at all — anyone holding the link can already
 * submit answers — so it grants nothing new. What keeps it from being an open
 * file host is everything around it: a small size cap, the shared extension
 * allowlist, a fixed folder, and a rate limit keyed to the survey.
 */
export async function createSurveyUploadTicket(
  surveyId: string,
  fileName: string,
  fileSize: number
): Promise<{ ticket?: UploadTicket; error?: string }> {
  try {
    if (!surveyId) return { error: "استبيان غير معروف" };

    const survey = await prisma.customSurvey.findFirst({
      where: { OR: [{ id: surveyId }, { slug: surveyId }] },
      select: { id: true, isActive: true },
    });
    if (!survey) return { error: "الاستبيان غير موجود" };
    // A closed survey stops accepting files at the same moment it stops
    // accepting answers.
    if (!survey.isActive) return { error: "الاستبيان مغلق" };

    const rl = checkRateLimit(
      `survey-upload:${survey.id}`,
      SURVEY_UPLOAD_LIMIT.count,
      SURVEY_UPLOAD_LIMIT.windowMs
    );
    if (!rl.allowed) {
      return { error: `عدد محاولات كبير، يرجى المحاولة بعد ${Math.ceil(rl.retryAfterSeconds / 60)} دقيقة` };
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) return { error: "ملف غير صالح" };
    if (fileSize > SURVEY_MAX_BYTES) {
      return { error: `حجم الملف يتجاوز ${Math.round(SURVEY_MAX_BYTES / MB)} ميجابايت` };
    }

    const original = fileName || "file";
    const dot = original.lastIndexOf(".");
    const ext = dot !== -1 ? original.slice(dot + 1).toLowerCase() : "";
    const stem = dot !== -1 ? original.slice(0, dot) : original;

    if (!ext || !ALLOWED.has(ext)) return { error: "نوع الملف غير مدعوم" };

    const isMedia = MEDIA.has(ext);
    const resourceType: "auto" | "raw" = isMedia ? "auto" : "raw";

    // Raw files need the extension inside the public_id or Cloudinary serves
    // them with the wrong content type.
    const publicId =
      stem.replace(/[^a-zA-Z0-9_-]/g, "_") + "_" + Date.now() + (ext && !isMedia ? `.${ext}` : "");

    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { folder: SURVEY_FOLDER, public_id: publicId, timestamp },
      process.env.CLOUDINARY_API_SECRET as string
    );

    return {
      ticket: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
        apiKey: process.env.CLOUDINARY_API_KEY as string,
        timestamp,
        signature,
        folder: SURVEY_FOLDER,
        publicId,
        resourceType,
      },
    };
  } catch (error) {
    console.error("Survey upload ticket error:", error);
    return { error: error instanceof Error ? error.message : "تعذّر تجهيز الرفع" };
  }
}
