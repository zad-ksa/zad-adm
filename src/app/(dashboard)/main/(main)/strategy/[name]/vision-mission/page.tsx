import { permanentRedirect } from "next/navigation";

/**
 * استبيان الرؤية انتقل إلى «بناء التوجه الاستراتيجي».
 *
 * والمسار القديم يبقى موجوداً يُعيد التوجيه: روابط محفوظةٌ وإشاراتٌ مرجعية
 * تشير إليه، وسقوطها على ٤٠٤ خسارةٌ بلا مقابل.
 */
export default async function MovedPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  permanentRedirect(`/main/strategy/${name}/direction/vision-mission`);
}
