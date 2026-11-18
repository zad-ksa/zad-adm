import { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import CharityLayoutClient from "./CharityLayoutClient";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import SetEmailBanner from "@/components/SetEmailBanner";
import PortalPopupHost from "./PortalPopupHost";
import { effectiveCharityPermissions } from "@/lib/charityPermissions";
import { listCharityNotices } from "@/app/actions/charityNotifications";
import { isMediaPlanEnabled } from "@/lib/mediaPlanToggle";
import { fundraisingOpenFor } from "@/lib/portalFundraising";

export default async function CharityLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const session = await getSession();
  if (!session) redirect("/");

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
    select: { id: true, name: true, logoUrl: true },
  });
  if (!charity) notFound();

  // Access gate: restricted to CHARITY_USER ONLY
  if (session.userType !== "CHARITY_USER") {
    redirect("/main");
  }

  // Fetch charities for this user to pass to sidebar for quick switching
  const user = await prisma.charityUser.findUnique({
    where: { id: session.id },
    include: {
      // Deactivated memberships are excluded here rather than filtered in the
      // UI, so a deactivated employee neither sees the charity in the switcher
      // nor passes the ownership gate below.
      // وتفويضُ الخدمات معها: منه تُشتقّ تبويباتُ البوابة، فبلا قراءته
      // يُحسب الشريطُ من المصفوفة المخزّنة وحدَها فيُخفي ما يُسمح به.
      charities: {
        where: { isActive: true },
        include: { charity: true, services: { select: { serviceName: true } } },
      },
    },
  });

  const availableCharities = user?.charities.map(c => ({
    id: c.charityId,
    name: c.charity.name
  })) || [];

  // Ownership gate: the check above only proves the visitor is *a* charity
  // account, not that this charity is theirs — without this, any logged-in
  // charity account could read another charity's portal by typing its name in
  // the URL.
  //
  // Membership is tested against the full linked-charities list rather than
  // session.charityId, because an account may be linked to several charities
  // and switch between them (selectCharitySession); comparing the single
  // session.charityId would lock those users out of their own other charities.
  const isMember = availableCharities.some((c) => c.id === charity.id);
  if (!isMember) {
    notFound();
  }

  // Permissions for THIS charity, not session.permissions — the session carries
  // only the currently-selected charity's set, which is the wrong answer while
  // the user is browsing a different one of their charities.
  const membership = user?.charities.find((c) => c.charityId === charity.id);

  // **الشريطُ يُعرض من الصلاحيات الفعليّة لا المخزّنة** — والقاعدةُ في
  // `effectiveCharityPermissions` وحدَها: حسابُ الجمعية يُوسَّع إلى كلِّ
  // الصلاحيات، وصلاحيّةُ خدمةٍ تخمد ما لم تكن الخدمةُ مفوَّضة. وكانت تُحسب هنا
  // وتُحسب في الشريط بقاعدةٍ أخرى، فافترق المعروضُ عن المسموح في الاتّجاهين.
  const isOfficial = membership?.isAdmin ?? false;
  const effectivePermissions = effectiveCharityPermissions(
    (membership?.permissions as string[] | undefined) ?? [],
    membership?.services.map((s) => s.serviceName) ?? [],
    isOfficial
  );

  // Same reminder as the Zad dashboard, pointing at the portal's own screen.
  const needsEmail = !user?.email;

  // عدّاد البريد لجمعية هذه الصفحة وحدها: عضوٌ في جمعيتين لا يُنقل إليه عدّاد
  // الأخرى، ولا يفتح بريداً ليس في نطاق ما يتصفّح.
  const unreadMail = await prisma.mailRecipient.count({
    where: {
      charityUserId: session.id,
      charityId: charity.id,
      isRead: false,
      isDeleted: false,
    },
  });

  // عدّادُ الخطّة الإعلاميّة: ما ينتظر اعتمادَ الجمعية — وهو «التنبيهُ على
  // التبويب». ولمن يعتمد وحدَه: التقويمُ يراه كلُّ عضوٍ اطّلاعاً، فعدٌّ على
  // تبويبٍ لا يستطيع صاحبُه فعلَ شيءٍ به تنبيهٌ بلا فعل.
  //
  // **ومحروسٌ بـtry**: هذا التخطيطُ يحمل كلَّ صفحةٍ في البوّابة، فاستعلامٌ
  // يُخفق — جدولٌ لم يُنشأ بعد — يُسقط البوّابةَ كلَّها على كلِّ جمعية. فالصفرُ
  // أصدقُ من صفحةِ خطأ، ويُكتب الأثرُ في السجلّ.
  let mediaWaiting = 0;
  if (effectivePermissions.includes("edit_media_plan")) {
    try {
      mediaWaiting = await prisma.mediaPost.count({
        where: { charityId: charity.id, status: "PENDING_CHARITY" },
      });
    } catch (error) {
      console.error("portal media badge", error);
    }
  }

  // وتبويبُ الخطّة الإعلاميّة: مفتاحُه بيد زاد، ويُقرأ في موضعٍ واحدٍ
  // (`isMediaPlanEnabled`) فيقرؤه الشريطُ والصفحةُ والأفعال.
  const mediaPlanEnabled = await isMediaPlanEnabled(charity.id);

  // وتنميةُ الموارد: خدمةُ الجمعية ثمّ العلَم — تُحسب هنا مرّةً ويقرؤها
  // الشريطُ، وتُفحص في الصفحة والأفعال من نفس الدالّة.
  const fundraisingEnabled = await fundraisingOpenFor(charity);

  // وإشعاراتُ الحساب — آمنةٌ في نفسها (انظر `listCharityNotices`).
  const notices = await listCharityNotices();

  return (
    <CharityLayoutClient
      charityName={decodedName}
      logoUrl={charity.logoUrl || null}
      userType={session.userType}
      availableCharities={availableCharities}
      isDeveloper={session.isDeveloper}
      currentEmployeeId={session.originalId ? session.id : undefined}
      permissions={effectivePermissions}
      title={session.title}
      accountName={session.name}
      isOfficial={isOfficial}
      unreadMail={unreadMail}
      mediaWaiting={mediaWaiting}
      mediaPlanEnabled={mediaPlanEnabled}
      fundraisingEnabled={fundraisingEnabled}
      notices={notices}
    >
      {needsEmail && (
        <div className="mb-4">
          <SetEmailBanner href={`/portal/${encodeURIComponent(decodedName)}/profile`} />
        </div>
      )}
      {/* الإشعارُ الانبثاقيُّ: يسأل الخادمَ بمسار الصفحة المفتوحة. */}
      <PortalPopupHost />
      {children}
    </CharityLayoutClient>
  );
}
