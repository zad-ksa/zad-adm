"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeMailHtml } from "@/lib/sanitizeMail";
import { getEmployeeServiceNames, listServiceNames } from "@/app/actions/serviceAccess";
import { getAssignedCharityIds } from "@/lib/access";
import { getNoApproverMessage, resolveApprovalRoute } from "@/app/actions/mailApproval";
import { isDelivered, serviceConversationRecipients } from "@/lib/serviceTeams";

async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session || !session.id) {
    throw new Error("غير مصرح لك بالوصول");
  }
  return session;
}

function buildRecipientsData(data: { toIds: string[]; ccIds?: string[]; bccIds?: string[] }) {
  const recipientsData: { employeeId: string; type: string }[] = [];

  data.toIds.forEach((id) => {
    recipientsData.push({ employeeId: id, type: "TO" });
  });

  data.ccIds?.forEach((id) => {
    if (!recipientsData.find((r) => r.employeeId === id)) {
      recipientsData.push({ employeeId: id, type: "CC" });
    }
  });

  data.bccIds?.forEach((id) => {
    if (!recipientsData.find((r) => r.employeeId === id)) {
      recipientsData.push({ employeeId: id, type: "BCC" });
    }
  });

  return recipientsData;
}

/**
 * Free-text filter over an `InternalMail`. Matches the subject, the body and
 * the name of whoever is on the other side of the message.
 *
 * The body is stored as sanitized HTML, so a Latin query can in principle hit a
 * tag name rather than prose. Arabic queries — effectively all of them here —
 * cannot, and stripping tags in SQL would cost a sequential scan, so the raw
 * column is searched as-is.
 */
function mailSearchFilter(query: string, side: "sender" | "recipients") {
  const q = query.trim();
  if (!q) return undefined;

  const text = { contains: q, mode: "insensitive" as const };
  // الطرف الآخر قد يكون موظفاً أو عضو جمعية، والبريد من زاد يُعرف باسم خدمته
  // وجمعيته لا باسم شخص — فالبحث يشمل الثلاثة وإلا بحث المستخدم عمّا يراه فلا يجده.
  const people =
    side === "sender"
      ? [{ sender: { name: text } }, { senderCharityUser: { name: text } }]
      : [
          { recipients: { some: { employee: { name: text } } } },
          { recipients: { some: { charityUser: { name: text } } } },
        ];

  return {
    OR: [
      { subject: text },
      { body: text },
      { serviceName: text },
      { charity: { name: text } },
      ...people,
    ],
  };
}

export async function sendMail(data: {
  subject: string;
  body: string;
  toIds: string[];
  ccIds?: string[];
  bccIds?: string[];
  attachments?: { fileUrl: string; fileName: string; fileSize?: number }[];
  parentId?: string;
  draftId?: string;
}) {
  const user = await getAuthenticatedUser();

  const recipientsData = buildRecipientsData(data);

  // At least one recipient of ANY kind, rather than specifically a TO.
  //
  // A blind-copy-only message is a real thing to want: one notice, sent to
  // thirty people, each of whom sees it addressed to them alone and cannot
  // see the other twenty-nine. Demanding a visible recipient forced the
  // sender to put somebody in the open just to satisfy the form.
  if (recipientsData.length === 0) {
    throw new Error("يجب تحديد مستلم واحد على الأقل");
  }
  const cleanBody = sanitizeMailHtml(data.body);

  // Anchor every reply to the thread root so multi-level replies stay in one conversation
  let rootParentId = data.parentId;
  if (rootParentId) {
    const parent = await prisma.internalMail.findUnique({
      where: { id: rootParentId },
      select: { parentId: true },
    });
    rootParentId = parent?.parentId ?? rootParentId;
  }

  // Sending a draft converts the existing row instead of creating a new one
  if (data.draftId) {
    const draft = await prisma.internalMail.findUnique({ where: { id: data.draftId } });
    if (!draft || draft.senderId !== user.id || !draft.isDraft) {
      throw new Error("المسودة غير موجودة");
    }

    const mail = await prisma.internalMail.update({
      where: { id: data.draftId },
      data: {
        subject: data.subject,
        body: cleanBody,
        parentId: rootParentId,
        isDraft: false,
        draftToIds: [],
        draftCcIds: [],
        draftBccIds: [],
        recipients: { create: recipientsData },
      },
    });

    // The draft already carries rows for everything the composer uploaded, so
    // creating them again here would double every attachment on the sent mail.
    await syncAttachments(mail.id, data.attachments ?? []);

    revalidatePath("/main/mail");
    return mail;
  }

  const mail = await prisma.internalMail.create({
    data: {
      subject: data.subject,
      body: cleanBody,
      senderId: user.id,
      parentId: rootParentId,
      recipients: {
        create: recipientsData,
      },
      attachments: data.attachments?.length
        ? {
            create: data.attachments,
          }
        : undefined,
    },
  });

  revalidatePath("/main/mail");
  return mail;
}

type AttachmentInput = { fileUrl: string; fileName: string; fileSize?: number | null };

/**
 * Brings a mail's attachment rows in line with the set the composer holds.
 *
 * The composer uploads files as they are chosen and then sends the complete
 * desired set on every save, so this reconciles rather than appends: rows whose
 * file is no longer listed are dropped, and listed files without a row are
 * created. Appending instead would duplicate every attachment on each autosave
 * tick, and again when the draft is finally sent.
 *
 * Files are identified by `fileUrl` because that is the only stable identifier
 * shared between an uploaded file and the row created for it.
 */
async function syncAttachments(mailId: string, desired: AttachmentInput[] | undefined) {
  if (!desired) return;

  const urls = desired.map((a) => a.fileUrl);

  await prisma.mailAttachment.deleteMany({
    where: { mailId, fileUrl: { notIn: urls.length ? urls : ["__none__"] } },
  });

  const existing = await prisma.mailAttachment.findMany({
    where: { mailId },
    select: { fileUrl: true },
  });
  const have = new Set(existing.map((e) => e.fileUrl));

  const missing = desired.filter((a) => !have.has(a.fileUrl));
  if (missing.length) {
    await prisma.mailAttachment.createMany({
      data: missing.map((a) => ({
        mailId,
        fileUrl: a.fileUrl,
        fileName: a.fileName,
        fileSize: a.fileSize ?? null,
      })),
    });
  }
}

/**
 * Creates or updates a draft. Drafts have no MailRecipient rows yet — the
 * chosen recipients are stashed on the InternalMail row itself (draftToIds/
 * draftCcIds/draftBccIds) until the draft is actually sent via sendMail.
 *
 * ومسودة البريد إلى الجمعيات تُحفظ كذلك: الجمعيات في draftCharityIds والخدمة
 * في serviceName. وبلا هذا كان إغلاق النافذة يُبقي النص ويُسقط المُرسَل إليهم
 * صامتاً، فيُعاد فتح المسودة ناقصةً دون أن يُنبَّه صاحبها.
 */
export async function saveDraft(data: {
  id?: string;
  subject: string;
  body: string;
  toIds: string[];
  ccIds?: string[];
  bccIds?: string[];
  attachments?: AttachmentInput[];
  charityIds?: string[];
  serviceName?: string | null;
}) {
  const user = await getAuthenticatedUser();
  const cleanBody = sanitizeMailHtml(data.body);

  if (data.id) {
    const existing = await prisma.internalMail.findUnique({ where: { id: data.id } });
    if (!existing || existing.senderId !== user.id || !existing.isDraft) {
      throw new Error("غير مصرح لك بتعديل هذه المسودة");
    }

    const updated = await prisma.internalMail.update({
      where: { id: data.id },
      data: {
        subject: data.subject,
        body: cleanBody,
        draftToIds: data.toIds || [],
        draftCcIds: data.ccIds || [],
        draftBccIds: data.bccIds || [],
        draftCharityIds: data.charityIds || [],
        serviceName: data.serviceName ?? null,
        addressedAs: (data.charityIds || []).length > 0 ? "CHARITY" : "PERSON",
      },
    });
    await syncAttachments(updated.id, data.attachments);
    return updated;
  }

  const created = await prisma.internalMail.create({
    data: {
      subject: data.subject,
      body: cleanBody,
      senderId: user.id,
      isDraft: true,
      draftToIds: data.toIds || [],
      draftCcIds: data.ccIds || [],
      draftBccIds: data.bccIds || [],
      draftCharityIds: data.charityIds || [],
      serviceName: data.serviceName ?? null,
      addressedAs: (data.charityIds || []).length > 0 ? "CHARITY" : "PERSON",
    },
  });
  await syncAttachments(created.id, data.attachments);
  return created;
}

export async function getDrafts(page = 1, limit = 20, search = "") {
  const user = await getAuthenticatedUser();
  const skip = (page - 1) * limit;
  // A draft has no MailRecipient rows yet (recipients live in draftToIds), so
  // there is no name to join against — subject and body only.
  const q = search.trim();
  const where = {
    senderId: user.id,
    isDraft: true,
    ...(q
      ? {
          OR: [
            { subject: { contains: q, mode: "insensitive" as const } },
            { body: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [mails, total] = await Promise.all([
    prisma.internalMail.findMany({
      where,
      include: { attachments: true, charity: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.internalMail.count({ where }),
  ]);

  return { mails, total, totalPages: Math.ceil(total / limit) };
}

export async function deleteDraft(id: string) {
  const user = await getAuthenticatedUser();

  const draft = await prisma.internalMail.findUnique({ where: { id } });
  if (!draft || draft.senderId !== user.id || !draft.isDraft) {
    throw new Error("غير مصرح لك بحذف هذه المسودة");
  }

  await prisma.internalMail.delete({ where: { id } });
  revalidatePath("/main/mail");
  return { success: true };
}

export async function getInbox(page = 1, limit = 20, search = "") {
  const user = await getAuthenticatedUser();
  const skip = (page - 1) * limit;
  const mailFilter = mailSearchFilter(search, "sender");
  const where = {
    employeeId: user.id,
    isDeleted: false,
    ...(mailFilter ? { mail: mailFilter } : {}),
  };

  const [mails, total] = await Promise.all([
    prisma.mailRecipient.findMany({
      where,
      include: {
        mail: {
          include: {
            sender: {
              select: { id: true, name: true, avatarUrl: true, role: true },
            },
            // بريدٌ من جمعية: مرسِله عضوٌ لا موظف. وبريدٌ من زاد إلى جمعية: يُعرض
            // باسم خدمته وجمعيته لا باسم كاتبه.
            senderCharityUser: { select: { id: true, name: true } },
            charity: { select: { id: true, name: true } },
            attachments: true,
            // للعمود "إلى" في قائمة البريد — يُغربَل بـ stripHiddenBcc أدناه فلا
            // يرى مستلم عادي (أو مَن نُسخ إليه خفيةً) غيرَه من أسماء النسخة المخفية.
            recipients: {
              select: {
                type: true,
                employeeId: true,
                employee: { select: { id: true, name: true } },
                charityUserId: true,
                charityUser: { select: { id: true, name: true } },
                charityId: true,
              },
            },
          },
        },
      },
      orderBy: {
        mail: {
          createdAt: "desc",
        },
      },
      skip,
      take: limit,
    }),
    prisma.mailRecipient.count({ where }),
  ]);

  // نسخة مخفية تخصّ غيرك تبقى مخفية حتى في قائمة الوارد، لا في صفحة الرسالة وحدها.
  for (const row of mails) stripHiddenBcc(row.mail, user.id);

  return { mails, total, totalPages: Math.ceil(total / limit) };
}

export async function getSentMails(page = 1, limit = 20, search = "") {
  const user = await getAuthenticatedUser();
  const skip = (page - 1) * limit;
  // On the sent side the sender is always you, so the useful name to match is
  // the recipient's.
  const where = {
    senderId: user.id,
    isDeletedBySender: false,
    isDraft: false,
    // الموقوف على التعميد لم يُرسل بعد، فمكانه «بانتظار التعميد» لا «المُرسَل».
    approvalState: { not: "PENDING" },
    ...(mailSearchFilter(search, "recipients") ?? {}),
  };

  const [mails, total] = await Promise.all([
    prisma.internalMail.findMany({
      where,
      include: {
        recipients: {
          include: {
            employee: {
              select: { id: true, name: true, avatarUrl: true },
            },
            charityUser: { select: { id: true, name: true } },
          },
        },
        charity: { select: { id: true, name: true } },
        attachments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.internalMail.count({ where }),
  ]);

  return { mails, total, totalPages: Math.ceil(total / limit) };
}

export async function getStarredMails(page = 1, limit = 20, search = "") {
  const user = await getAuthenticatedUser();
  const skip = (page - 1) * limit;
  const mailFilter = mailSearchFilter(search, "sender");
  const where = {
    employeeId: user.id,
    isStarred: true,
    isDeleted: false,
    ...(mailFilter ? { mail: mailFilter } : {}),
  };

  const [mails, total] = await Promise.all([
    prisma.mailRecipient.findMany({
      where,
      include: {
        mail: {
          include: {
            sender: {
              select: { id: true, name: true, avatarUrl: true, role: true },
            },
            // بريدٌ من جمعية: مرسِله عضوٌ لا موظف. وبريدٌ من زاد إلى جمعية: يُعرض
            // باسم خدمته وجمعيته لا باسم كاتبه.
            senderCharityUser: { select: { id: true, name: true } },
            charity: { select: { id: true, name: true } },
            attachments: true,
            // للعمود "إلى" في قائمة البريد — يُغربَل بـ stripHiddenBcc أدناه فلا
            // يرى مستلم عادي (أو مَن نُسخ إليه خفيةً) غيرَه من أسماء النسخة المخفية.
            recipients: {
              select: {
                type: true,
                employeeId: true,
                employee: { select: { id: true, name: true } },
                charityUserId: true,
                charityUser: { select: { id: true, name: true } },
                charityId: true,
              },
            },
          },
        },
      },
      orderBy: {
        mail: {
          createdAt: "desc",
        },
      },
      skip,
      take: limit,
    }),
    prisma.mailRecipient.count({ where }),
  ]);

  for (const row of mails) stripHiddenBcc(row.mail, user.id);

  return { mails, total, totalPages: Math.ceil(total / limit) };
}

export async function getTrashMails(page = 1, limit = 20, search = "") {
  const user = await getAuthenticatedUser();
  const skip = (page - 1) * limit;
  const mailFilter = mailSearchFilter(search, "sender");
  const where = {
    employeeId: user.id,
    isDeleted: true,
    ...(mailFilter ? { mail: mailFilter } : {}),
  };

  const [mails, total] = await Promise.all([
    prisma.mailRecipient.findMany({
      where,
      include: {
        mail: {
          include: {
            sender: {
              select: { id: true, name: true, avatarUrl: true, role: true },
            },
            // بريدٌ من جمعية: مرسِله عضوٌ لا موظف. وبريدٌ من زاد إلى جمعية: يُعرض
            // باسم خدمته وجمعيته لا باسم كاتبه.
            senderCharityUser: { select: { id: true, name: true } },
            charity: { select: { id: true, name: true } },
            attachments: true,
            // للعمود "إلى" في قائمة البريد — يُغربَل بـ stripHiddenBcc أدناه فلا
            // يرى مستلم عادي (أو مَن نُسخ إليه خفيةً) غيرَه من أسماء النسخة المخفية.
            recipients: {
              select: {
                type: true,
                employeeId: true,
                employee: { select: { id: true, name: true } },
                charityUserId: true,
                charityUser: { select: { id: true, name: true } },
                charityId: true,
              },
            },
          },
        },
      },
      orderBy: {
        mail: {
          createdAt: "desc",
        },
      },
      skip,
      take: limit,
    }),
    prisma.mailRecipient.count({ where }),
  ]);

  for (const row of mails) stripHiddenBcc(row.mail, user.id);

  return { mails, total, totalPages: Math.ceil(total / limit) };
}

const MAIL_THREAD_INCLUDE = {
  sender: {
    select: { id: true, name: true, avatarUrl: true, role: true },
  },
  senderCharityUser: { select: { id: true, name: true } },
  charity: { select: { id: true, name: true } },
  recipients: {
    include: {
      employee: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
      charityUser: { select: { id: true, name: true } },
    },
  },
  attachments: true,
  replies: {
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
      senderCharityUser: { select: { id: true, name: true } },
      charity: { select: { id: true, name: true } },
      recipients: {
        include: {
          employee: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
          charityUser: { select: { id: true, name: true } },
        },
      },
      attachments: true,
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} as const;

// المرسِل والمستلم قد يكونان فارغين: البريد قد يكون من عضو جمعية أو إليه.
function canViewMail(
  m: { senderId: string | null; recipients: { employeeId: string | null }[] },
  userId: string
) {
  return m.senderId === userId || m.recipients.some((r) => r.employeeId === userId);
}

/**
 * Drops blind-copy rows the viewer is not entitled to see.
 *
 * The view already rendered only TO and CC, but it filtered on the client: the
 * BCC names still travelled in the RSC payload and were readable from devtools
 * by anyone on the thread. Blind copy has to be blind at the source, so the
 * rows are removed here — only the sender, and the blind-copied person
 * themselves, keep them.
 */
function stripHiddenBcc<
  T extends { senderId: string | null; recipients: { employeeId: string | null; type: string }[] },
>(
  m: T,
  userId: string
): T {
  if (m.senderId === userId) return m;
  m.recipients = m.recipients.filter((r) => r.type !== "BCC" || r.employeeId === userId);
  return m;
}

export async function getMailById(id: string) {
  const user = await getAuthenticatedUser();

  const requested = await prisma.internalMail.findUnique({
    where: { id },
    include: MAIL_THREAD_INCLUDE,
  });

  if (!requested) {
    throw new Error("الرسالة غير موجودة");
  }

  // Ensure the user is either the sender or a recipient of the specific message requested
  if (!canViewMail(requested, user.id)) {
    throw new Error("غير مصرح لك بعرض هذه الرسالة");
  }

  // Every reply is anchored to the thread root (see sendMail), so load the root
  // to show the full conversation, pre-expanding whichever message was opened.
  const mail = requested.parentId
    ? await prisma.internalMail.findUnique({
        where: { id: requested.parentId },
        include: MAIL_THREAD_INCLUDE,
      }) ?? requested
    : requested;

  // Only surface replies the current user is actually a sender/recipient of —
  // getMailById previously returned every reply on the thread unfiltered.
  // ولا ما لم يُسلَّم بعد: ردٌّ ينتظر التعميد أو أُرجع يبدو في السلسلة كأنه وصل.
  mail.replies = mail.replies.filter((r) => isDelivered(r) && canViewMail(r, user.id));

  stripHiddenBcc(mail, user.id);
  mail.replies.forEach((r) => stripHiddenBcc(r, user.id));

  mail.body = sanitizeMailHtml(mail.body);
  mail.replies.forEach((r) => {
    r.body = sanitizeMailHtml(r.body);
  });

  return { ...mail, openedId: requested.id };
}

export async function markAsRead(mailId: string) {
  const user = await getAuthenticatedUser();

  await prisma.mailRecipient.updateMany({
    where: {
      mailId,
      employeeId: user.id,
    },
    data: {
      isRead: true,
    },
  });

  revalidatePath("/main/mail");
}

export async function toggleStar(mailId: string) {
  const user = await getAuthenticatedUser();

  const recipient = await prisma.mailRecipient.findFirst({
    where: {
      mailId,
      employeeId: user.id,
    },
  });

  if (recipient) {
    await prisma.mailRecipient.update({
      where: { id: recipient.id },
      data: {
        isStarred: !recipient.isStarred,
      },
    });
  }

  revalidatePath("/main/mail");
}

export async function moveToTrash(mailId: string) {
  const user = await getAuthenticatedUser();

  // Check if it's sent mail
  const sentMail = await prisma.internalMail.findFirst({
    where: {
      id: mailId,
      senderId: user.id,
    }
  });

  if (sentMail) {
    await prisma.internalMail.update({
      where: { id: mailId },
      data: { isDeletedBySender: true }
    });
  }

  // Check if it's received mail
  const receivedMail = await prisma.mailRecipient.findFirst({
    where: {
      mailId,
      employeeId: user.id,
    }
  });

  if (receivedMail) {
    await prisma.mailRecipient.update({
      where: { id: receivedMail.id },
      data: { isDeleted: true }
    });
  }

  revalidatePath("/main/mail");
}

export async function restoreFromTrash(mailId: string) {
  const user = await getAuthenticatedUser();

  // Check if it's received mail
  const receivedMail = await prisma.mailRecipient.findFirst({
    where: {
      mailId,
      employeeId: user.id,
    }
  });

  if (receivedMail) {
    await prisma.mailRecipient.update({
      where: { id: receivedMail.id },
      data: { isDeleted: false }
    });
  }
  
  // Check if it's sent mail
  const sentMail = await prisma.internalMail.findFirst({
    where: {
      id: mailId,
      senderId: user.id,
    }
  });

  if (sentMail) {
    await prisma.internalMail.update({
      where: { id: mailId },
      data: { isDeletedBySender: false }
    });
  }

  revalidatePath("/main/mail");
}

export async function deletePermanently(mailId: string) {
  const user = await getAuthenticatedUser();

  // If received mail, delete recipient record
  const receivedMail = await prisma.mailRecipient.findFirst({
    where: {
      mailId,
      employeeId: user.id,
    }
  });

  if (receivedMail) {
    await prisma.mailRecipient.delete({
      where: { id: receivedMail.id }
    });
  }

  // Note: if it's sent mail, we only mark it deleted, we don't delete from db because other recipients might still have it.
  
  revalidatePath("/main/mail");
}

export async function getUnreadCount() {
  const user = await getAuthenticatedUser();

  if (!user || !user.id) return 0;

  const count = await prisma.mailRecipient.count({
    where: {
      employeeId: user.id,
      isRead: false,
      isDeleted: false,
    },
  });

  return count;
}

/**
 * ما يحتاجه موظف زاد ليراسل جمعية: جمعياته المسنَدة، وخدماته الممنوحة، وعدد
 * من سيستلم في كل جمعية عن كل خدمة.
 *
 * العدد ليس زينة: «إلى جمعية» تتوسّع إلى المفوَّضين بتلك الخدمة فيها وحدهم،
 * فجمعيةٌ لم تُفوِّض أحداً بعدُ لا مستلم لها — ومن حق المرسِل أن يعرف ذلك قبل أن
 * يكتب، لا بعد أن يضغط «إرسال».
 *
 * والقائمتان مقصورتان: الجمعيات على المسنَدة إليه، والخدمات على الممنوحة له.
 */
export async function getCharityMailOptions() {
  const user = await getAuthenticatedUser();
  if (user.userType === "CHARITY_USER") throw new Error("غير مصرح");

  // null من getEmployeeServiceNames تعني «بلا تقييد» لا «بلا خدمة» — وهو العُرف
  // نفسه في كل منح الخدمات، فيُترجَم هنا إلى جميع الخدمات.
  const granted = await getEmployeeServiceNames(user.id);
  const services = granted ?? (await listServiceNames());

  const assigned = await getAssignedCharityIds(user.id, user.role, user.permissions);
  const charities = await prisma.charity.findMany({
    where: assigned === null ? undefined : { id: { in: assigned } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  type CharityOption = { id: string; name: string; counts: Record<string, number> };

  // حال التعميد لكل خدمة يُقال للمرسِل قبل أن يكتب: خدمةٌ بلا معمِّد لا يخرج
  // بريدها، وخدمةٌ لها معمِّدٌ غيره يقف بريدها عنده.
  const approverRows = await prisma.mailApprover.findMany({
    where: { serviceName: { in: services }, employee: { isActive: true } },
    select: { serviceName: true, employeeId: true },
  });
  const noApprover = services.filter((name) => !approverRows.some((r) => r.serviceName === name));
  const needsApproval = services.filter(
    (name) =>
      approverRows.some((r) => r.serviceName === name) &&
      !approverRows.some((r) => r.serviceName === name && r.employeeId === user.id)
  );

  if (services.length === 0 || charities.length === 0) {
    return { services, needsApproval, noApprover, charities: [] as CharityOption[] };
  }

  // المفوَّضون لكل (جمعية، خدمة) في استعلامٍ واحد، لا استعلامٍ لكل خلية.
  const rows = await prisma.charityMemberService.findMany({
    where: {
      serviceName: { in: services },
      membership: { isActive: true, charityId: { in: charities.map((c) => c.id) } },
    },
    select: { serviceName: true, membership: { select: { charityId: true } } },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.membership.charityId + "|" + row.serviceName;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    services,
    needsApproval,
    noApprover,
    charities: charities.map<CharityOption>((c) => ({
      id: c.id,
      name: c.name,
      counts: Object.fromEntries(
        services.map((name) => [name, counts.get(c.id + "|" + name) ?? 0])
      ),
    })),
  };
}

/**
 * بريدٌ من زاد إلى جمعيات — رسالةٌ مستقلة لكل جمعية.
 *
 * الجمع في رسالةٍ واحدة يجعل قائمة المستلمين مشتركة، فترى جمعيةٌ أسماء أعضاء
 * أخرى، ويجمعهم ردٌّ واحد. والفصل عند الإنشاء يجعل ذلك مستحيلاً بالبنية لا
 * بالحذر في الواجهة.
 *
 * ويصل البريد المفوَّضين بالخدمة في تلك الجمعية وحدهم، ويظهر لهم باسم الخدمة
 * «زاد | خدمة كذا» لا باسم كاتبه — والكاتب محفوظ في senderId للتدقيق وللردّ.
 */
export async function sendMailToCharities(data: {
  subject: string;
  body: string;
  charityIds: string[];
  serviceName: string;
  attachments?: AttachmentInput[];
  draftId?: string;
}) {
  const user = await getAuthenticatedUser();
  if (user.userType === "CHARITY_USER") throw new Error("غير مصرح");

  const charityIds = [...new Set((data.charityIds ?? []).filter(Boolean))];
  if (charityIds.length === 0) throw new Error("اختر جمعيةً واحدة على الأقل");
  if (!data.serviceName) throw new Error("اختر الخدمة التي يتبع لها البريد");

  // الخدمة هي هوية البريد عند الجمعية، فمن لا خدمة له لا اسم له عندها.
  const granted = await getEmployeeServiceNames(user.id);
  const services = granted ?? (await listServiceNames());
  if (services.length === 0) {
    throw new Error("لا يمكنك مراسلة الجمعيات قبل أن تُمنح خدمة");
  }
  if (!services.includes(data.serviceName)) {
    throw new Error("لا تملك هذه الخدمة");
  }

  // التحقق من الإسناد على الخادم لا في المُنتقي وحده: المُنتقي يُرشد، والحارس يمنع.
  const assigned = await getAssignedCharityIds(user.id, user.role, user.permissions);
  if (assigned !== null && charityIds.some((id) => !assigned.includes(id))) {
    throw new Error("إحدى الجمعيات ليست مسنَدة إليك");
  }

  const charities = await prisma.charity.findMany({
    where: { id: { in: charityIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (charities.length !== charityIds.length) throw new Error("إحدى الجمعيات غير موجودة");

  // مستلمو كل جمعية: مفوَّضوها بالخدمة، ومعهم في «نسخة» زملاء المرسِل في زاد
  // الحاملون لها — فالمحادثة للفريقين لا لشخصين. تُحسب قبل الإنشاء لتُرفض
  // الجمعيات الخالية من مفوَّضين دفعةً واحدة، ولا يُنشأ لغيرها شيء.
  const byCharity = new Map<string, Awaited<ReturnType<typeof serviceConversationRecipients>>>();
  const empty: string[] = [];
  for (const charity of charities) {
    try {
      byCharity.set(
        charity.id,
        await serviceConversationRecipients({
          serviceName: data.serviceName,
          charityId: charity.id,
          author: { kind: "EMPLOYEE", id: user.id },
        })
      );
    } catch {
      empty.push(charity.name);
    }
  }

  // بريدٌ بلا مستلم يُرفض ولا يُبتلع صامتاً.
  if (empty.length > 0) {
    throw new Error(`لا أحد مفوَّض بخدمة «${data.serviceName}» في: ${empty.join("، ")}`);
  }

  const cleanBody = sanitizeMailHtml(data.body);
  const attachments = data.attachments ?? [];

  // التعميد إلزامي: بلا معمِّدٍ لا إرسال. والمنتظر يُحفظ **بلا صفوف استلام**،
  // فلا يمكن أن يُقرأ قبل أن يُعتمد. والمعمِّد نفسه يخرج بريده معتمداً باسمه.
  const route = await resolveApprovalRoute(data.serviceName, user.id);
  if (route === "NO_APPROVER") throw new Error(await getNoApproverMessage(data.serviceName));
  const needsApproval = route === "PENDING";

  const mailIds = await prisma.$transaction(async (tx) => {
    const ids: string[] = [];

    for (const charity of charities) {
      const mail = await tx.internalMail.create({
        data: {
          subject: data.subject,
          body: cleanBody,
          senderId: user.id,
          senderKind: "EMPLOYEE",
          serviceName: data.serviceName,
          charityId: charity.id,
          addressedAs: "CHARITY",
          approvalState: needsApproval ? "PENDING" : "APPROVED",
          approvedById: needsApproval ? null : user.id,
          approvedAt: needsApproval ? null : new Date(),
          // صفوف الأعضاء تحمل جمعيتها — نطاق الصندوق — فلا تظهر لصاحبها في جمعيةٍ أخرى.
          recipients: needsApproval ? undefined : { create: byCharity.get(charity.id) ?? [] },
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
      ids.push(mail.id);
    }

    // المسودة الواحدة أنتجت رسائل عدّة، فلا تُحوَّل إلى إحداها بل تُزال.
    if (data.draftId) {
      const draft = await tx.internalMail.findUnique({
        where: { id: data.draftId },
        select: { senderId: true, isDraft: true },
      });
      if (draft?.isDraft && draft.senderId === user.id) {
        await tx.internalMail.delete({ where: { id: data.draftId } });
      }
    }

    return ids;
  });

  revalidatePath("/main/mail");
  return { count: mailIds.length, mailIds, pending: needsApproval };
}

/**
 * ردّ موظف زاد في محادثة خدمةٍ مع جمعية.
 *
 * المحادثة للفريقين: فالردّ يصل **كل** المفوَّضين بالخدمة في الجمعية، ويصل
 * زملاء الكاتب في زاد نسخةً، ويبقى منسوباً إلى كاتبه. ولأيّ عضوٍ في الفريق أن
 * يردّ — على رسالةٍ من الجمعية أو من زميلٍ له — ما دامت وصلته أو كتبها.
 *
 * والردّ بريدٌ من زاد إلى جمعية كغيره، فيمرّ بالتعميد الإلزامي نفسه.
 *
 * `draftId`: ردٌّ أرجعه المعمِّد فعاد مسودة، ثم أُعيد إرساله — تُزال المسودة
 * بعد أن يحلّ محلها الردّ الجديد.
 */
export async function replyToCharityMail(data: {
  parentId: string;
  subject: string;
  body: string;
  attachments?: AttachmentInput[];
  draftId?: string;
}) {
  const user = await getAuthenticatedUser();
  if (user.userType === "CHARITY_USER") throw new Error("غير مصرح");

  const parent = await prisma.internalMail.findUnique({
    where: { id: data.parentId },
    select: {
      id: true,
      parentId: true,
      senderId: true,
      charityId: true,
      serviceName: true,
      recipients: { select: { employeeId: true } },
    },
  });
  if (!parent?.charityId || !parent.serviceName) throw new Error("غير مصرح");

  // من كتب الرسالة أو وصلته — ولا يكفي معرّفها وحده.
  const isParty =
    parent.senderId === user.id || parent.recipients.some((r) => r.employeeId === user.id);
  if (!isParty) throw new Error("غير مصرح");

  const route = await resolveApprovalRoute(parent.serviceName, user.id);
  if (route === "NO_APPROVER") throw new Error(await getNoApproverMessage(parent.serviceName));
  const needsApproval = route === "PENDING";

  // يُحسب المستلمون حتى للمنتظر: جمعيةٌ لم يبق فيها مفوَّض تُعرف الآن، لا
  // بعد أن يعتمد المعمِّد ردّاً لا يصل أحداً.
  const recipients = await serviceConversationRecipients({
    serviceName: parent.serviceName,
    charityId: parent.charityId,
    author: { kind: "EMPLOYEE", id: user.id },
  });

  const mail = await prisma.$transaction(async (tx) => {
    const created = await tx.internalMail.create({
      data: {
        subject: data.subject || "(بدون موضوع)",
        body: sanitizeMailHtml(data.body),
        senderId: user.id,
        senderKind: "EMPLOYEE",
        serviceName: parent.serviceName,
        charityId: parent.charityId,
        addressedAs: "CHARITY",
        // كل ردٍّ يُعلَّق بجذر السلسلة، فتبقى المحادثة واحدة مهما تعدّدت الردود.
        parentId: parent.parentId ?? parent.id,
        approvalState: needsApproval ? "PENDING" : "APPROVED",
        approvedById: needsApproval ? null : user.id,
        approvedAt: needsApproval ? null : new Date(),
        recipients: needsApproval ? undefined : { create: recipients },
        attachments: data.attachments?.length
          ? {
              create: data.attachments.map((a) => ({
                fileUrl: a.fileUrl,
                fileName: a.fileName,
                fileSize: a.fileSize ?? null,
              })),
            }
          : undefined,
      },
      select: { id: true },
    });

    if (data.draftId) {
      const draft = await tx.internalMail.findUnique({
        where: { id: data.draftId },
        select: { senderId: true, isDraft: true },
      });
      if (draft?.isDraft && draft.senderId === user.id) {
        await tx.internalMail.delete({ where: { id: data.draftId } });
      }
    }

    return created;
  });

  revalidatePath("/main/mail");
  return { ...mail, pending: needsApproval };
}
