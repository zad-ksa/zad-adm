"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeMailHtml } from "@/lib/sanitizeMail";

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
  const person =
    side === "sender"
      ? { sender: { name: text } }
      : { recipients: { some: { employee: { name: text } } } };

  return { OR: [{ subject: text }, { body: text }, person] };
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

  if (!data.toIds || data.toIds.length === 0) {
    throw new Error("يجب تحديد مستلم واحد على الأقل");
  }

  const recipientsData = buildRecipientsData(data);
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
 */
export async function saveDraft(data: {
  id?: string;
  subject: string;
  body: string;
  toIds: string[];
  ccIds?: string[];
  bccIds?: string[];
  attachments?: AttachmentInput[];
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
      include: { attachments: true },
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
            attachments: true,
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
          },
        },
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
            attachments: true,
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
            attachments: true,
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

  return { mails, total, totalPages: Math.ceil(total / limit) };
}

const MAIL_THREAD_INCLUDE = {
  sender: {
    select: { id: true, name: true, avatarUrl: true, role: true },
  },
  recipients: {
    include: {
      employee: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
    },
  },
  attachments: true,
  replies: {
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
      recipients: {
        include: {
          employee: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
        },
      },
      attachments: true,
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} as const;

function canViewMail(m: { senderId: string; recipients: { employeeId: string }[] }, userId: string) {
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
function stripHiddenBcc<T extends { senderId: string; recipients: { employeeId: string; type: string }[] }>(
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
  mail.replies = mail.replies.filter((r) => canViewMail(r, user.id));

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
