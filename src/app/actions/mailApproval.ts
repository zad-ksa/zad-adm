"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sanitizeMailHtml } from "@/lib/sanitizeMail";
import { requireEmployee, requirePermission } from "@/lib/guards";
import { getAssignedCharityIds } from "@/lib/access";
import { listServiceNames } from "@/app/actions/serviceAccess";

/**
 * تعميد البريد الصادر من زاد إلى الجمعيات.
 *
 * الفكرة: بريدٌ يخرج باسم خدمةٍ لا باسم شخص، فمن يملك الخدمة له أن يشترط أن
 * يقرأه قبل أن يصل. والتعميد **اختياري لكل خدمة**: خدمةٌ بلا معمِّدين يخرج
 * بريدها مباشرةً كما كان، فلا ينقطع شيء عند النشر.
 *
 * والحالة محفوظة على الرسالة نفسها (`approvalState`) لا في جدولٍ موازٍ: الرسالة
 * المنتظرة **لا صفوف استلام لها بعد**، فلا يمكن أن تُقرأ بالخطأ من أي استعلام
 * صندوق، وهو أقوى من الاعتماد على شرطٍ يُنسى في واحدٍ من الاستعلامات.
 */

/** من يعتمد بريد خدمةٍ ما — بالاسم لا بالمسمّى الوظيفي ولا بالدور. */
export async function getMailApproverSettings() {
  await requirePermission("manage_mail_settings");

  const [services, employees, approvers] = await Promise.all([
    listServiceNames(),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.mailApprover.findMany({ select: { serviceName: true, employeeId: true } }),
  ]);

  return { services, employees, approvers };
}

/** استبدالٌ كامل لمعمِّدي خدمةٍ واحدة — القائمة المعروضة هي القائمة المحفوظة. */
export async function setMailApprovers(serviceName: string, employeeIds: string[]) {
  await requirePermission("manage_mail_settings");

  const name = (serviceName ?? "").trim();
  if (!name) throw new Error("اسم الخدمة مطلوب");

  const known = await listServiceNames();
  if (!known.includes(name)) throw new Error("خدمة غير معروفة");

  const ids = [...new Set((employeeIds ?? []).filter(Boolean))];
  if (ids.length > 0) {
    const found = await prisma.employee.count({ where: { id: { in: ids }, isActive: true } });
    if (found !== ids.length) throw new Error("أحد الموظفين غير موجود أو موقوف");
  }

  await prisma.$transaction([
    prisma.mailApprover.deleteMany({ where: { serviceName: name } }),
    ...(ids.length
      ? [prisma.mailApprover.createMany({ data: ids.map((employeeId) => ({ employeeId, serviceName: name })) })]
      : []),
  ]);

  revalidatePath("/main/mail");
  return { success: true, count: ids.length };
}

/** الخدمات التي أعتمد بريدها. */
export async function getMyApproverServices(): Promise<string[]> {
  const user = await requireEmployee();
  const rows = await prisma.mailApprover.findMany({
    where: { employeeId: user.id },
    select: { serviceName: true },
  });
  return rows.map((r) => r.serviceName);
}

/**
 * هل يحتاج بريد هذه الخدمة تعميداً من هذا المرسِل؟
 *
 * المعمِّد لا يعمّد نفسه: اشتراط ذلك يوقف بريده على زميلٍ له نفس الصلاحية، أو
 * يوقفه على نفسه إن كان وحده — وكلاهما عبثٌ لا حماية.
 */
export async function serviceNeedsApproval(serviceName: string, senderId: string) {
  // كل دالةٍ مُصدَّرة هنا مدخلٌ HTTP قائمٌ بذاته، فتحرس نفسها ولو كان نداؤها
  // الوحيد من فعلٍ محروسٍ أصلاً.
  await requireEmployee();

  const approvers = await prisma.mailApprover.findMany({
    where: { serviceName },
    select: { employeeId: true },
  });
  if (approvers.length === 0) return false;
  return !approvers.some((a) => a.employeeId === senderId);
}

/**
 * ما ينتظر التعميد — بشقّيه.
 *
 * `toApprove`: ما أنا معمِّده، في **خدماتي وجمعياتي المسنَدة** (القرار ٤). فلا
 * يرى معمِّدٌ بريد جمعيةٍ ليست له وإن كانت الخدمة خدمته.
 * `mine`: بريدي أنا الموقوف عند غيري — لأعرف أين وقف بدل أن أظنّه أُرسل.
 */
export async function getPendingApprovalMails() {
  const user = await requireEmployee();

  const services = await getMyApproverServices();
  const assigned = await getAssignedCharityIds(user.id, user.role, user.permissions);

  const include = {
    sender: { select: { id: true, name: true, avatarUrl: true } },
    charity: { select: { id: true, name: true } },
    attachments: true,
  } as const;

  const toApprove =
    services.length === 0
      ? []
      : await prisma.internalMail.findMany({
          where: {
            approvalState: "PENDING",
            serviceName: { in: services },
            ...(assigned === null ? {} : { charityId: { in: assigned } }),
          },
          include,
          orderBy: { createdAt: "desc" },
        });

  const mine = await prisma.internalMail.findMany({
    where: { approvalState: "PENDING", senderId: user.id },
    include,
    orderBy: { createdAt: "desc" },
  });

  return { toApprove, mine };
}

/** المعمِّد يتصرف في هذه الرسالة؟ نطاقه خدمته وجمعياته المسنَدة. */
async function requireApprovalAuthority(mailId: string) {
  const user = await requireEmployee();

  const mail = await prisma.internalMail.findUnique({
    where: { id: mailId },
    select: {
      id: true,
      subject: true,
      body: true,
      senderId: true,
      serviceName: true,
      charityId: true,
      approvalState: true,
    },
  });
  if (!mail || mail.approvalState !== "PENDING") throw new Error("الرسالة ليست بانتظار التعميد");
  if (!mail.serviceName || !mail.charityId) throw new Error("رسالة غير صالحة للتعميد");

  const isApprover = await prisma.mailApprover.findUnique({
    where: { employeeId_serviceName: { employeeId: user.id, serviceName: mail.serviceName } },
    select: { employeeId: true },
  });
  if (!isApprover) throw new Error("لست معمِّداً لهذه الخدمة");

  const assigned = await getAssignedCharityIds(user.id, user.role, user.permissions);
  if (assigned !== null && !assigned.includes(mail.charityId)) {
    throw new Error("هذه الجمعية ليست مسنَدة إليك");
  }

  return { user, mail };
}

/**
 * اعتماد الرسالة: هنا **تُخلق صفوف الاستلام** لأول مرة.
 *
 * وتُحسب من التفويض الحالي لا من تفويضٍ قديم: بين الكتابة والتعميد قد يُفوَّض
 * عضوٌ أو يُسحب تفويضه، والصحيح هو من يملك الخدمة لحظة الوصول.
 *
 * وللمعمِّد أن يعدّل الموضوع والنص قبل الاعتماد — «تعديلٌ ثم إرسال» في مسارٍ
 * واحد، لا نسخةٌ ثانية من الرسالة.
 */
export async function approveMail(mailId: string, edits?: { subject?: string; body?: string }) {
  const { user, mail } = await requireApprovalAuthority(mailId);

  const delegations = await prisma.charityMemberService.findMany({
    where: {
      serviceName: mail.serviceName as string,
      membership: { isActive: true, charityId: mail.charityId as string },
    },
    select: { membership: { select: { charityUserId: true } } },
  });

  const recipientIds = [...new Set(delegations.map((d) => d.membership.charityUserId))];
  if (recipientIds.length === 0) {
    throw new Error(`لا أحد مفوَّض بخدمة «${mail.serviceName}» في هذه الجمعية — تعذّر التسليم`);
  }

  await prisma.internalMail.update({
    where: { id: mail.id },
    data: {
      subject: edits?.subject?.trim() ? edits.subject.trim() : mail.subject,
      body: edits?.body ? sanitizeMailHtml(edits.body) : mail.body,
      approvalState: "APPROVED",
      approvedById: user.id,
      approvedAt: new Date(),
      returnNote: null,
      recipients: {
        create: recipientIds.map((charityUserId) => ({
          charityUserId,
          charityId: mail.charityId as string,
          type: "TO",
        })),
      },
    },
  });

  revalidatePath("/main/mail");
  return { success: true, delivered: recipientIds.length };
}

/**
 * الإرجاع: تعود الرسالة **مسودةً عند صاحبها** ومعها ملاحظة المعمِّد.
 *
 * لا تُحذف ولا تبقى معلّقة في مكانٍ ثالث: صاحبها يفتحها من «المسودات» كما
 * تركها، فيصحّح ويرسل من جديد.
 */
export async function returnMail(mailId: string, note: string) {
  const { user, mail } = await requireApprovalAuthority(mailId);

  const trimmed = (note ?? "").trim();
  if (!trimmed) throw new Error("اكتب سبب الإرجاع");

  await prisma.internalMail.update({
    where: { id: mail.id },
    data: {
      approvalState: "RETURNED",
      approvedById: user.id,
      approvedAt: new Date(),
      returnNote: trimmed,
      isDraft: true,
      // الجمعية تعود إلى المسودة كما اختارها صاحبها، فتفتح النافذة على حالها.
      draftCharityIds: [mail.charityId as string],
    },
  });

  revalidatePath("/main/mail");
  return { success: true };
}
