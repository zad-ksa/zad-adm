/**
 * إشعاراتُ البريد الداخليّ في جُرس موظَّفي زاد.
 *
 * ولم تكن موجودةً أصلاً: الاعتماداتُ وطلباتُ التصاميم والطلباتُ الماليّةُ
 * والاجتماعاتُ والمهامُّ كلُّها تُنشئ `AppNotification`، **والبريدُ وحدَه لم
 * يُوصَل بالجُرس قطّ**. فما كان للموظَّف خبرٌ بوصول بريدٍ إلّا شارةً على تبويب
 * «البريد الداخلي» — ولو كانت مجموعتُه مطويّةً لم يرَ شيئاً.
 *
 * وأثرُه أبلغُ في المراسلة بين موظَّفي زاد والجمعيات: الجمعيةُ تُرسل من
 * بوّابتها، فيصل البريدُ إلى فريق الخدمة في زاد بلا أن يُعلم أحدٌ به — وتبقى
 * الرسالةُ تنتظر حتى يفتح أحدُهم البريدَ من تلقائه.
 *
 * **وثلاثةُ مواضعَ لا موضعٌ واحد:**
 *   ١ وصولُ بريدٍ إلى مستلمٍ من زاد.
 *   ٢ بريدٌ وُقف على التعميد — يُعلم به معمِّدوه، وهم من يُنتظرون.
 *   ٣ وقرارُ المعمِّد — يُعلم به صاحبُ الرسالة، اعتماداً كان أو إرجاعاً.
 *
 * **وكلُّها لا تُسقط العمل.** الإشعارُ خبرٌ عن فعلٍ تمّ، فلو رُفع منه استثناءٌ
 * بعد حفظ الرسالة، سقط الإرسالُ الذي نجح وظنَّ صاحبُه أنّه لم يُرسل — فيُعيده،
 * فتصل مرّتين. فيُسجَّل الخطأُ ويُمضى.
 *
 * ولا يُشعَر عضوُ جمعيةٍ من هنا: `AppNotification.employeeId` لموظَّفي زاد
 * وحدَهم، ولأعضاء الجمعيات عدّادُهم في تخطيط البوّابة.
 *
 * وقواعدُ الاختيار والنصِّ في `mailNotifyRules.ts` — خالصةٌ تُختبر بلا وصلة.
 */

import { prisma } from "@/lib/db";
import { mailNotifySubject, mailNotifyTargets } from "@/lib/mailNotifyRules";

/** صفُّ استلامٍ كما تُخرجه `serviceConversationRecipients`. */
export type MailNotifyRecipient = { employeeId?: string; charityUserId?: string };

const MAIL_LINK = (mailId: string) => `/main/mail/${mailId}`;

/**
 * يكتب الصفوفَ ولا يرفع.
 *
 * و`createMany` بنداءٍ واحدٍ لا نداءً لكلِّ مستلم: فريقُ خدمةٍ قد يكون عشرةً،
 * وعشرُ رحلاتٍ إلى القاعدة تُؤخِّر الإرسالَ الذي ينتظره المستخدمُ أمام الشاشة.
 */
async function writeNotifications(
  rows: { employeeId: string; title: string; message: string; link: string }[],
  label: string
): Promise<number> {
  if (rows.length === 0) return 0;
  try {
    const result = await prisma.appNotification.createMany({ data: rows });
    return result.count;
  } catch (error) {
    console.error(`تعذّر إنشاء إشعارات البريد (${label})`, error);
    return 0;
  }
}

/**
 * ١ — وصولُ بريد.
 */
export async function notifyMailDelivered(args: {
  mailId: string;
  subject: string | null | undefined;
  senderName: string;
  recipients: readonly MailNotifyRecipient[];
  excludeEmployeeId?: string | null;
}): Promise<number> {
  const targets = mailNotifyTargets(args.recipients, args.excludeEmployeeId);
  return writeNotifications(
    targets.map((employeeId) => ({
      employeeId,
      title: "بريد داخلي جديد",
      message: `${args.senderName} — ${mailNotifySubject(args.subject)}`,
      link: MAIL_LINK(args.mailId),
    })),
    "وصول"
  );
}

/**
 * ٢ — بريدٌ ينتظر التعميد.
 *
 * ويُشعَر من **يستطيع البتَّ فيه** لا كلُّ معمِّدي الخدمة: نطاقُ المعمِّد خدمتُه
 * **وجمعياتُه المسنَدة** (وهو ما تفحصه `requireApprovalAuthority`). فإشعارُ
 * معمِّدٍ لم تُسند إليه الجمعيةُ يُعطيه خبراً عن جمعيةٍ ليست له، ويُرسله إلى
 * رسالةٍ تردُّه عنها.
 *
 * و`developer_mode` وحدَها تتجاوز الإسناد، كما في `getAssignedCharityIds`.
 */
export async function notifyMailPendingApproval(args: {
  mailId: string;
  subject: string | null | undefined;
  serviceName: string;
  charityId: string;
  senderName: string;
  excludeEmployeeId?: string | null;
}): Promise<number> {
  try {
    const approvers = await prisma.mailApprover.findMany({
      where: { serviceName: args.serviceName },
      select: { employeeId: true },
    });
    const ids = approvers
      .map((a) => a.employeeId)
      .filter((id) => id !== args.excludeEmployeeId);
    if (ids.length === 0) return 0;

    // الإسنادُ يُفحَص في استعلامٍ واحدٍ لا في استعلامٍ لكلِّ معمِّد.
    const eligible = await prisma.employee.findMany({
      where: {
        id: { in: ids },
        isActive: true,
        OR: [
          { permissions: { has: "developer_mode" } },
          { assignedCharities: { some: { charityId: args.charityId } } },
        ],
      },
      select: { id: true },
    });

    return writeNotifications(
      eligible.map((e) => ({
        employeeId: e.id,
        title: "بريد بانتظار التعميد",
        message: `${args.senderName} — ${mailNotifySubject(args.subject)}`,
        link: MAIL_LINK(args.mailId),
      })),
      "تعميد منتظر"
    );
  } catch (error) {
    console.error("تعذّر إشعار معمِّدي البريد", error);
    return 0;
  }
}

/**
 * ٣ — قرارُ المعمِّد يصل صاحبَ الرسالة.
 *
 * والاعتمادُ يُقال معه كم مستلماً وصلته: صاحبُ الرسالة لا يرى صفوفَ الاستلام،
 * فـ«اعتُمد» وحدَها لا تُخبره أنّها وصلت أحداً. والإرجاعُ يحمل سببَه، وإلّا
 * فتح المسودةَ ولا يعرف ما يُصحِّح.
 */
export async function notifyMailDecision(args: {
  mailId: string;
  subject: string | null | undefined;
  authorEmployeeId: string;
  approverName: string;
  state: "APPROVED" | "RETURNED";
  delivered?: number;
  note?: string | null;
}): Promise<number> {
  const approved = args.state === "APPROVED";
  const tail = approved
    ? typeof args.delivered === "number"
      ? ` — وصلت ${args.delivered} مستلماً`
      : ""
    : args.note?.trim()
      ? ` — ${mailNotifySubject(args.note)}`
      : "";
  return writeNotifications(
    [
      {
        employeeId: args.authorEmployeeId,
        title: approved ? "اعتُمد بريدك وأُرسل" : "أُرجع بريدك للتصحيح",
        message: `${args.approverName}: ${mailNotifySubject(args.subject)}${tail}`,
        link: MAIL_LINK(args.mailId),
      },
    ],
    approved ? "اعتماد" : "إرجاع"
  );
}
