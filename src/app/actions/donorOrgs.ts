"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAssignedCharityIds } from "@/lib/access";
import { encryptSecret } from "@/lib/encryption";
import { logAudit } from "@/lib/auditLog";
import { cleanDonorName, donorKindOf, intakeStatusOf, normalizeDonorName } from "@/lib/donorOrg";

/**
 * أفعالُ الجهات المانحة.
 *
 * وحارسُها صلاحيةُ القسم وحدها لبيانات الجهة — فهي بياناتُ زاد لا بياناتُ
 * جمعية. وحساباتُ الدخول تزيد عليها شرطَ الإسناد: من لم تُسنَد إليه الجمعيةُ
 * لا يكتب حسابَها ولا يقرؤه.
 *
 * والأفعالُ تُرجع كائنَ نتيجةٍ لا تَرمي: النماذجُ هنا تُعرض رسالتَها في مكانها،
 * ورميُ الخطأ يُظهر شاشةَ الخطأ العامّة فيَفقد المستعملُ ما كتب.
 */
type Result = { ok: true } | { ok: false; error: string };

async function requireDonorEditor() {
  const session = await getSession();
  if (!session?.id || session.userType === "CHARITY_USER") return null;
  if (!hasPermission(session.role, session.permissions || [], "manage_resource_development")) return null;
  return session;
}

/** ومعه نطاقُ الإسناد — لحسابات الدخول وحدها. */
async function requireCharityInScope(charityId: string) {
  const session = await requireDonorEditor();
  if (!session) return null;
  const assigned = await getAssignedCharityIds(session.id, session.role, session.permissions);
  if (assigned !== null && !assigned.includes(charityId)) return null;
  return session;
}

function revalidateDonors(id?: string) {
  revalidatePath("/main/donors");
  if (id) revalidatePath(`/main/donors/${id}`);
}

type DonorInput = {
  name: string;
  url?: string | null;
  fields?: string | null;
  kind?: string;
  intakeStatus?: string;
  opensAt?: string | null;
  closesAt?: string | null;
  notes?: string | null;
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * جهةٌ باسمٍ يُطابق اسمَ جهةٍ أخرى بعد التسوية.
 *
 * والقيدُ الفريدُ في القاعدة يمنع التطابقَ الحرفيّ وحده، و«بنك الجزيرة» و«بنك
 * الجزيرة␣» يمرّان منه — وهما في قاعدتك اليوم شاهدٌ على ذلك. فالتسويةُ تُفحص
 * هنا قبل الكتابة، ويُقال للمستعمل بأيِّ صفٍّ اصطدم.
 */
async function nameClash(name: string, exceptId?: string) {
  const key = normalizeDonorName(name);
  const rows = await prisma.donorOrg.findMany({ select: { id: true, name: true } });
  return rows.find((r) => r.id !== exceptId && normalizeDonorName(r.name) === key) ?? null;
}

export async function createDonorOrg(input: DonorInput): Promise<Result & { id?: string }> {
  const session = await requireDonorEditor();
  if (!session) return { ok: false, error: "غير مصرح" };

  const name = cleanDonorName(input.name || "");
  if (name.length < 2) return { ok: false, error: "اسمُ الجهة مطلوب" };

  const clash = await nameClash(name);
  if (clash) return { ok: false, error: `جهةٌ بهذا الاسم موجودة: ${clash.name}` };

  try {
    const org = await prisma.donorOrg.create({
      data: {
        name,
        url: input.url?.trim() || null,
        fields: input.fields?.trim() || null,
        kind: donorKindOf(input.kind || "FOUNDATION"),
        intakeStatus: intakeStatusOf(input.intakeStatus || "CLOSED"),
        opensAt: parseDate(input.opensAt),
        closesAt: parseDate(input.closesAt),
        notes: input.notes?.trim() || null,
      },
      select: { id: true },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "CREATE",
      targetType: "DonorOrg",
      targetId: org.id,
      metadata: { name },
    });

    revalidateDonors();
    return { ok: true, id: org.id };
  } catch (error) {
    console.error("Error creating donor org:", error);
    return { ok: false, error: "تعذّر إنشاء الجهة" };
  }
}

export async function updateDonorOrg(id: string, input: DonorInput): Promise<Result> {
  const session = await requireDonorEditor();
  if (!session) return { ok: false, error: "غير مصرح" };

  const name = cleanDonorName(input.name || "");
  if (name.length < 2) return { ok: false, error: "اسمُ الجهة مطلوب" };

  const clash = await nameClash(name, id);
  if (clash) return { ok: false, error: `جهةٌ بهذا الاسم موجودة: ${clash.name}` };

  try {
    await prisma.donorOrg.update({
      where: { id },
      data: {
        name,
        url: input.url?.trim() || null,
        fields: input.fields?.trim() || null,
        kind: donorKindOf(input.kind || "FOUNDATION"),
        intakeStatus: intakeStatusOf(input.intakeStatus || "CLOSED"),
        opensAt: parseDate(input.opensAt),
        closesAt: parseDate(input.closesAt),
        notes: input.notes?.trim() || null,
      },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "UPDATE",
      targetType: "DonorOrg",
      targetId: id,
      metadata: { name },
    });

    revalidateDonors(id);
    return { ok: true };
  } catch (error) {
    console.error("Error updating donor org:", error);
    return { ok: false, error: "تعذّر حفظ التعديل" };
  }
}

/**
 * حذفُ جهة — ويُمنع إن كان لها حسابٌ أو منحة.
 *
 * والقاعدةُ تمنعه أصلاً (`onDelete: Restrict`)، فالفحصُ هنا ليس حمايةً بل
 * رسالة: «لا يمكن» وحدها تُحيّر، و«لها ٣ حساباتٍ و٧ منح» تقول ما يُفعل.
 */
export async function deleteDonorOrg(id: string): Promise<Result> {
  const session = await requireDonorEditor();
  if (!session) return { ok: false, error: "غير مصرح" };

  const org = await prisma.donorOrg.findUnique({
    where: { id },
    select: { name: true, _count: { select: { accounts: true, grants: true } } },
  });
  if (!org) return { ok: false, error: "الجهة غير موجودة" };

  const { accounts, grants } = org._count;
  if (accounts > 0 || grants > 0) {
    return {
      ok: false,
      error: `لا تُحذف الجهة ولها ${accounts} حساباً و${grants} منحة — احذفها أو انقلها أولاً`,
    };
  }

  try {
    await prisma.donorOrg.delete({ where: { id } });
    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "DELETE",
      targetType: "DonorOrg",
      targetId: id,
      metadata: { name: org.name },
    });
    revalidateDonors();
    return { ok: true };
  } catch (error) {
    console.error("Error deleting donor org:", error);
    return { ok: false, error: "تعذّر الحذف" };
  }
}

/**
 * حفظُ حساب جمعيةٍ عند جهة — إنشاءً أو تعديلاً.
 *
 * فعلٌ واحدٌ لا فعلان: القيدُ الفريد `(donorOrgId, charityId)` يجعل الصفَّ
 * صفّاً واحداً لكل جمعية، فـ`upsert` هو عينُ ما يعنيه الجدولُ في الواجهة —
 * صفٌّ لكل جمعيةٍ يُملأ أو يُغيَّر.
 */
export async function saveDonorAccount(
  donorOrgId: string,
  charityId: string,
  username: string,
  password: string
): Promise<Result> {
  const session = await requireCharityInScope(charityId);
  if (!session) return { ok: false, error: "غير مصرح" };

  const user = username.trim();
  const pass = password.trim();
  if (!user || !pass) return { ok: false, error: "اسم المستخدم وكلمة المرور مطلوبان" };

  try {
    const org = await prisma.donorOrg.findUnique({ where: { id: donorOrgId }, select: { name: true } });
    if (!org) return { ok: false, error: "الجهة غير موجودة" };

    await prisma.donorAccount.upsert({
      where: { donorOrgId_charityId: { donorOrgId, charityId } },
      create: { donorOrgId, charityId, username: user, password: encryptSecret(pass) },
      update: { username: user, password: encryptSecret(pass) },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "UPSERT",
      targetType: "DonorAccount",
      targetId: `${donorOrgId}:${charityId}`,
      // لا كلمةَ مرورٍ في السِّجلّ: سجلٌّ يحفظ السِّرَّ نسخةٌ ثانيةٌ منه.
      metadata: { donorOrg: org.name, charityId, username: user },
    });

    revalidateDonors(donorOrgId);
    return { ok: true };
  } catch (error) {
    console.error("Error saving donor account:", error);
    return { ok: false, error: "تعذّر حفظ الحساب" };
  }
}

export async function deleteDonorAccountRow(id: string): Promise<Result> {
  const session = await requireDonorEditor();
  if (!session) return { ok: false, error: "غير مصرح" };

  const row = await prisma.donorAccount.findUnique({
    where: { id },
    select: { charityId: true, donorOrgId: true, username: true, donorOrg: { select: { name: true } } },
  });
  if (!row) return { ok: false, error: "الحساب غير موجود" };

  const scoped = await requireCharityInScope(row.charityId);
  if (!scoped) return { ok: false, error: "غير مصرح" };

  try {
    await prisma.donorAccount.delete({ where: { id } });
    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "DELETE",
      targetType: "DonorAccount",
      targetId: id,
      metadata: { donorOrg: row.donorOrg.name, charityId: row.charityId, username: row.username },
    });
    revalidateDonors(row.donorOrgId);
    return { ok: true };
  } catch (error) {
    console.error("Error deleting donor account:", error);
    return { ok: false, error: "تعذّر حذف الحساب" };
  }
}
