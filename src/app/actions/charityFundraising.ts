"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/encryption";
import { cleanCredential } from "@/lib/donorOrg";
import { effectiveCharityPermissions, hasCharityPermission } from "@/lib/charityPermissions";
import { requireCharityMembership } from "@/lib/guards";
import { logAudit } from "@/lib/auditLog";
import { PORTAL_DONOR_KIND, fundraisingOpenFor } from "@/lib/portalFundraising";

/**
 * أفعالُ تنمية الموارد في بوّابة الجمعية.
 *
 * **والحارسُ ثلاثةٌ كحارس الصفحة**: عضويّةُ الجمعية، وصلاحيّةُ
 * `view_fundraising`، وكونُ القسم مفتوحاً لها. ويُفحص هنا من جديدٍ لا اتكالاً
 * على الصفحة: الفعلُ مدخلٌ HTTP يُنادى بلا شاشة.
 *
 * **والجمعيةُ تُعرف من الصفّ لا من الطلب**: المقترحُ يُحذف بمعرّفه، فتُقرأ
 * جمعيتُه من صفّه ثمّ تُفحص — ولو أُخذت من الطلب لحذف عضوُ جمعيةٍ مقترحَ
 * جمعيةٍ أخرى بتمرير معرّف.
 */
type Result = { ok: true } | { ok: false; error: string };

const MAX_NAME = 200;
const MAX_NOTE = 600;

async function requireFundraiser(charityId: string) {
  const session = await getSession();
  if (!session?.id) return null;

  try {
    const membership = await requireCharityMembership(charityId);
    const effective = effectiveCharityPermissions(
      membership.permissions,
      membership.services,
      membership.isOfficial
    );
    if (!hasCharityPermission(effective, "view_fundraising")) return null;

    const charity = await prisma.charity.findUnique({
      where: { id: charityId },
      select: { id: true, name: true },
    });
    if (!charity || !(await fundraisingOpenFor(charity))) return null;

    return { session, charity };
  } catch {
    return null;
  }
}

function revalidateFundraising(charityName: string) {
  revalidatePath(`/portal/${encodeURIComponent(charityName)}/fundraising`, "layout");
  // وملفُّ الجهة عند زادٍ يقرأ المقترحاتِ نفسَها.
  revalidatePath("/main/donors", "layout");
}

/**
 * حسابُ الجمعية عند جهةٍ مانحة — تكتبه بنفسها من شاشتها.
 *
 * وكان يُكتب عند زادٍ وحدَها، فصارت الجمعيةُ تكتبه: الحسابُ حسابُها عند
 * الجهة، وهي أعلمُ به وأسرعُ إلى تصحيحه. ويُشفَّر كما يُشفَّر المكتوبُ عند زاد
 * — مفتاحٌ واحدٌ وجدولٌ واحد.
 */
export async function savePortalDonorAccount(
  charityId: string,
  donorOrgId: string,
  username: string,
  password: string
): Promise<Result> {
  const guard = await requireFundraiser(charityId);
  if (!guard) return { ok: false, error: "غير مصرح" };

  const user = cleanCredential(username);
  const pass = cleanCredential(password);
  if (!user || !pass) return { ok: false, error: "اسم المستخدم وكلمة المرور مطلوبان" };

  const org = await prisma.donorOrg.findFirst({
    where: { id: donorOrgId, kind: PORTAL_DONOR_KIND },
    select: { name: true },
  });
  if (!org) return { ok: false, error: "الجهة غير موجودة" };

  try {
    await prisma.donorAccount.upsert({
      where: { donorOrgId_charityId: { donorOrgId, charityId } },
      create: { donorOrgId, charityId, username: user, password: encryptSecret(pass) },
      update: { username: user, password: encryptSecret(pass) },
    });

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: guard.session.id,
      actorName: guard.session.name,
      action: "UPSERT",
      targetType: "DonorAccount",
      targetId: `${donorOrgId}:${charityId}`,
      // ولا كلمةَ مرورٍ في السِّجلّ: سجلٌّ يحفظ السِّرَّ نسخةٌ ثانيةٌ منه.
      metadata: { donorOrg: org.name, username: user },
    });

    revalidateFundraising(guard.charity.name);
    return { ok: true };
  } catch (error) {
    console.error("savePortalDonorAccount", error);
    return { ok: false, error: "تعذر حفظ الحساب" };
  }
}

export async function deletePortalDonorAccount(charityId: string, donorOrgId: string): Promise<Result> {
  const guard = await requireFundraiser(charityId);
  if (!guard) return { ok: false, error: "غير مصرح" };

  try {
    await prisma.donorAccount.deleteMany({ where: { donorOrgId, charityId } });
    await logAudit({
      actorType: "CHARITY_USER",
      actorId: guard.session.id,
      actorName: guard.session.name,
      action: "DELETE",
      targetType: "DonorAccount",
      targetId: `${donorOrgId}:${charityId}`,
      metadata: {},
    });
    revalidateFundraising(guard.charity.name);
    return { ok: true };
  } catch (error) {
    console.error("deletePortalDonorAccount", error);
    return { ok: false, error: "تعذر حذف الحساب" };
  }
}

/**
 * مشروعٌ مقترحٌ في مجال: من الخطة التشغيلية أو من خارجها.
 *
 * والاسمُ يُثبَّت في الصفّ في الحالين: مبادرةٌ تُعاد تسميتُها أو تُحذف خطّتُها
 * لا يجوز أن تُعيد كتابةَ ما اقترحته الجمعيةُ في تاريخٍ معلوم.
 */
export async function addPortalProposal(
  charityId: string,
  donorFieldId: string,
  input: { initiativeId?: string | null; name?: string | null; note?: string | null }
): Promise<Result> {
  const guard = await requireFundraiser(charityId);
  if (!guard) return { ok: false, error: "غير مصرح" };

  try {
    const field = await prisma.donorField.findUnique({
      where: { id: donorFieldId },
      select: { id: true, donorOrg: { select: { kind: true } } },
    });
    if (!field || field.donorOrg.kind !== PORTAL_DONOR_KIND) {
      return { ok: false, error: "المجال غير موجود" };
    }

    let name = (input.name ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
    let initiativeId: string | null = null;

    if (input.initiativeId) {
      // والمبادرةُ تُفحص أنّها من خطط هذه الجمعية: معرّفٌ يُمرَّر في الطلب لا
      // يُصدَّق، وإلّا عُلِّقت مبادرةُ جمعيةٍ أخرى باسمها.
      const initiative = await prisma.initiative.findFirst({
        where: { id: input.initiativeId, plan: { charityId } },
        select: { id: true, name: true },
      });
      if (!initiative) return { ok: false, error: "المشروع المختار ليس من خطط جمعيتك" };
      initiativeId = initiative.id;
      if (!name) name = initiative.name;
    }

    if (!name) return { ok: false, error: "اختر مشروعا من الخطة او اكتب اسم مشروع" };

    await prisma.grantProposal.create({
      data: {
        donorFieldId,
        charityId,
        initiativeId,
        name,
        note: (input.note ?? "").trim().slice(0, MAX_NOTE) || null,
        createdById: guard.session.userType === "CHARITY_USER" ? guard.session.id : null,
      },
    });

    revalidateFundraising(guard.charity.name);
    return { ok: true };
  } catch (error) {
    console.error("addPortalProposal", error);
    return {
      ok: false,
      error: "تعذر اضافة المشروع — وان لم يطبق بعد prisma/sql/portal-fundraising.sql فهذا سببه",
    };
  }
}

export async function deletePortalProposal(id: string): Promise<Result> {
  try {
    const row = await prisma.grantProposal.findUnique({
      where: { id },
      select: { charityId: true, name: true },
    });
    if (!row) return { ok: false, error: "المشروع غير موجود" };

    const guard = await requireFundraiser(row.charityId);
    if (!guard) return { ok: false, error: "غير مصرح" };

    await prisma.grantProposal.delete({ where: { id } });
    revalidateFundraising(guard.charity.name);
    return { ok: true };
  } catch (error) {
    console.error("deletePortalProposal", error);
    return { ok: false, error: "تعذر حذف المشروع" };
  }
}
