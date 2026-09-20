"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sanitizeMailHtml } from "@/lib/sanitizeMail";
import { requireCharityMembership } from "@/lib/guards";
import { hasCharityPermission } from "@/lib/charityPermissions";
import { isDelivered, serviceConversationRecipients } from "@/lib/serviceTeams";

type AttachmentInput = { fileUrl: string; fileName: string; fileSize?: number | null };

/**
 * بريد بوابة الجمعيات — منفصلٌ عن actions/mail.ts عمداً.
 *
 * كل فعلٍ هناك يبدأ بـ getAuthenticatedUser ويعامل المستخدم على أنه موظف زاد،
 * وتوسيعه ليقبل الطرفين كان يعني شرطاً في كل استعلام ونسياناً في واحدٍ منها.
 * وهنا يبدأ كل فعلٍ من الجمعية التي في الرابط، فالنطاق شرطٌ في المدخل لا في
 * كل سطر.
 */

/**
 * سياق الصفحة: الجمعية من اسم الرابط، والعضوية منها لا من الجلسة.
 *
 * `session.charityId` هي «الجمعية النشطة» لحسابٍ قد يخدم جمعياتٍ عدّة، فلو
 * بُني الصندوق عليها لرأى العضو في صفحة جمعيةٍ بريدَ أخرى. والاسم في الرابط هو
 * ما تراه عينه، فهو المرجع.
 */
async function requirePortalContext(charityName: string) {
  const name = decodeURIComponent(charityName);
  const charity = await prisma.charity.findUnique({
    where: { name },
    select: { id: true, name: true, mailRequiresApproval: true },
  });
  if (!charity) throw new Error("غير مصرح");

  const membership = await requireCharityMembership(charity.id);

  // معمِّدو هذه الجمعية — مفتاحهم (عضو + جمعية)، فمعمِّدٌ هنا ليس معمِّداً هناك.
  const isApprover =
    (await prisma.charityMailApprover.count({
      where: { charityId: charity.id, charityUserId: membership.session.id },
    })) > 0;

  return { charity, isApprover, ...membership };
}

/** تصفية نصّية على الرسالة: موضوعها ونصّها والطرف الآخر واسم الخدمة. */
function portalSearchFilter(query: string) {
  const q = query.trim();
  if (!q) return undefined;
  const text = { contains: q, mode: "insensitive" as const };
  return {
    OR: [
      { subject: text },
      { body: text },
      { serviceName: text },
      { sender: { name: text } },
      { senderCharityUser: { name: text } },
      { recipients: { some: { charityUser: { name: text } } } },
      { recipients: { some: { employee: { name: text } } } },
    ],
  };
}

const PORTAL_MAIL_INCLUDE = {
  sender: { select: { id: true, name: true, avatarUrl: true } },
  senderCharityUser: { select: { id: true, name: true } },
  charity: { select: { id: true, name: true } },
  attachments: true,
  recipients: {
    select: {
      type: true,
      employeeId: true,
      employee: { select: { id: true, name: true } },
      charityUserId: true,
      charityUser: { select: { id: true, name: true } },
    },
  },
} as const;

/**
 * من يمكن مراسلته من داخل البوابة: زملاء هذه الجمعية، أو خدمات زاد.
 *
 * الزملاء من عضويات هذه الجمعية النشطة وحدها — لا من الحساب، فعضوٌ في جمعيتين
 * لا تظهر له أسماء الأخرى هنا. والخدمات هي المفوَّض بها في هذه الجمعية (القرار
 * ٣)، ومدير الجمعية مرتبطٌ بخدماتها جميعاً كما في بقية تبويبات البوابة.
 */
export async function getPortalMailOptions(charityName: string) {
  const ctx = await requirePortalContext(charityName);

  const memberships = await prisma.charityUserCharity.findMany({
    where: {
      charityId: ctx.charity.id,
      isActive: true,
      charityUserId: { not: ctx.session.id },
      user: { isActive: true },
    },
    select: { user: { select: { id: true, name: true, title: true } } },
    orderBy: { user: { name: "asc" } },
  });

  let services: string[];
  if (ctx.isAdmin) {
    const rows = await prisma.service.findMany({
      where: { charityId: ctx.charity.id },
      select: { name: true },
      distinct: ["name"],
      orderBy: { name: "asc" },
    });
    services = rows.map((r) => r.name).filter((n) => n.trim() !== "");
  } else {
    services = [...ctx.services].sort();
  }

  return {
    colleagues: memberships.map((m) => m.user),
    services,
    // حال التعميد يُقال للمرسِل قبل أن يكتب، لا بعد أن يضغط «إرسال».
    requiresApproval: ctx.charity.mailRequiresApproval,
    isApprover: ctx.isApprover,
  };
}

/** الوارد: ما وصلني **في هذه الجمعية**. */
export async function getPortalInbox(charityName: string, page = 1, limit = 20, search = "") {
  const ctx = await requirePortalContext(charityName);
  const skip = (page - 1) * limit;
  const mailFilter = portalSearchFilter(search);

  const where = {
    charityUserId: ctx.session.id,
    // نطاق الصندوق. بلا هذا الشرط يرى العضو في صفحة جمعيةٍ بريدَ عضويته الأخرى.
    charityId: ctx.charity.id,
    isDeleted: false,
    ...(mailFilter ? { mail: mailFilter } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.mailRecipient.findMany({
      where,
      include: { mail: { include: PORTAL_MAIL_INCLUDE } },
      orderBy: { mail: { createdAt: "desc" } },
      skip,
      take: limit,
    }),
    prisma.mailRecipient.count({ where }),
  ]);

  return { mails: rows, total, totalPages: Math.ceil(total / limit) };
}

/** المُرسَل: ما أرسلتُه **من هذه الجمعية**. */
export async function getPortalSent(charityName: string, page = 1, limit = 20, search = "") {
  const ctx = await requirePortalContext(charityName);
  const skip = (page - 1) * limit;

  const where = {
    senderCharityUserId: ctx.session.id,
    charityId: ctx.charity.id,
    isDraft: false,
    isDeletedBySender: false,
    // ما لم يُعتمد بعد لم يُرسل، وما أُرجع لم يُرسل كذلك.
    approvalState: { in: ["NONE", "APPROVED"] },
    ...(portalSearchFilter(search) ?? {}),
  };

  const [mails, total] = await Promise.all([
    prisma.internalMail.findMany({
      where,
      include: PORTAL_MAIL_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.internalMail.count({ where }),
  ]);

  return { mails, total, totalPages: Math.ceil(total / limit) };
}

/** عدد غير المقروء في هذه الجمعية وحدها. */
export async function getPortalUnreadCount(charityName: string) {
  const ctx = await requirePortalContext(charityName);
  return prisma.mailRecipient.count({
    where: {
      charityUserId: ctx.session.id,
      charityId: ctx.charity.id,
      isDeleted: false,
      isRead: false,
    },
  });
}

/**
 * فتح رسالةٍ بمعرّفها.
 *
 * لا يكفي أن أكون مستلمها: يُشترط أن يكون صفّ استلامي **في جمعية هذه الصفحة**.
 * وإلا كان معرّفٌ منسوخٌ من رابط جمعيةٍ كافياً لقراءة بريد الأخرى.
 */
export async function getPortalMail(charityName: string, mailId: string) {
  const ctx = await requirePortalContext(charityName);

  const include = {
    ...PORTAL_MAIL_INCLUDE,
    replies: { include: PORTAL_MAIL_INCLUDE, orderBy: { createdAt: "asc" as const } },
  };

  const requested = await prisma.internalMail.findUnique({ where: { id: mailId }, include });
  if (!requested || requested.charityId !== ctx.charity.id) throw new Error("غير مصرح");

  const isSender = requested.senderCharityUserId === ctx.session.id;
  const isRecipient = requested.recipients.some((r) => r.charityUserId === ctx.session.id);
  if (!isSender && !isRecipient) throw new Error("غير مصرح");

  if (isRecipient) {
    await prisma.mailRecipient.updateMany({
      where: {
        mailId: requested.id,
        charityUserId: ctx.session.id,
        charityId: ctx.charity.id,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  // كل ردٍّ معلّقٌ بجذر السلسلة، فتُعرض المحادثة من أولها أياً كانت الرسالة
  // المفتوحة. والجذر يُشترط أن يكون في جمعية الصفحة كذلك.
  const root = requested.parentId
    ? await prisma.internalMail.findUnique({ where: { id: requested.parentId }, include })
    : requested;
  const mail = root && root.charityId === ctx.charity.id ? root : requested;

  // محادثة الخدمة للفريق كله: كل ردٍّ سُلّم يظهر لأعضائه. ومراسلة الزملاء تبقى
  // لأطرافها: لا يرى العضو فيها إلا ما كتبه أو وصله.
  const isTeamThread = !!mail.serviceName;
  mail.replies = mail.replies.filter(
    (r) =>
      isDelivered(r) &&
      (isTeamThread ||
        r.senderCharityUserId === ctx.session.id ||
        r.recipients.some((x) => x.charityUserId === ctx.session.id))
  );

  return { ...mail, openedId: requested.id };
}

/** نقل الوارد إلى المهملات — صفّي أنا، في هذه الجمعية. */
export async function deletePortalMail(charityName: string, mailId: string) {
  const ctx = await requirePortalContext(charityName);
  await prisma.mailRecipient.updateMany({
    where: { mailId, charityUserId: ctx.session.id, charityId: ctx.charity.id },
    data: { isDeleted: true },
  });
  revalidatePath(`/portal/${encodeURIComponent(ctx.charity.name)}/mail`);
  return { success: true };
}

/**
 * إرسال بريدٍ من داخل البوابة: إلى زملاء الجمعية، أو إلى خدمةٍ من خدمات زاد.
 *
 * الرسالة في الحالتين تحمل `charityId` جمعية المرسِل، فيعرف موظف زاد من أين
 * جاءه البريد، ويبقى صندوق العضو مقصوراً على جمعيةٍ واحدة.
 */
export async function sendPortalMail(
  charityName: string,
  data: {
    subject: string;
    body: string;
    kind: "COLLEAGUES" | "SERVICE";
    toIds?: string[];
    serviceName?: string;
    attachments?: AttachmentInput[];
    parentId?: string;
    /** إعادة إرسال رسالةٍ أُرجعت: تُحذف القديمة بعد أن تُنشأ الجديدة. */
    resendOf?: string;
  }
) {
  const ctx = await requirePortalContext(charityName);
  const cleanBody = sanitizeMailHtml(data.body);
  const attachments = data.attachments ?? [];

  // الردّ يُعلَّق بجذر السلسلة لا بالرسالة التي قبله، فتبقى المحادثة واحدة.
  let rootParentId = data.parentId;
  if (rootParentId) {
    const parent = await prisma.internalMail.findUnique({
      where: { id: rootParentId },
      select: { parentId: true, charityId: true },
    });
    // ردٌّ على رسالةٍ ليست في هذه الجمعية لا معنى له، وهو تسريبٌ لو قُبل.
    if (!parent || parent.charityId !== ctx.charity.id) throw new Error("غير مصرح");
    if (parent.parentId) rootParentId = parent.parentId;
  }

  let recipientsData: { employeeId?: string; charityUserId?: string; charityId?: string; type: string }[];
  let addressedAs: string;
  let serviceName: string | null = null;

  if (data.kind === "COLLEAGUES") {
    const toIds = [...new Set((data.toIds ?? []).filter(Boolean))];
    if (toIds.length === 0) throw new Error("يجب تحديد مستلم واحد على الأقل");

    // العضوية تُتحقَّق في هذه الجمعية: معرّفُ زميلٍ من جمعيةٍ أخرى لا يُقبل.
    const members = await prisma.charityUserCharity.findMany({
      where: { charityId: ctx.charity.id, isActive: true, charityUserId: { in: toIds } },
      select: { charityUserId: true },
    });
    if (members.length !== toIds.length) throw new Error("أحد المستلمين ليس عضواً في هذه الجمعية");

    recipientsData = members.map((m) => ({
      charityUserId: m.charityUserId,
      charityId: ctx.charity.id,
      type: "TO",
    }));
    addressedAs = "PERSON";
  } else {
    const name = (data.serviceName ?? "").trim();
    if (!name) throw new Error("اختر الخدمة التي تريد مراسلتها");

    // الخدمات المفوَّض بها العضو في هذه الجمعية وحدها (القرار ٣).
    const allowed = ctx.isAdmin
      ? (
          await prisma.service.findMany({
            where: { charityId: ctx.charity.id },
            select: { name: true },
            distinct: ["name"],
          })
        ).map((r) => r.name)
      : ctx.services;
    if (!allowed.includes(name)) throw new Error("لست مفوَّضاً بهذه الخدمة");

    // موظفو زاد الحاملون للخدمة في «إلى»، وزملاء الكاتب المفوَّضون بها في «نسخة».
    recipientsData = await serviceConversationRecipients({
      serviceName: name,
      charityId: ctx.charity.id,
      author: { kind: "CHARITY_USER", id: ctx.session.id },
    });
    addressedAs = "SERVICE";
    serviceName = name;
  }

  // تعميد الصادر: علَمٌ لكل جمعية (القرار ٥). والمعمِّد لا يُعمَّد عليه بريده.
  const needsApproval = ctx.charity.mailRequiresApproval && !ctx.isApprover;

  const mail = await prisma.internalMail.create({
    data: {
      subject: data.subject || "(بدون موضوع)",
      body: cleanBody,
      senderKind: "CHARITY_USER",
      senderCharityUserId: ctx.session.id,
      charityId: ctx.charity.id,
      serviceName,
      addressedAs,
      parentId: rootParentId,
      approvalState: needsApproval ? "PENDING" : "NONE",
      // الرسالة المنتظرة بلا صفوف استلام، فلا تُقرأ قبل أن تُعتمد. ومن كان
      // مقصوداً بها يُحفظ هنا حتى تُخلق صفوفه عند الاعتماد.
      draftCharityUserIds:
        needsApproval && addressedAs === "PERSON"
          ? recipientsData.map((r) => r.charityUserId).filter((id): id is string => !!id)
          : [],
      recipients: needsApproval ? undefined : { create: recipientsData },
      attachments: attachments.length
        ? {
            create: attachments.map((a) => ({
              fileUrl: a.fileUrl,
              fileName: a.fileName,
              fileSize: a.fileSize ?? null,
            })),
          }
        : undefined,
    },
    select: { id: true },
  });

  // الرسالة المُرجَعة انتهت مهمتها بمجرد أن حلّت محلها الجديدة.
  if (data.resendOf) {
    await prisma.internalMail.deleteMany({
      where: {
        id: data.resendOf,
        senderCharityUserId: ctx.session.id,
        charityId: ctx.charity.id,
        approvalState: "RETURNED",
      },
    });
  }

  revalidatePath(`/portal/${encodeURIComponent(ctx.charity.name)}/mail`);
  return { id: mail.id, pending: needsApproval };
}

/**
 * إعدادات بريد الجمعية: أتشترط التعميد؟ ومن يعمّد؟
 *
 * الافتراضي ألّا تشترط، فلا ينقطع شيء عند النشر. ولكل جمعيةٍ قرارها: هذه
 * الصفحة لا تُظهر ولا تُعدّل إلا جمعية الرابط.
 */
export async function getCharityMailSettings(charityName: string) {
  const ctx = await requirePortalContext(charityName);
  if (!hasCharityPermission(ctx.isAdmin, ctx.permissions, "manage_charity_mail")) {
    throw new Error("غير مصرح");
  }

  const [members, approvers] = await Promise.all([
    prisma.charityUserCharity.findMany({
      where: { charityId: ctx.charity.id, isActive: true, user: { isActive: true } },
      select: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.charityMailApprover.findMany({
      where: { charityId: ctx.charity.id },
      select: { charityUserId: true },
    }),
  ]);

  return {
    requiresApproval: ctx.charity.mailRequiresApproval,
    members: members.map((m) => m.user),
    approverIds: approvers.map((a) => a.charityUserId),
  };
}

export async function setCharityMailApproval(charityName: string, enabled: boolean) {
  const ctx = await requirePortalContext(charityName);
  if (!hasCharityPermission(ctx.isAdmin, ctx.permissions, "manage_charity_mail")) {
    throw new Error("غير مصرح");
  }

  if (enabled) {
    // تفعيلٌ بلا معمِّد يوقف كل صادر الجمعية عند لا أحد.
    const count = await prisma.charityMailApprover.count({ where: { charityId: ctx.charity.id } });
    if (count === 0) throw new Error("عيّن معمِّداً واحداً على الأقل قبل تفعيل التعميد");
  }

  await prisma.charity.update({
    where: { id: ctx.charity.id },
    data: { mailRequiresApproval: enabled },
  });

  revalidatePath(`/portal/${encodeURIComponent(ctx.charity.name)}/mail`);
  return { success: true };
}

export async function setCharityMailApprovers(charityName: string, userIds: string[]) {
  const ctx = await requirePortalContext(charityName);
  if (!hasCharityPermission(ctx.isAdmin, ctx.permissions, "manage_charity_mail")) {
    throw new Error("غير مصرح");
  }

  const ids = [...new Set((userIds ?? []).filter(Boolean))];
  if (ids.length > 0) {
    // عضوية هذه الجمعية شرطٌ: معمِّدٌ من جمعيةٍ أخرى ليس معمِّداً هنا.
    const found = await prisma.charityUserCharity.count({
      where: { charityId: ctx.charity.id, isActive: true, charityUserId: { in: ids } },
    });
    if (found !== ids.length) throw new Error("أحد المعمِّدين ليس عضواً نشطاً في الجمعية");
  }

  await prisma.$transaction([
    prisma.charityMailApprover.deleteMany({ where: { charityId: ctx.charity.id } }),
    ...(ids.length
      ? [
          prisma.charityMailApprover.createMany({
            data: ids.map((charityUserId) => ({ charityUserId, charityId: ctx.charity.id })),
          }),
        ]
      : []),
    // آخر معمِّدٍ يُنزع يُطفئ الاشتراط: وإلا وقف الصادر عند لا أحد.
    ...(ids.length
      ? []
      : [
          prisma.charity.update({
            where: { id: ctx.charity.id },
            data: { mailRequiresApproval: false },
          }),
        ]),
  ]);

  revalidatePath(`/portal/${encodeURIComponent(ctx.charity.name)}/mail`);
  return { success: true, count: ids.length };
}

/** ما ينتظر تعميدي، وما وقف لي عند غيري، وما أُرجع إليّ. */
export async function getPortalPendingMails(charityName: string) {
  const ctx = await requirePortalContext(charityName);

  const include = {
    senderCharityUser: { select: { id: true, name: true } },
    attachments: true,
    recipients: {
      select: { charityUser: { select: { id: true, name: true } } },
    },
  } as const;

  const [toApprove, mine] = await Promise.all([
    ctx.isApprover
      ? prisma.internalMail.findMany({
          where: {
            charityId: ctx.charity.id,
            senderKind: "CHARITY_USER",
            approvalState: "PENDING",
          },
          include,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.internalMail.findMany({
      where: {
        charityId: ctx.charity.id,
        senderCharityUserId: ctx.session.id,
        approvalState: { in: ["PENDING", "RETURNED"] },
      },
      include,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { isApprover: ctx.isApprover, toApprove, mine };
}

/** المعمِّد يتصرف في رسالةٍ من صادر جمعيته. */
async function requirePortalApproval(charityName: string, mailId: string) {
  const ctx = await requirePortalContext(charityName);
  if (!ctx.isApprover) throw new Error("لست معمِّداً لبريد هذه الجمعية");

  const mail = await prisma.internalMail.findUnique({
    where: { id: mailId },
    select: {
      id: true,
      subject: true,
      body: true,
      charityId: true,
      serviceName: true,
      addressedAs: true,
      approvalState: true,
      draftCharityUserIds: true,
      senderCharityUserId: true,
    },
  });
  if (!mail || mail.charityId !== ctx.charity.id || mail.approvalState !== "PENDING") {
    throw new Error("الرسالة ليست بانتظار التعميد");
  }

  return { ctx, mail };
}

/** الاعتماد: هنا تُخلق صفوف الاستلام، من الواقع الحالي لا من واقع الكتابة. */
export async function approvePortalMail(
  charityName: string,
  mailId: string,
  edits?: { subject?: string; body?: string }
) {
  const { ctx, mail } = await requirePortalApproval(charityName, mailId);

  let recipientsData: { employeeId?: string; charityUserId?: string; charityId?: string; type: string }[];

  if (mail.addressedAs === "SERVICE") {
    recipientsData = await serviceConversationRecipients({
      serviceName: mail.serviceName ?? "",
      charityId: ctx.charity.id,
      author: { kind: "CHARITY_USER", id: mail.senderCharityUserId as string },
    });
  } else {
    // العضوية تُراجَع الآن: من خرج من الجمعية بين الكتابة والتعميد لا يستلم.
    const members = await prisma.charityUserCharity.findMany({
      where: {
        charityId: ctx.charity.id,
        isActive: true,
        charityUserId: { in: mail.draftCharityUserIds },
      },
      select: { charityUserId: true },
    });
    if (members.length === 0) throw new Error("لم يبق من مستلمي الرسالة أحدٌ في الجمعية");
    recipientsData = members.map((m) => ({
      charityUserId: m.charityUserId,
      charityId: ctx.charity.id,
      type: "TO",
    }));
  }

  await prisma.internalMail.update({
    where: { id: mail.id },
    data: {
      subject: edits?.subject?.trim() ? edits.subject.trim() : mail.subject,
      body: edits?.body ? sanitizeMailHtml(edits.body) : mail.body,
      approvalState: "APPROVED",
      approvedByCharityUserId: ctx.session.id,
      approvedAt: new Date(),
      returnNote: null,
      draftCharityUserIds: [],
      recipients: { create: recipientsData },
    },
  });

  revalidatePath(`/portal/${encodeURIComponent(ctx.charity.name)}/mail`);
  return { success: true, delivered: recipientsData.length };
}

/** الإرجاع: تعود الرسالة إلى صاحبها بملاحظة، يعدّلها ويرسلها من جديد. */
export async function returnPortalMail(charityName: string, mailId: string, note: string) {
  const { ctx, mail } = await requirePortalApproval(charityName, mailId);

  const trimmed = (note ?? "").trim();
  if (!trimmed) throw new Error("اكتب سبب الإرجاع");

  await prisma.internalMail.update({
    where: { id: mail.id },
    data: {
      approvalState: "RETURNED",
      approvedByCharityUserId: ctx.session.id,
      approvedAt: new Date(),
      returnNote: trimmed,
    },
  });

  revalidatePath(`/portal/${encodeURIComponent(ctx.charity.name)}/mail`);
  return { success: true };
}
