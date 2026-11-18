"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAssignedCharityIds } from "@/lib/access";
import { SECTION_SERVICES, charityHasService } from "@/lib/charityServices";
import { encryptSecret } from "@/lib/encryption";
import { logAudit } from "@/lib/auditLog";
import { cleanDonorName, donorKindOf, intakeStatusOf, normalizeDonorName } from "@/lib/donorOrg";
import {
  cleanFieldDescription,
  cleanFieldName,
  proposalStatusOf,
  sameFieldName,
  splitLegacyFields,
} from "@/lib/donorFields";

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
  // ولا حسابَ لجمعيةٍ لا تشملها خدمةُ تنمية الموارد، كما لا تظهر في صفحاتها.
  if (!(await charityHasService(charityId, SECTION_SERVICES.manage_resource_development))) return null;
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

// ── مجالات المنح ────────────────────────────────────────────────────────────
/**
 * مجالاتُ المنح: تُضاف واحداً واحداً في ملف الجهة، وتُقرأ في بوّابة الجمعية.
 *
 * **وحارسُها حارسُ بيانات الجهة** (`requireDonorEditor`) بلا شرط إسناد:
 * المجالُ خبرٌ عن الجهة لا عن جمعيةٍ بعينها، كاسمها ورابطها وحالة رفعها.
 *
 * **والترتيبُ عمودٌ لا ترتيبُ إدخال**: تُعرض في البوّابة بترتيبٍ يختاره
 * كاتبُها، والإدخالُ لا يُعبّر عن الأهمية.
 */
async function nextFieldOrder(donorOrgId: string) {
  const last = await prisma.donorField.findFirst({
    where: { donorOrgId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (last?.order ?? 0) + 1;
}

/** رسالةُ العطب: الجدولُ قد لا يكون أُنشئ بعد، فيُقال السببُ باسم الملف. */
function fieldError(error: unknown, fallback: string): Result {
  console.error("donorField", error);
  return {
    ok: false,
    error:
      fallback + " — وان لم يطبق بعد prisma/sql/donor-grant-fields.sql فهذا سببه",
  };
}

export async function addDonorField(
  donorOrgId: string,
  name: string,
  description?: string | null
): Promise<Result> {
  const session = await requireDonorEditor();
  if (!session) return { ok: false, error: "غير مصرح" };

  const value = cleanFieldName(name);
  if (!value) return { ok: false, error: "اسم المجال مطلوب" };

  try {
    const existing = await prisma.donorField.findMany({
      where: { donorOrgId },
      select: { name: true },
    });
    if (existing.some((f) => sameFieldName(f.name, value))) {
      return { ok: false, error: "هذا المجال مضاف مسبقا" };
    }

    await prisma.donorField.create({
      data: {
        donorOrgId,
        name: value,
        description: cleanFieldDescription(description),
        order: await nextFieldOrder(donorOrgId),
      },
    });
    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "CREATE",
      targetType: "DonorField",
      targetId: donorOrgId,
      metadata: { name: value },
    });
    revalidateDonors(donorOrgId);
    return { ok: true };
  } catch (error) {
    return fieldError(error, "تعذر اضافة المجال");
  }
}

export async function updateDonorField(
  id: string,
  name: string,
  description?: string | null
): Promise<Result> {
  const session = await requireDonorEditor();
  if (!session) return { ok: false, error: "غير مصرح" };

  const value = cleanFieldName(name);
  if (!value) return { ok: false, error: "اسم المجال مطلوب" };

  try {
    const row = await prisma.donorField.update({
      where: { id },
      data: { name: value, description: cleanFieldDescription(description) },
      select: { donorOrgId: true },
    });
    revalidateDonors(row.donorOrgId);
    return { ok: true };
  } catch (error) {
    return fieldError(error, "تعذر حفظ المجال");
  }
}

export async function deleteDonorField(id: string): Promise<Result> {
  const session = await requireDonorEditor();
  if (!session) return { ok: false, error: "غير مصرح" };

  try {
    const row = await prisma.donorField.delete({ where: { id }, select: { donorOrgId: true, name: true } });
    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "DELETE",
      targetType: "DonorField",
      targetId: row.donorOrgId,
      metadata: { name: row.name },
    });
    revalidateDonors(row.donorOrgId);
    return { ok: true };
  } catch (error) {
    return fieldError(error, "تعذر حذف المجال");
  }
}

/** تبديلُ مجالٍ بجاره: الترتيبُ يُقرأ في البوّابة، فيُرتَّب هنا. */
export async function moveDonorField(id: string, direction: "up" | "down"): Promise<Result> {
  const session = await requireDonorEditor();
  if (!session) return { ok: false, error: "غير مصرح" };

  try {
    const row = await prisma.donorField.findUnique({
      where: { id },
      select: { id: true, order: true, donorOrgId: true },
    });
    if (!row) return { ok: false, error: "المجال غير موجود" };

    const neighbour = await prisma.donorField.findFirst({
      where: {
        donorOrgId: row.donorOrgId,
        order: direction === "up" ? { lt: row.order } : { gt: row.order },
      },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
      select: { id: true, order: true },
    });
    if (!neighbour) return { ok: true };

    await prisma.$transaction([
      prisma.donorField.update({ where: { id: row.id }, data: { order: neighbour.order } }),
      prisma.donorField.update({ where: { id: neighbour.id }, data: { order: row.order } }),
    ]);
    revalidateDonors(row.donorOrgId);
    return { ok: true };
  } catch (error) {
    return fieldError(error, "تعذر ترتيب المجالات");
  }
}

/**
 * نقلُ النصِّ القديم إلى مجالات — بزرٍّ، لا هجرةً تُخمّن.
 *
 * والنصُّ يبقى بعد النقل: هو ما كُتب، وقد يُقطَّع تقطيعاً لا يرضاه كاتبُه
 * فيصحّح المجالاتِ ويحذفُ ما شاء، والأصلُ أمامه. ومن نُقل مجالُه لا يُكرَّر.
 */
export async function importLegacyDonorFields(donorOrgId: string): Promise<Result & { added?: number }> {
  const session = await requireDonorEditor();
  if (!session) return { ok: false, error: "غير مصرح" };

  try {
    const org = await prisma.donorOrg.findUnique({
      where: { id: donorOrgId },
      select: { fields: true, grantFields: { select: { name: true } } },
    });
    if (!org) return { ok: false, error: "الجهة غير موجودة" };

    const names = splitLegacyFields(org.fields).filter(
      (name) => !org.grantFields.some((f) => sameFieldName(f.name, name))
    );
    if (names.length === 0) return { ok: false, error: "لا جديد في النص لينقل" };

    let order = await nextFieldOrder(donorOrgId);
    await prisma.donorField.createMany({
      data: names.map((name) => ({ donorOrgId, name, order: order++ })),
    });
    revalidateDonors(donorOrgId);
    return { ok: true, added: names.length };
  } catch (error) {
    return fieldError(error, "تعذر نقل المجالات");
  }
}

/**
 * مصيرُ مشروعٍ اقترحته جمعية: مقترحٌ، أو رُفع، أو مؤجَّل.
 *
 * **ويضبطه فريقُ زادٍ وحدَه**: الاقتراحُ قولُ الجمعية، والمصيرُ قرارُ من يرفع
 * إلى الجهة. ولو ضبطته الجمعيةُ لصار الحقلُ رأياً لا خبراً.
 *
 * ويُعلَّم «رُفع» تلقائياً حين تُنشأ منحتُه من المقترح نفسِه — فلا يُطلب من
 * أحدٍ أن يتذكّر خطوةً ثانيةً بعد الرفع.
 */
export async function setProposalStatus(id: string, status: string): Promise<Result> {
  const session = await requireDonorEditor();
  if (!session) return { ok: false, error: "غير مصرح" };

  try {
    const row = await prisma.grantProposal.update({
      where: { id },
      data: { status: proposalStatusOf(status) },
      select: { donorField: { select: { donorOrgId: true } } },
    });
    revalidateDonors(row.donorField.donorOrgId);
    return { ok: true };
  } catch (error) {
    return fieldError(error, "تعذر تغيير حال المقترح");
  }
}
