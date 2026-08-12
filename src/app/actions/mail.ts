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
        attachments: data.attachments?.length ? { create: data.attachments } : undefined,
      },
    });

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
}) {
  const user = await getAuthenticatedUser();
  const cleanBody = sanitizeMailHtml(data.body);

  if (data.id) {
    const existing = await prisma.internalMail.findUnique({ where: { id: data.id } });
    if (!existing || existing.senderId !== user.id || !existing.isDraft) {
      throw new Error("غير مصرح لك بتعديل هذه المسودة");
    }

    return prisma.internalMail.update({
      where: { id: data.id },
      data: {
        subject: data.subject,
        body: cleanBody,
        draftToIds: data.toIds || [],
        draftCcIds: data.ccIds || [],
        draftBccIds: data.bccIds || [],
      },
    });
  }

  return prisma.internalMail.create({
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
}

export async function getDrafts(page = 1, limit = 20) {
  const user = await getAuthenticatedUser();
  const skip = (page - 1) * limit;

  const [mails, total] = await Promise.all([
    prisma.internalMail.findMany({
      where: { senderId: user.id, isDraft: true },
      include: { attachments: true },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.internalMail.count({ where: { senderId: user.id, isDraft: true } }),
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

export async function getInbox(page = 1, limit = 20) {
  const user = await getAuthenticatedUser();
  const skip = (page - 1) * limit;

  const [mails, total] = await Promise.all([
    prisma.mailRecipient.findMany({
      where: {
        employeeId: user.id,
        isDeleted: false,
      },
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
    prisma.mailRecipient.count({
      where: {
        employeeId: user.id,
        isDeleted: false,
      },
    }),
  ]);

  return { mails, total, totalPages: Math.ceil(total / limit) };
}

export async function getSentMails(page = 1, limit = 20) {
  const user = await getAuthenticatedUser();
  const skip = (page - 1) * limit;

  const [mails, total] = await Promise.all([
    prisma.internalMail.findMany({
      where: {
        senderId: user.id,
        isDeletedBySender: false,
      },
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
    prisma.internalMail.count({
      where: {
        senderId: user.id,
        isDeletedBySender: false,
      },
    }),
  ]);

  return { mails, total, totalPages: Math.ceil(total / limit) };
}

export async function getStarredMails(page = 1, limit = 20) {
  const user = await getAuthenticatedUser();
  const skip = (page - 1) * limit;

  const [mails, total] = await Promise.all([
    prisma.mailRecipient.findMany({
      where: {
        employeeId: user.id,
        isStarred: true,
        isDeleted: false,
      },
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
    prisma.mailRecipient.count({
      where: {
        employeeId: user.id,
        isStarred: true,
        isDeleted: false,
      },
    }),
  ]);

  return { mails, total, totalPages: Math.ceil(total / limit) };
}

export async function getTrashMails(page = 1, limit = 20) {
  const user = await getAuthenticatedUser();
  const skip = (page - 1) * limit;

  const [mails, total] = await Promise.all([
    prisma.mailRecipient.findMany({
      where: {
        employeeId: user.id,
        isDeleted: true,
      },
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
    prisma.mailRecipient.count({
      where: {
        employeeId: user.id,
        isDeleted: true,
      },
    }),
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
