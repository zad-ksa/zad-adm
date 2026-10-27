"use server";

/**
 * أفعالُ الطلب المالي: الرفعُ وإعادةُ الرفع والاستطلاع.
 *
 * وأمّا البتُّ فلا فعلَ له هنا: `reviewRequest` في `approvals.ts` تعمل على
 * `Request` أيّاً كان نوعه — السلسلةُ والسجلُّ والإشعارُ والتفويضُ محرّكٌ
 * واحدٌ لا اثنان. والمفترقُ هو ما يُرى: صفحةٌ وصلاحيةٌ وسلسلةٌ وإعداداتٌ
 * وتصديرٌ خاصٌّ بالمالي.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { RELATION_JOIN, sortRequests, visibleRequestFilter } from "@/lib/requestQuery";
import { FINANCIAL_INCLUDE, serialiseFinancialRows } from "@/lib/financialRequestRow";
import {
  DEFAULT_VAT_RATE,
  OTHER_TYPE_NAME,
  VAT_RATE_SETTING_KEY,
  isPlausibleIban,
  isValidVatRate,
  normaliseIban,
  parseAmount,
  typeLabelFor,
} from "@/lib/financialRequest";
import { createAppNotification } from "./notifications";
import { revalidatePath } from "next/cache";

const PAGE = "/main/financial-requests";

async function requireSession() {
  const session = await getSession();
  if (!session?.id) throw new Error("غير مصرح");
  return session;
}

/** يرى الطلبات المالية كلَّها: مَن يبتّ فيها، ومَن يتابع الاعتمادات عامّةً. */
function seesAllFinancial(session: { role: string; permissions?: string[] | null }) {
  const perms = session.permissions || [];
  return (
    hasPermission(session.role, perms, "approve_financial_requests") ||
    hasPermission(session.role, perms, "review_all_requests")
  );
}

async function notify(requestId: string, employeeId: string) {
  await prisma.requestNotification.upsert({
    where: { requestId_employeeId: { requestId, employeeId } },
    create: { requestId, employeeId, isRead: false },
    update: { isRead: false },
  });
}

/**
 * نسبةُ الضريبة من الإعداد العام، وافتراضها ١٥ حين لا إعداد أو كان فاسداً.
 *
 * وتُقرأ عند الرفع لا عند العرض: النسبةُ تُثبَّت في صفّ الطلب، فتغييرُها
 * نظاماً لا يُعيد حساب ما اعتُمد بغيرها.
 */
export async function readVatRate(): Promise<number> {
  const row = await prisma.globalSetting.findUnique({ where: { key: VAT_RATE_SETTING_KEY } });
  const value = row?.value;
  return isValidVatRate(value) ? Number(value) : DEFAULT_VAT_RATE;
}

/** الأنواعُ المفعَّلة بترتيبها — ما يُعرض في النموذج. */
export async function listActiveTypes() {
  await requireSession();
  return prisma.financialRequestType.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

type BankInput = { bankName?: string; iban?: string; accountNumber?: string };

/**
 * الحسابُ البنكي: كلُّه اختياري، والآيبان يُطبَّع ويُحرَس حراسةً خفيفة.
 *
 * ورقمُ الحساب اختياريٌّ حتى لو ذُكر البنك — كما طلبتَه نصّاً.
 */
function readBank(input: BankInput) {
  const bankName = input.bankName?.trim() || null;
  const accountNumber = input.accountNumber?.trim() || null;
  const rawIban = input.iban?.trim() || "";
  if (!rawIban) return { bankName, iban: null, accountNumber };

  const iban = normaliseIban(rawIban);
  if (!isPlausibleIban(iban)) throw new Error("الآيبان غير صحيح — حرفان ثم أرقام وحروف");
  return { bankName, iban, accountNumber };
}

type FormInput = BankInput & {
  typeId: string;
  /** يُدمج في المسمّى حين يكون النوع «أخرى». */
  otherLabel?: string;
  title: string;
  body: string;
  /** نصّاً كما كُتب: فاصلةُ الآلاف مقبولة. */
  amount: string;
  isTaxable: boolean;
  attachments?: unknown[];
};

/** ما يُتحقَّق منه في الرفع وإعادته معاً — فلا يفترق الشرطان. */
async function readForm(input: FormInput) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw new Error("عنوان الطلب مطلوب");
  if (!body) throw new Error("تفاصيل الطلب مطلوبة");

  const amount = parseAmount(input.amount);
  if (amount === null) throw new Error("المبلغ غير صحيح — أدخل رقماً أكبر من صفر");

  const type = await prisma.financialRequestType.findUnique({ where: { id: input.typeId } });
  if (!type || !type.isActive) throw new Error("نوع الطلب غير متاح — اختر نوعاً آخر");
  if (type.name === OTHER_TYPE_NAME && !input.otherLabel?.trim()) {
    throw new Error("حدّد نوع الطلب");
  }

  return {
    title,
    body,
    amount,
    typeId: type.id,
    typeLabel: typeLabelFor(type.name, input.otherLabel),
    bank: readBank(input),
    attachments: (input.attachments?.length ? input.attachments : Prisma.DbNull) as Prisma.InputJsonValue,
  };
}

/** أوّلُ خطوةٍ في السلسلة المالية النشطة، أو خطأٌ يقول السبب. */
async function financialFirstStep() {
  const chain = await prisma.workflowChain.findFirst({
    where: { isActive: true, purpose: "FINANCIAL" },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  const firstStep = chain?.steps[0] ?? null;
  if (!chain || !firstStep) {
    throw new Error("لا توجد سلسلة اعتماد مالية نشطة حالياً، راجع مسؤول النظام");
  }
  return { chainId: chain.id, approverId: firstStep.approverId };
}

// ── رفع طلبٍ مالي ────────────────────────────────────────────────────────────

/**
 * الرفعُ لكل موظف بلا صلاحية.
 *
 * والسلسلةُ هي التي تقرّر من يبتّ، كما في الاعتمادات العامة. و`priority`
 * تُكتب `MEDIUM` صامتةً: حُذفت الأولوية من الطلب المالي، والعمودُ مشتركٌ
 * فيبقى على قيمةٍ واحدةٍ لا تُسأل ولا تُعرض.
 */
export async function createFinancialRequest(input: FormInput) {
  const session = await requireSession();
  const [form, step, taxRate] = await Promise.all([
    readForm(input),
    financialFirstStep(),
    readVatRate(),
  ]);

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.request.create({
      data: {
        kind: "FINANCIAL",
        title: form.title,
        body: form.body,
        attachments: form.attachments,
        priority: "MEDIUM",
        status: "PENDING",
        createdById: session.id,
        chainId: step.chainId,
        currentStepOrder: 1,
        currentReviewerId: step.approverId,
      },
    });

    await tx.financialRequest.create({
      data: {
        requestId: created.id,
        typeId: form.typeId,
        typeLabel: form.typeLabel,
        // نصّاً لا رقماً عائماً: العمود `Decimal(14,2)` والنصُّ يعبر إليه بلا
        // خطأ تمثيل.
        amount: form.amount.toFixed(2),
        isTaxable: input.isTaxable,
        taxRate: input.isTaxable ? taxRate.toFixed(2) : null,
        ...form.bank,
      },
    });

    await tx.requestLog.create({
      data: { requestId: created.id, stepOrder: 0, actorId: session.id, action: "SUBMITTED" },
    });

    return created;
  });

  if (step.approverId !== session.id) {
    await notify(request.id, step.approverId);
    await createAppNotification(
      step.approverId,
      "طلب مالي جديد",
      `تم رفع طلب مالي للمراجعة: ${request.title}`,
      PAGE
    );
  }

  revalidatePath(PAGE);
  return { id: request.id };
}

// ── إعادة رفع طلبٍ مُرجَع ────────────────────────────────────────────────────

/**
 * الطلبُ المُرجَع يُعدَّل ويُعاد رفعُه من أوّل السلسلة — كالنظام القائم.
 *
 * ولا تحريرَ لطلبٍ قائمٍ غيرِ مُرجَع: الوثيقةُ تحت الاعتماد لا تتغيّر تحت يد
 * معتمِدها.
 */
export async function resubmitFinancialRequest(input: FormInput & { requestId: string }) {
  const session = await requireSession();

  const existing = await prisma.request.findUnique({
    where: { id: input.requestId },
    select: { kind: true, status: true, createdById: true, chainId: true },
  });
  if (!existing || existing.kind !== "FINANCIAL") throw new Error("الطلب غير موجود");
  if (existing.createdById !== session.id) throw new Error("غير مصرح");
  if (existing.status !== "RETURNED") throw new Error("لا يمكن إعادة إرسال هذا الطلب");

  const [form, step, taxRate] = await Promise.all([
    readForm(input),
    financialFirstStep(),
    readVatRate(),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.request.update({
      where: { id: input.requestId },
      data: {
        title: form.title,
        body: form.body,
        attachments: form.attachments,
        status: "PENDING",
        reviewedById: null,
        reviewNote: null,
        reviewedAt: null,
        // من أوّل السلسلة، وبسلسلةٍ ماليةٍ نشطةٍ الآن لا بالتي رُفع بها: تلك
        // قد عُطِّلت أو استُبدلت بين الإرجاع وإعادة الرفع.
        chainId: step.chainId,
        currentStepOrder: 1,
        currentReviewerId: step.approverId,
      },
    });

    await tx.financialRequest.update({
      where: { requestId: input.requestId },
      data: {
        typeId: form.typeId,
        typeLabel: form.typeLabel,
        amount: form.amount.toFixed(2),
        isTaxable: input.isTaxable,
        taxRate: input.isTaxable ? taxRate.toFixed(2) : null,
        ...form.bank,
      },
    });

    await tx.requestLog.create({
      data: { requestId: input.requestId, stepOrder: 0, actorId: session.id, action: "RESUBMITTED" },
    });
  });

  if (step.approverId !== session.id) await notify(input.requestId, step.approverId);

  revalidatePath(PAGE);
}

// ── الاستطلاع ───────────────────────────────────────────────────────────────

/**
 * ما يراه هذا الموظف من الطلبات المالية، ويُطفئ شارتَها.
 *
 * والإطفاءُ مقصورٌ على إشعارات الطلبات المالية: قراءةُ هذه الصفحة لا تُطفئ
 * شارةَ الاعتمادات العامة — كانت تفعل ذلك حين كان الإطفاء بلا شرطِ نوع.
 */
export async function getFinancialRequestsAndMarkRead() {
  const session = await requireSession();

  const [requests] = await Promise.all([
    prisma.request.findMany({
      ...RELATION_JOIN,
      where: visibleRequestFilter(session.id, {
        kind: "FINANCIAL",
        canReviewAll: seesAllFinancial(session),
      }),
      include: FINANCIAL_INCLUDE,
    }),
    prisma.requestNotification.updateMany({
      where: { employeeId: session.id, isRead: false, request: { kind: "FINANCIAL" } },
      data: { isRead: true },
    }),
  ]);

  return serialiseFinancialRows(sortRequests(requests));
}
