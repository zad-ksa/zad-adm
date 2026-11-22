import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PORTAL_DONOR_KIND, fundraisingOpenFor } from "@/lib/portalFundraising";
import { isMediaPlanEnabled } from "@/lib/mediaPlanToggle";
import { visibleCharityServices } from "@/lib/charityPermissions";
import { currentStage, currentStep, serviceProgress, serviceStateOf } from "@/lib/serviceStages";
import type { AgendaItem, HomeTask } from "@/lib/portalHome";

/**
 * ما تقرؤه رئيسيةُ بوّابة الجمعية — من ستّة أقسامٍ في استدعاءٍ واحد.
 *
 * **وكلُّ قراءةٍ محروسة**: الرئيسيةُ هي أوّلُ ما يُفتح، فجدولٌ لم يُهاجَر بعدُ
 * أو خدمةٌ لم تُسند لا يجوز أن يُسقطا الصفحةَ على كلِّ عضو. والصفرُ أصدقُ من
 * صفحةِ خطأ، ويُكتب الأثرُ في السجلّ.
 *
 * **وما لا يَملك العضوُ فعلَه لا يُقرأ أصلاً**: لا يُستعلم عن تصاميمَ لمن لا
 * يراها — فالحجبُ بعد القراءة تسريبُ وقتٍ على الأقلّ.
 */

const DAY = 86_400_000;

export type HomeService = {
  id: string;
  name: string;
  state: ReturnType<typeof serviceStateOf>;
  stageName: string | null;
  stepName: string | null;
  done: number;
  total: number;
  percent: number;
};

export type HomeContact = { role: string; name: string; phone: string | null };

export type PortalHome = {
  /**
   * لحظةُ القراءة — تُحسب هنا لا في الصفحة.
   *
   * فقراءةُ الساعة أثناء الرسم دالّةٌ غيرُ خالصة، ولأنّ المواعيدَ كلَّها
   * قيست عليها فالصفحةُ ترسمها بها هي لا بلحظةٍ ثانيةٍ بعدها.
   */
  nowMs: number;
  tasks: HomeTask[];
  agenda: AgendaItem[];
  services: HomeService[];
  contacts: HomeContact[];
};

type Access = {
  charity: { id: string; name: string };
  isOfficial: boolean;
  effective: string[];
  can: (permission: string) => boolean;
};

async function guarded<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error("portalHome:" + label, error);
    return fallback;
  }
}

export async function loadPortalHome(access: Access): Promise<PortalHome> {
  const base = `/portal/${encodeURIComponent(access.charity.name)}`;
  const charityId = access.charity.id;
  const now = Date.now();
  const soon = new Date(now + 14 * DAY);

  const seesDesign = access.can("view_design_requests");
  const seesMedia = access.can("edit_media_plan");
  const seesFundraising = access.can("view_fundraising");

  const [designs, mail, media, donors, services, contacts, holidays] = await Promise.all([
    seesDesign
      ? guarded(
          "designs",
          () =>
            prisma.designRequest.findMany({
              where: { charityId, archivedAt: null },
              select: { id: true, title: true, status: true, expectedCompletionDate: true },
            }),
          [] as { id: string; title: string; status: string; expectedCompletionDate: Date }[]
        )
      : Promise.resolve([]),

    guarded("mail", () => unreadMailCount(charityId), 0),

    seesMedia && (await isMediaPlanEnabled(charityId))
      ? guarded(
          "media",
          () =>
            prisma.mediaPost.findMany({
              where: { charityId, scheduledOn: { gte: new Date(now - DAY), lte: soon } },
              select: { id: true, title: true, status: true, scheduledOn: true },
            }),
          [] as { id: string; title: string | null; status: string; scheduledOn: Date }[]
        )
      : Promise.resolve([]),

    seesFundraising && (await fundraisingOpenFor(access.charity))
      ? guarded(
          "donors",
          () =>
            prisma.donorOrg.findMany({
              where: { kind: PORTAL_DONOR_KIND, closesAt: { gte: new Date(now - DAY), lte: soon } },
              select: { id: true, name: true, closesAt: true },
            }),
          [] as { id: string; name: string; closesAt: Date | null }[]
        )
      : Promise.resolve([]),

    guarded("services", () => loadHomeServices(access), [] as HomeService[]),

    guarded("contacts", () => loadContacts(charityId), [] as HomeContact[]),

    // والعطلُ الرسميةُ وحدَها: إغلاقُ زادٍ شأنُها لا شأنُ الجمعية.
    guarded(
      "holidays",
      () =>
        prisma.holiday.findMany({
          where: { scope: "GLOBAL", startDate: { lte: soon }, endDate: { gte: new Date(now - DAY) } },
          select: { id: true, name: true, startDate: true },
        }),
      [] as { id: string; name: string; startDate: Date }[]
    ),
  ]);

  const awaiting = designs.filter((d) => d.status === "AWAITING_REVIEW").length;
  const rejected = designs.filter((d) => d.status === "REJECTED").length;
  const mediaWaiting = media.filter((m) => m.status === "PENDING_CHARITY").length;

  const tasks: HomeTask[] = [
    {
      id: "design-review",
      // و`danger` لأنّه يَفوت بمضيّ الوقت لا بإهمالٍ ظاهر: التسليمُ يُعتمد
      // تلقائياً بعد مهلته، فالصمتُ موافقة.
      tone: "danger",
      label: "تسليم ينتظر اعتمادك",
      count: awaiting,
      href: `${base}/design-requests`,
    },
    {
      id: "media-approve",
      tone: "warn",
      label: "منشور ينتظر اعتمادك",
      count: mediaWaiting,
      href: `${base}/media`,
    },
    {
      id: "design-rejected",
      tone: "warn",
      label: "طلب تصميم أعيد للتعديل",
      count: rejected,
      href: `${base}/design-requests`,
    },
    {
      id: "donor-closing",
      tone: "warn",
      label: "جهة مانحة تغلق قريبا",
      count: donors.length,
      href: `${base}/fundraising`,
    },
    { id: "mail", tone: "brand", label: "رسالة غير مقروءة", count: mail, href: `${base}/mail` },
  ];

  const agenda: AgendaItem[] = [
    ...designs
      .filter((d) => d.status === "PENDING")
      .map((d) => ({
        id: "d-" + d.id,
        kind: "DESIGN" as const,
        title: d.title,
        atMs: d.expectedCompletionDate.getTime(),
        href: `${base}/design-requests`,
      })),
    ...donors
      .filter((d) => d.closesAt)
      .map((d) => ({
        id: "o-" + d.id,
        kind: "DONOR" as const,
        title: d.name,
        atMs: d.closesAt!.getTime(),
        href: `${base}/fundraising/donors/${d.id}`,
      })),
    ...media.map((m) => ({
      id: "m-" + m.id,
      kind: "MEDIA" as const,
      title: m.title?.trim() || "منشور بلا عنوان",
      atMs: m.scheduledOn.getTime(),
      href: `${base}/media`,
    })),
    ...holidays.map((h) => ({
      id: "h-" + h.id,
      kind: "HOLIDAY" as const,
      title: h.name,
      atMs: h.startDate.getTime(),
    })),
  ];

  return { nowMs: now, tasks, agenda, services, contacts };
}

async function unreadMailCount(charityId: string): Promise<number> {
  const session = await getSession();
  if (!session?.id) return 0;
  return prisma.mailRecipient.count({
    where: { charityUserId: session.id, charityId, isRead: false, isDeleted: false },
  });
}

/** خدماتُ الجمعية التي يراها هذا العضو، وأين بلغت كلٌّ منها. */
async function loadHomeServices(access: Access): Promise<HomeService[]> {
  const rows = await prisma.service.findMany({
    where: { charityId: access.charity.id },
    include: { stages: { orderBy: { order: "asc" }, include: { steps: { orderBy: { order: "asc" } } } } },
    orderBy: { createdAt: "desc" },
  });

  const visible = new Set(
    visibleCharityServices({
      isOfficialAccount: access.isOfficial,
      effective: access.effective,
      charityServices: rows.map((s) => s.name),
    })
  );

  return rows
    .filter((s) => visible.has(s.name))
    .map((service) => {
      const { done, total, percent } = serviceProgress(service.stages);
      return {
        id: service.id,
        name: service.name,
        state: serviceStateOf(service),
        stageName: currentStage(service.stages)?.name ?? null,
        stepName: currentStep(service.stages)?.name ?? null,
        done,
        total,
        percent,
      };
    });
}

/**
 * مسؤولو زادٍ عن أركان الجمعية الثلاثة.
 *
 * وهي مسجَّلةٌ في صفّ الجمعية منذ زمنٍ ولا تُعرض لها في شاشة — فتُسأل «بمن
 * نتّصل؟» وجوابُها مكتوبٌ عند زاد.
 */
async function loadContacts(charityId: string): Promise<HomeContact[]> {
  const charity = await prisma.charity.findUnique({
    where: { id: charityId },
    select: {
      strategyResponsibleName: true,
      strategyResponsiblePhone: true,
      governanceResponsibleName: true,
      governanceResponsiblePhone: true,
      financeResponsibleName: true,
      financeResponsiblePhone: true,
    },
  });
  if (!charity) return [];

  return [
    { role: "التخطيط الاستراتيجي", name: charity.strategyResponsibleName, phone: charity.strategyResponsiblePhone },
    { role: "الحوكمة", name: charity.governanceResponsibleName, phone: charity.governanceResponsiblePhone },
    { role: "تنمية الموارد", name: charity.financeResponsibleName, phone: charity.financeResponsiblePhone },
  ]
    .filter((c): c is HomeContact & { name: string } => !!c.name?.trim())
    .map((c) => ({ role: c.role, name: c.name.trim(), phone: c.phone?.trim() || null }));
}
