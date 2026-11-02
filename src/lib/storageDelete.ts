/**
 * حذفُ ملفٍّ من حيث يسكن — المزوّدان متعايشان، فلا حذفَ بلا سؤال.
 *
 * وبأفضل جهدٍ دائماً ولا يرفع استثناء: الموقعُ كلُّه يحذف الملفَّ قبل صفِّه،
 * وفشلٌ يُسقط العمليّةَ يترك الصفَّ قائماً وملفَّه محذوفاً — وهو أسوأُ من
 * ملفٍّ يتيم. فالفشلُ يُسجَّل بالمُعرِّف ويُمضى.
 */

import { deleteFromB2 } from "./b2.ts";
import { storagePublicBase } from "./b2.ts";
import { deletePlanFor, type StoredFileRef } from "./storage.ts";

/**
 * يحذف ملفّاً واحداً. و`label` يُكتب في السجلّ ليُعرف الموضعُ الذي نادى.
 *
 * ويُردّ ما حدث لا `void`: السكربتاتُ تُحصي، والمواضعُ تتجاهل.
 */
export async function deleteStoredFile(
  ref: StoredFileRef,
  label = "ملف"
): Promise<{ deleted: boolean; provider: "b2" | "cloudinary" | null; reason?: string }> {
  const plan = deletePlanFor(ref, storagePublicBase());

  if (plan.provider === null) {
    // لا يُسجَّل «لا رابطَ ولا مُعرِّف» ضجيجاً: صفٌّ بلا ملفٍّ حالةٌ عاديّة.
    if (plan.reason !== "لا رابطَ ولا مُعرِّف") {
      console.warn(`تخطّي حذف ${label}: ${plan.reason}`, ref.url ?? "");
    }
    return { deleted: false, provider: null, reason: plan.reason };
  }

  try {
    if (plan.provider === "b2") {
      const ok = await deleteFromB2(plan.key);
      if (!ok) console.error(`تعذّر حذف ${label} من باك بليز`, plan.key);
      return { deleted: ok, provider: "b2" };
    }

    // استيرادٌ متأخّرٌ عن قصد: حزمةُ Cloudinary لا تدخل حِزمةَ دالّةٍ لا تحذف
    // منها، وتزول من المشروع كلِّه بحذف هذا الفرع حين يُفرغ الحساب.
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    await cloudinary.uploader.destroy(plan.publicId, { resource_type: plan.resourceType });
    return { deleted: true, provider: "cloudinary" };
  } catch (error) {
    console.error(`تعذّر حذف ${label}`, plan.provider === "b2" ? plan.key : plan.publicId, error);
    return { deleted: false, provider: plan.provider, reason: String(error) };
  }
}

/** حذفُ جملةٍ من الملفّات، كلُّ واحدٍ بأفضل جهدٍ مستقلّ. */
export async function deleteStoredFiles(refs: StoredFileRef[], label = "ملف"): Promise<number> {
  let deleted = 0;
  for (const ref of refs) {
    const result = await deleteStoredFile(ref, label);
    if (result.deleted) deleted++;
  }
  return deleted;
}
