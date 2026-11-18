"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/auditLog";
import {
  isPopupLive,
  isPopupPage,
  popupMatchesPath,
  popupRepeatOf,
  popupTargetsCharity,
} from "@/lib/portalPopups";

/**
 * الإشعاراتُ الانبثاقيّةُ لبوّابات الجمعيات: كتابتُها عند زاد، وعرضُها هناك.
 *
 * **وطرفان لا طرف**: ما يكتبه موظّفُ زادٍ خلف `manage_charities` — هي
 * صلاحيّةُ من يُخاطب الجمعيات أصلاً — وما تقرؤه البوّابةُ خلف عضويّةِ
 * الجمعية، ولا يُعطي أحدُهما شيئاً من سلطة الآخر.
 *
 * **ولا يُعرض إلا ما يَعني هذا القارئ**: الموضعُ يُطابق مسارَه، والجمعيةُ
 * مستهدفةٌ (أو الاستهدافُ عامّ)، والوقتُ في فترته، ولم يُغلقه من قبل إن كان
 * «مرّةً واحدة». وهذه أربعةُ شروطٍ تُفحص في الخادم: المتصفّحُ لا يُسأل أيَّ
 * إشعارٍ يستحقّ أن يراه.
 */
type Result = { ok: true } | { ok: false; error: string };

const MAX_TITLE = 120;
const MAX_BODY = 2000;

async function requireSender() {
  const session = await getSession();
  if (!session?.id || session.userType === "CHARITY_USER") return null;
  if (!hasPermission(session.role, session.permissions || [], "manage_charities")) return null;
  return session;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type PopupInput = {
  title: string;
  body: string;
  pageKey: string;
  charityIds: string[];
  repeatMode: string;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

function clean(input: PopupInput) {
  const title = input.title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE);
  const body = input.body.trim().slice(0, MAX_BODY);
  return {
    title,
    body,
    pageKey: isPopupPage(input.pageKey) ? input.pageKey : "ANY",
    charityIds: [...new Set(input.charityIds.filter((id) => id.trim() !== ""))],
    repeatMode: popupRepeatOf(input.repeatMode),
    isActive: input.isActive,
    startsAt: parseDate(input.startsAt),
    endsAt: parseDate(input.endsAt),
  };
}

function popupError(error: unknown, fallback: string): Result {
  console.error("portalPopup", error);
  return {
    ok: false,
    error: fallback + " — وان لم يطبق بعد prisma/sql/portal-popups.sql فهذا سببه",
  };
}

export async function savePortalPopup(id: string | null, input: PopupInput): Promise<Result> {
  const session = await requireSender();
  if (!session) return { ok: false, error: "غير مصرح" };

  const data = clean(input);
  if (!data.title) return { ok: false, error: "عنوان الإشعار مطلوب" };
  if (!data.body) return { ok: false, error: "نص الإشعار مطلوب" };
  if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) {
    return { ok: false, error: "تاريخ النهاية قبل البداية" };
  }

  try {
    if (id) {
      await prisma.portalPopup.update({ where: { id }, data });
    } else {
      await prisma.portalPopup.create({ data: { ...data, createdById: session.id } });
    }

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: id ? "UPDATE" : "CREATE",
      targetType: "PortalPopup",
      targetId: id ?? data.title,
      metadata: { pageKey: data.pageKey, charities: data.charityIds.length, repeat: data.repeatMode },
    });

    revalidatePath("/main/admin/popups");
    return { ok: true };
  } catch (error) {
    return popupError(error, "تعذر حفظ الإشعار");
  }
}

export async function togglePortalPopup(id: string, isActive: boolean): Promise<Result> {
  const session = await requireSender();
  if (!session) return { ok: false, error: "غير مصرح" };
  try {
    await prisma.portalPopup.update({ where: { id }, data: { isActive } });
    revalidatePath("/main/admin/popups");
    return { ok: true };
  } catch (error) {
    return popupError(error, "تعذر تغيير حالة الإشعار");
  }
}

export async function deletePortalPopup(id: string): Promise<Result> {
  const session = await requireSender();
  if (!session) return { ok: false, error: "غير مصرح" };
  try {
    await prisma.portalPopup.delete({ where: { id } });
    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "DELETE",
      targetType: "PortalPopup",
      targetId: id,
      metadata: {},
    });
    revalidatePath("/main/admin/popups");
    return { ok: true };
  } catch (error) {
    return popupError(error, "تعذر حذف الإشعار");
  }
}

/** ما يُعرض في البوّابة — أقلُّ ما يُحتاج لرسمه. */
export type LivePopup = { id: string; title: string; body: string; repeatMode: string };

/**
 * أوّلُ إشعارٍ يستحقّ أن يراه هذا العضوُ في هذا المسار — أو لا شيء.
 *
 * **وواحدٌ لا قائمة**: نافذتان تفتحان معاً تُغلقان بلا قراءة. والأقدمُ أوّلاً
 * فهو الذي انتظر.
 */
export async function fetchPortalPopup(pathname: string): Promise<LivePopup | null> {
  const session = await getSession();
  if (!session?.id || session.userType !== "CHARITY_USER" || !session.charityId) return null;

  try {
    const rows = await prisma.portalPopup.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        body: true,
        pageKey: true,
        charityIds: true,
        repeatMode: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
        seen: { where: { charityUserId: session.id }, select: { id: true }, take: 1 },
      },
    });

    const now = new Date();
    const match = rows.find(
      (p) =>
        isPopupLive(p, now) &&
        popupTargetsCharity(p.charityIds, session.charityId as string) &&
        popupMatchesPath(p.pageKey, pathname) &&
        (popupRepeatOf(p.repeatMode) === "EVERY" || p.seen.length === 0)
    );
    if (!match) return null;

    return { id: match.id, title: match.title, body: match.body, repeatMode: match.repeatMode };
  } catch (error) {
    // الجدولُ قد لا يكون أُنشئ بعد — ولا تُسقط البوّابةُ لأجل إشعار.
    console.error("fetchPortalPopup", error);
    return null;
  }
}

/** إغلاقُ الإشعار: يُسجَّل لمن أغلقه فلا يُعاد عرضُه عليه. */
export async function dismissPortalPopup(popupId: string): Promise<void> {
  const session = await getSession();
  if (!session?.id || session.userType !== "CHARITY_USER") return;

  try {
    await prisma.portalPopupSeen.upsert({
      where: { popupId_charityUserId: { popupId, charityUserId: session.id } },
      create: { popupId, charityUserId: session.id },
      update: { seenAt: new Date() },
    });
  } catch (error) {
    console.error("dismissPortalPopup", error);
  }
}
