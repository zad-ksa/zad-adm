export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveCharityPortal } from "@/lib/portalAccess";
import { CHARITY_MAIL_ENABLED } from "@/lib/featureFlags";
import {
  getPortalInbox,
  getPortalMailOptions,
  getPortalPendingMails,
  getPortalSent,
} from "@/app/actions/charityMail";
import { hasCharityPermission } from "@/lib/charityPermissions";
import PortalMailClient from "./PortalMailClient";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `البريد | ${decodeURIComponent(name)}` };
}

/**
 * بريد البوابة — بلا صلاحية.
 *
 * كل عضوٍ يراسل زملاءه والخدمات المفوَّض بها، كما أن كل موظفٍ في زاد له بريده.
 * وصلاحيةٌ هنا كانت ستُخفي صندوقاً يصله البريد سواء فُتح أو لم يُفتح.
 *
 * والحراسة قائمة على أي حال: resolveCharityPortal يتحقق من العضوية في جمعية
 * الرابط، وكل فعلٍ في actions/charityMail.ts يتحقق منها مرةً أخرى بنفسه.
 */
export default async function PortalMailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  // مُقفَل: التبويب يقول «قريباً»، ومن كتب العنوان يعود من حيث أتى. والحجب
  // هنا لا في الشريط وحده — إخفاء رابطٍ لا يمنع كتابته.
  if (!CHARITY_MAIL_ENABLED) redirect(`/portal/${encodeURIComponent(name)}`);

  const { charity, permissions, isAdmin } = await resolveCharityPortal(name);

  const [inbox, sent, options, pending] = await Promise.all([
    getPortalInbox(name, 1, 20, ""),
    getPortalSent(name, 1, 20, ""),
    getPortalMailOptions(name),
    getPortalPendingMails(name),
  ]);

  return (
    <PortalMailClient
      charityName={charity.name}
      initialInbox={inbox.mails}
      initialSent={sent.mails}
      colleagues={options.colleagues}
      services={options.services}
      // التعميد: المُرسِل يعرف أن رسالته ستقف، والمعمِّد يرى ما ينتظره.
      willAwaitApproval={options.requiresApproval && !options.isApprover}
      showApprovals={pending.isApprover || pending.mine.length > 0}
      pendingCount={pending.toApprove.length}
      canManageMail={hasCharityPermission(isAdmin, permissions, "manage_charity_mail")}
    />
  );
}
