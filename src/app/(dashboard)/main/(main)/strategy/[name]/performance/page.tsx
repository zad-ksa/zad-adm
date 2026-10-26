import { permanentRedirect } from "next/navigation";

/**
 * مقياس الأداء هو «متابعة الأداء»، وانتقل تحت «دليل الأهداف والمؤشرات».
 *
 * والمسار القديم يبقى موجوداً يُعيد التوجيه: روابط محفوظةٌ وإشاراتٌ مرجعية
 * تشير إليه، وسقوطها على ٤٠٤ خسارةٌ بلا مقابل.
 */
export default async function MovedPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  permanentRedirect(`/main/strategy/${name}/objectives/tracking`);
}
