"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/guards";
import { resolveCharityPortal } from "@/lib/portalAccess";
import { computeDesignRequestDates } from "@/lib/businessDays";
import { providerOf } from "@/lib/storage";
import { storagePublicBase } from "@/lib/b2";
import {
  DOC_REQUEST_SETTINGS_KEY,
  cleanDocRequest,
  docRequestCan,
  type CleanDocRequest,
  normalizeDocRequestSettings,
  type DocRequestInput,
  type DocRequestSettings,
} from "@/lib/docRequests";

/**
 * أفعالُ طلبات إنشاء وثائق المشاريع — طرفاها الجمعيةُ وموظّفُ زاد.
 *
 * **وحارسان لا واحد**: الجمعيةُ تُفحص بعضويّتها وصلاحيّتها
 * (`view_doc_requests`)، وموظّفُ زادٍ بصلاحيّة المنشئ (`use_project_builder`)
 * — فمن يكتب الوثيقةَ هو من يملك الأداةَ التي تكتبها.
 *
 * **والجمعيةُ تُقرأ من الصفّ لا من الطلب**: الفعلُ يأخذ معرّفَ الطلب، فتُقرأ
 * جمعيتُه من صفّه ثمّ تُفحص — ولو أُخذت من الطلب لعمّد عضوُ جمعيةٍ وثيقةَ
 * جمعيةٍ أخرى بتمرير معرّف.
 */

type Result = { ok: true } | { ok: false; error: string };

/**
 * الطلبُ المنظَّفُ بصيغة الكتابة في القاعدة — مع فحص المرفقات.
 *
 * **والمرفقُ من مخزننا وحدَه**: الرابطُ يصل من المتصفّح، ورابطٌ يُكتب باليد
 * إلى موقعٍ آخرَ يصير في بطاقة موظّفي زاد زرَّ تنزيلٍ لا يُدرى إلامَ يقود.
 */
function toRow(value: CleanDocRequest): { ok: true; data: Omit<CleanDocRequest, "attachments"> & { attachments: Prisma.InputJsonValue | typeof Prisma.DbNull } } | { ok: false; error: string } {
  const base = storagePublicBase();
  if (value.attachments?.some((a) => !providerOf(a.url, base))) {
    return { ok: false, error: "مرفق غير صالح — ارفعه من جديد" };
  }
  return {
    ok: true,
    data: { ...value, attachments: value.attachments ? (value.attachments as Prisma.InputJsonValue) : Prisma.DbNull },
  };
}

const SQL_HINT = "— وان لم يطبق بعد prisma/sql/doc-requests.sql فهذا سببه";

async function readSettings(): Promise<DocRequestSettings> {
  try {
    const row = await prisma.globalSetting.findUnique({ where: { key: DOC_REQUEST_SETTINGS_KEY } });
    return normalizeDocRequestSettings(row?.value);
  } catch {
    return normalizeDocRequestSettings(null);
  }
}

/**
 * موعدُ الطلب: من ذيل دور الجمعية أو من يومه.
 *
 * **والدورُ لجمعيةٍ لا لزادٍ كلِّها**: جمعيةٌ لا تنتظر طلبَ جمعيةٍ أخرى — وهذا
 * ما اختاره الإعداد: «بالدور» تُصفُّ طلباتِها خلف بعضها، و«في وقت واحد» تُعطي
 * كلَّ طلبٍ مهلتَه من يومه.
 */
async function scheduleFor(charityId: string, settings: DocRequestSettings, submittedAt: Date) {
  let tail: Date | undefined;
  if (settings.queueMode === "QUEUE") {
    const last = await prisma.docRequest.findFirst({
      where: { charityId, status: "PENDING" },
      orderBy: { expectedCompletionDate: "desc" },
      select: { expectedCompletionDate: true },
    });
    if (last && last.expectedCompletionDate > submittedAt) tail = last.expectedCompletionDate;
  }
  return computeDesignRequestDates(submittedAt, tail, settings.defaultWorkingDays);
}

// ── طرفُ الجمعية ───────────────────────────────────────────────────────────

async function requireCharity(charityName: string) {
  const access = await resolveCharityPortal(charityName);
  if (!access.can("view_doc_requests")) return null;
  return access;
}

export async function createDocRequest(charityName: string, input: DocRequestInput): Promise<Result> {
  const access = await requireCharity(charityName);
  if (!access) return { ok: false, error: "غير مصرح" };

  const clean = cleanDocRequest(input);
  if (!clean.ok) return { ok: false, error: clean.error };
  const row = toRow(clean.value);
  if (!row.ok) return { ok: false, error: row.error };

  try {
    const settings = await readSettings();
    const submittedAt = new Date();
    const dates = await scheduleFor(access.charity.id, settings, submittedAt);
    const session = await getSession();

    await prisma.docRequest.create({
      data: {
        charityId: access.charity.id,
        ...row.data,
        submittedAt,
        submittedById: session?.userType === "CHARITY_USER" ? session.id : null,
        workingDays: settings.defaultWorkingDays,
        ...dates,
      },
    });

    revalidateDocRequests(access.charity.name);
    return { ok: true };
  } catch (error) {
    console.error("createDocRequest", error);
    return { ok: false, error: "تعذر رفع الطلب " + SQL_HINT };
  }
}

/**
 * تعديلُ الطلب أو إعادةُ إرساله بعد ردِّ زاد.
 *
 * **وملاحظةُ الردِّ تُمحى بإعادة الإرسال**: هي سببُ الردِّ، فإذا عُولج لم يبقَ
 * له معنى — والسجلُّ في `returnedAt` يقول إنّه رُدّ مرّةً.
 */
export async function updateDocRequest(id: string, input: DocRequestInput): Promise<Result> {
  try {
    const row = await prisma.docRequest.findUnique({
      where: { id },
      select: { charityId: true, status: true, charity: { select: { name: true } } },
    });
    if (!row) return { ok: false, error: "الطلب غير موجود" };

    const access = await requireCharity(row.charity.name);
    if (!access || access.charity.id !== row.charityId) return { ok: false, error: "غير مصرح" };
    if (!docRequestCan(row.status).edit) return { ok: false, error: "لا يمكن تعديل الطلب في حاله الحالي" };

    const clean = cleanDocRequest(input);
    if (!clean.ok) return { ok: false, error: clean.error };
    const next = toRow(clean.value);
    if (!next.ok) return { ok: false, error: next.error };

    await prisma.docRequest.update({
      where: { id },
      data: {
        ...next.data,
        ...(row.status === "RETURNED" ? { status: "PENDING" as const, returnNote: null } : {}),
      },
    });

    revalidateDocRequests(row.charity.name);
    return { ok: true };
  } catch (error) {
    console.error("updateDocRequest", error);
    return { ok: false, error: "تعذر حفظ الطلب" };
  }
}

/** تعميدُ الجمعية للوثيقة النهائية — آخرُ المسار. */
export async function approveDocRequest(id: string): Promise<Result> {
  try {
    const row = await prisma.docRequest.findUnique({
      where: { id },
      select: { charityId: true, status: true, charity: { select: { name: true } } },
    });
    if (!row) return { ok: false, error: "الطلب غير موجود" };

    const access = await requireCharity(row.charity.name);
    if (!access || access.charity.id !== row.charityId) return { ok: false, error: "غير مصرح" };
    if (!docRequestCan(row.status).approve) return { ok: false, error: "لا شيء ينتظر تعميدكم في هذا الطلب" };

    await prisma.docRequest.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    revalidateDocRequests(row.charity.name);
    return { ok: true };
  } catch (error) {
    console.error("approveDocRequest", error);
    return { ok: false, error: "تعذر تعميد الوثيقة" };
  }
}

// ── طرفُ زاد ───────────────────────────────────────────────────────────────

async function requireStaff() {
  try {
    return await requirePermission("use_project_builder");
  } catch {
    return null;
  }
}

/**
 * حفظُ الوثيقة المولَّدة وخياراتِ الموظّف في صفِّ الطلب.
 *
 * **والمتنُ يُحفظ هنا لا في وثائق الموظّف**: `ProjectBuilderDocument` ملكُ
 * موظّفٍ بعينه، وهذه ملكُ الطلب — تُقرأ بعد شهرٍ ولو انتقل الموظّف. ومن أراد
 * نسخةً في وثائقه حفظها من المنشئ كعادته.
 */
export async function saveDocRequestDocument(
  id: string,
  content: string,
  options: unknown
): Promise<Result> {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "غير مصرح" };

  const text = (content ?? "").trim();
  if (!text) return { ok: false, error: "لا متن للوثيقة" };

  try {
    const row = await prisma.docRequest.findUnique({ where: { id }, select: { status: true } });
    if (!row) return { ok: false, error: "الطلب غير موجود" };
    if (!docRequestCan(row.status).generate) return { ok: false, error: "لا يمكن إنشاء الوثيقة في هذا الحال" };

    await prisma.docRequest.update({
      where: { id },
      data: {
        docContent: text,
        builderOptions: (options ?? null) as Prisma.InputJsonValue,
        generatedAt: new Date(),
        generatedById: staff.id,
      },
    });

    revalidatePath("/main/doc-requests");
    return { ok: true };
  } catch (error) {
    console.error("saveDocRequestDocument", error);
    return { ok: false, error: "تعذر حفظ الوثيقة" };
  }
}

/** إنهاءُ الطلب: الملفُّ النهائيُّ إلى الجمعية للمراجعة والتعميد. */
export async function deliverDocRequest(
  id: string,
  file: { fileUrl: string; fileName: string; fileSize: number | null },
  note?: string | null
): Promise<Result> {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "غير مصرح" };
  if (!file?.fileUrl || !file?.fileName) return { ok: false, error: "أرفق الملف النهائي" };

  try {
    const row = await prisma.docRequest.findUnique({
      where: { id },
      select: { status: true, charity: { select: { name: true } } },
    });
    if (!row) return { ok: false, error: "الطلب غير موجود" };
    if (!docRequestCan(row.status).deliver) return { ok: false, error: "لا يمكن تسليم الطلب في هذا الحال" };

    await prisma.docRequest.update({
      where: { id },
      data: {
        status: "AWAITING_REVIEW",
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        fileSize: file.fileSize,
        deliveredAt: new Date(),
        deliveredById: staff.id,
        deliveryNote: (note ?? "").trim() || null,
      },
    });

    revalidateDocRequests(row.charity.name);
    return { ok: true };
  } catch (error) {
    console.error("deliverDocRequest", error);
    return { ok: false, error: "تعذر تسليم الطلب" };
  }
}

/** إعادةُ الطلب إلى الجمعية بملاحظة — ما نقص فيه يُطلب قبل الكتابة لا بعدها. */
export async function returnDocRequest(id: string, note: string): Promise<Result> {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "غير مصرح" };

  const text = (note ?? "").trim().slice(0, 1000);
  if (!text) return { ok: false, error: "اكتب ما ينقص الطلب" };

  try {
    const row = await prisma.docRequest.findUnique({
      where: { id },
      select: { status: true, charity: { select: { name: true } } },
    });
    if (!row) return { ok: false, error: "الطلب غير موجود" };
    if (!docRequestCan(row.status).returnToCharity) {
      return { ok: false, error: "لا يمكن إعادة الطلب في هذا الحال" };
    }

    await prisma.docRequest.update({
      where: { id },
      data: { status: "RETURNED", returnNote: text, returnedAt: new Date() },
    });

    revalidateDocRequests(row.charity.name);
    return { ok: true };
  } catch (error) {
    console.error("returnDocRequest", error);
    return { ok: false, error: "تعذر إعادة الطلب" };
  }
}

// ── الإعدادات ──────────────────────────────────────────────────────────────

export async function getDocRequestSettings(): Promise<DocRequestSettings> {
  return readSettings();
}

/**
 * ضبطُ المهلة الافتراضية ونمطِ الدور.
 *
 * **ولا يُعاد حسابُ المواعيد القائمة**: كلُّ طلبٍ يحفظ أيّامَه وقتَ رفعه،
 * فوعدٌ قُطع للجمعية لا يتبدّل بإعدادٍ غُيّر بعده.
 */
export async function updateDocRequestSettings(settings: DocRequestSettings): Promise<Result> {
  try {
    await requirePermission("manage_project_builder");
  } catch {
    return { ok: false, error: "غير مصرح" };
  }

  const clean = normalizeDocRequestSettings(settings) as unknown as Prisma.InputJsonValue;
  try {
    await prisma.globalSetting.upsert({
      where: { key: DOC_REQUEST_SETTINGS_KEY },
      create: { key: DOC_REQUEST_SETTINGS_KEY, value: clean },
      update: { value: clean },
    });
    revalidatePath("/main/doc-requests");
    return { ok: true };
  } catch (error) {
    console.error("updateDocRequestSettings", error);
    return { ok: false, error: "تعذر حفظ الإعدادات" };
  }
}

function revalidateDocRequests(charityName: string) {
  revalidatePath(`/portal/${encodeURIComponent(charityName)}/doc-requests`);
  revalidatePath("/main/doc-requests");
}
