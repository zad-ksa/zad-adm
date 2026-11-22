import type { ReactNode } from "react";
import { requireFundraisingPortal } from "@/lib/portalFundraising";

/**
 * غلافُ قسم تنمية الموارد: حارسُه وتنقّلُه.
 *
 * **والحارسُ هنا كما في كلِّ صفحة**: عضويّةٌ وصلاحيّةٌ وفتحُ القسم لهذه
 * الجمعية. ولم يُحذف من الصفحات: غلافٌ يحرس وصفحةٌ تُستدعى من غيره يومَ
 * تُنقل — والحراسةُ تُكرَّر ولا تُفترض.
 *
 * **والتبويبُ ليس هنا**: الغلافُ يسبق العنوانَ والمسار، فكان التبويبُ فوقهما
 * وترتيبُه مقلوب. فصار كلُّ قائمةٍ تستدعيه تحت عنوانها (`FundraisingTabs`)،
 * وملفُّ الجهة لا يستدعيه — مسارُه يُعيد.
 */
export default async function FundraisingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  await requireFundraisingPortal(name);

  return <div className="space-y-4">{children}</div>;
}
