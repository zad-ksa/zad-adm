"use client";

import { confirmAction } from "@/components/console/confirmBus";
import { notify } from "@/components/console/toastBus";
import { deleteGrantApplication } from "@/app/actions/charity";

/**
 * حذفُ منحةٍ — سؤالاً وفعلاً ورسالةً، في موضعٍ واحد.
 *
 * والمنحةُ تظهر في أربع شاشات: جدولُ المنح الجامع، وصفحةُ الجهة المانحة،
 * وصفحةُ منح الجمعية، ولوحةُ تعديل المنحة. فلو كُتب الحذفُ في كلٍّ منها لكان
 * أربعةَ سلوكيّاتٍ باسمٍ واحد — وهذا ما كان: صفحةُ منح الجمعية تسأل «حذف هذه
 * المنحة؟» بلا ذكرٍ لما يبقى، **ولا تنتظر جوابَ الخادم**: تُزيل البطاقةَ من
 * الشاشة وتمضي، فمنحةٌ رفض الخادمُ حذفَها تختفي من أمام صاحبها حتى يُحدِّث
 * الصفحة.
 *
 * **والمعتمَدةُ يُقال عنها ما لا يُحذف معها**: اعتمادُ المنحة كتب `FinancialLog`
 * في ماليّة الجمعية، وربّما جَدول أقساطَ عقدٍ «مرتبطةً بأوّل منحة» — وحذفُ صفِّ
 * المنحة لا يمسّ ذلك. فحذفٌ يُظنّ أنّه يُرجع كلَّ شيءٍ أسوأُ من حذفٍ يقول ما
 * يُبقيه.
 *
 * ويُرجع `true` إن حُذفت: المنادي يُنعش صفحتَه أو يُغلق لوحَه، ولا يُزيل صفّاً
 * قبل أن يُجيب الخادم.
 */
export type DeletableGrant = {
  id: string;
  /** جمعيةُ المنحة إن عرفتها الشاشة — والخادمُ يقرؤها من الصفّ ويُطابق. */
  charityId?: string;
  initiativeName: string;
  status?: string;
};

export async function confirmAndDeleteGrant(grant: DeletableGrant): Promise<boolean> {
  const approved = grant.status === "APPROVED";
  const ok = await confirmAction({
    title: `حذف منحة «${grant.initiativeName}»؟`,
    message: approved
      ? "منحةٌ معتمَدة: حذفُها لا يحذف سجلَّها الماليَّ في الجمعية ولا يُلغي أقساطاً جُدولت به — يُصحَّح ذلك من صفحة المالية."
      : "لا تُسترجع بعد الحذف.",
    confirmLabel: "حذف",
    tone: "danger",
  });
  if (!ok) return false;

  const result = await deleteGrantApplication(grant.id, grant.charityId);
  if (!result.success) {
    notify("error", result.message || "تعذّر حذف المنحة");
    return false;
  }
  notify("ok", "حُذفت المنحة.");
  return true;
}
