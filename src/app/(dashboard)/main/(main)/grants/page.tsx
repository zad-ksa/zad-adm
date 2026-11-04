import type { Metadata } from "next";
import { requireDonorViewer } from "@/lib/donorScope";
import { loadGrantsOverview } from "../donors/donorData";
import GrantsOverviewClient from "./GrantsOverviewClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "المنح | تنمية الموارد المالية" };

/**
 * جدولُ المنح الجامع — كلُّ ما رُفع إلى كلِّ الجهات في صفحةٍ واحدة.
 *
 * وكانت المنحُ لا تُرى إلّا مُقطَّعةً: منحُ جمعيةٍ واحدةٍ في صفحة منحها، ومنحُ
 * جهةٍ واحدةٍ في صفحتها. فسؤالٌ كـ«ما المنحُ المعلَّقةُ عندنا كلِّها» أو «كم
 * رُفع هذا الشهر» لم يكن له موضعٌ يُسأل فيه، وإنّما يُجمع بزيارةِ خمسةٍ
 * وستّين صفحةَ جهة.
 *
 * والنطاقُ نطاقُ `requireDonorViewer` نفسُه: صلاحيةُ القسم، والجمعياتُ
 * المسنَدة، وشمولُها بخدمة تنمية الموارد — فالجدولُ لا يُظهر منحةً لا تُظهرها
 * صفحةُ الجهة لهذا الرائي.
 */
export default async function GrantsOverviewPage() {
  const viewer = await requireDonorViewer();
  const { grants, donors } = await loadGrantsOverview(viewer);

  return (
    <GrantsOverviewClient
      grants={grants}
      donors={donors}
      charities={viewer.charities}
      unrestricted={viewer.unrestricted}
    />
  );
}
