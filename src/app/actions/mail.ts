"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session || !session.id) {
    throw new Error("غير مصرح لك بالوصول");
  }
  return session;
}

export async function sendMail(data: {
  subject: string;
  body: string;
  toIds: string[];
  ccIds?: string[];
  bccIds?: string[];
  attachments?: { fileUrl: string; fileName: string; fileSize?: number }[];
  parentId?: string;
}) {
  const user = await getAuthenticatedUser();

  if (!data.toIds || data.toIds.length === 0) {
    throw new Error("يجب تحديد مستلم واحد على الأقل");
  }

  // Create recipients data
  const recipientsData: any[] = [];
  
  data.toIds.forEach((id) => {
    recipientsData.push({ employeeId: id, type: "TO" });
  });

  if (data.ccIds) {
    data.ccIds.forEach((id) => {
      // Avoid duplicates
      if (!recipientsData.find((r) => r.employeeId === id)) {
        recipientsData.push({ employeeId: id, type: "CC" });
      }
    });
  }

  if (data.bccIds) {
    data.bccIds.forEach((id) => {
      // Avoid duplicates
      if (!recipientsData.find((r) => r.employeeId === id)) {
        recipientsData.push({ employeeId: id, type: "BCC" });
      }
    });
  }

  const mail = await prisma.internalMail.create({
    data: {
      subject: data.subject,
      body: data.body,
      senderId: user.id,
      parentId: data.parentId,
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

export async function getMailById(id: string) {
  const user = await getAuthenticatedUser();

  const mail = await prisma.internalMail.findUnique({
    where: { id },
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
          createdAt: 'asc'
        }
      }
    },
  });

  if (!mail) {
    throw new Error("الرسالة غير موجودة");
  }

  // Ensure user is either sender or recipient
  const isSender = mail.senderId === user.id;
  const isRecipient = mail.recipients.some((r) => r.employeeId === user.id);

  if (!isSender && !isRecipient) {
    throw new Error("غير مصرح لك بعرض هذه الرسالة");
  }

  return mail;
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
