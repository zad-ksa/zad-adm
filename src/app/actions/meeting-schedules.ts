"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { formatClock12 } from "@/lib/attendanceTime";
import {
  findOpenSlot,
  parseMeetingRules,
  AFTER_SLOT_ACTIONS,
  MAX_CUTOFF_MINUTES,
  type AfterSlotAction,
} from "@/lib/meetingSlots";

/** إعداداتُ الإغلاق كما تأتي من النموذج — تُطهَّر قبل أن تُحفظ. */
export type MeetingRuleInput = {
  bookingCutoffMinutes?: number;
  bookingCutoffDayStart?: boolean;
  blockSlotBefore?: boolean;
  afterSlotAction?: string;
  afterSlotDelayMinutes?: number;
};

/**
 * ما يُحفظ من الإعدادات.
 *
 * والتطهيرُ على الخادم لا في النموذج: النموذجُ يُعين على الصواب، والخادمُ هو
 * الذي يضمنه — فطلبٌ مُلفَّقٌ بتأجيلٍ ثلاثِ ساعاتٍ على جدولٍ نصفُ ساعةٍ يُدخل
 * موعدين في وقتٍ واحد.
 */
function sanitizeRules(duration: number, input: MeetingRuleInput) {
  const action: AfterSlotAction = AFTER_SLOT_ACTIONS.some((a) => a.value === input.afterSlotAction)
    ? (input.afterSlotAction as AfterSlotAction)
    : "NONE";
  const clamp = (value: unknown, min: number, max: number) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  return {
    bookingCutoffMinutes: clamp(input.bookingCutoffMinutes, 0, MAX_CUTOFF_MINUTES),
    bookingCutoffDayStart: !!input.bookingCutoffDayStart,
    blockSlotBefore: !!input.blockSlotBefore,
    afterSlotAction: action,
    afterSlotDelayMinutes: action === "DELAY" ? clamp(input.afterSlotDelayMinutes, 1, duration) : 0,
  };
}

export async function createMeetingSchedule(data: {
  title: string;
  duration: number;
  availableDays: any;
  slug: string;
  allowAlternativeRequest?: boolean;
  rules?: MeetingRuleInput;
}) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { error: "غير مصرح لك" };

    const existingSlug = await prisma.meetingSchedule.findUnique({ where: { slug: data.slug } });
    if (existingSlug) return { error: "هذا الرابط مستخدم بالفعل" };

    const schedule = await prisma.meetingSchedule.create({
      data: {
        title: data.title,
        slug: data.slug,
        duration: data.duration,
        availableDays: data.availableDays,
        allowAlternativeRequest: !!data.allowAlternativeRequest,
        createdById: session.id,
        ...sanitizeRules(data.duration, data.rules ?? {}),
      }
    });

    revalidatePath("/main/charity-meetings");
    return { success: true, schedule };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getMeetingSchedules() {
  try {
    const session = await getSession();
    if (!session || !session.id) return { error: "غير مصرح لك", data: [] };

    const schedules = await prisma.meetingSchedule.findMany({
      where: { createdById: session.id },
      orderBy: { createdAt: 'desc' },
      include: {
        bookings: { orderBy: { createdAt: "desc" } },
        alternativeRequests: true,
      }
    });

    return { success: true, data: schedules };
  } catch (error: any) {
    return { error: error.message, data: [] };
  }
}

export async function getMeetingScheduleBySlug(slug: string) {
  try {
    const schedule = await prisma.meetingSchedule.findUnique({
      where: { slug, isActive: true },
      include: {
        bookings: true
      }
    });
    if (!schedule) return { error: "لم يتم العثور على هذا الجدول" };

    return { success: true, data: schedule };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * حجزُ موعد — من صفحةٍ عامّةٍ بلا حساب.
 *
 * فالحكمُ كلُّه يُعاد هنا: أنّ الجدول مفتوح، وأنّ الوقتَ من أوقاته، وأنّه لم
 * يُقفل بمهلةٍ ولا بجارٍ محجوز. وكان الفعلُ يكتب ما يُرسل إليه كما هو: طلبٌ
 * مُلفَّقٌ يحجز أيَّ وقتٍ في أيِّ يومٍ ولو لم يكن في الجدول أصلاً.
 */
export async function bookMeetingSlot(data: {
  scheduleId: string;
  charityName: string;
  date: string;
  startTime: string;
}) {
  try {
    const charityName = (data.charityName || "").trim();
    if (!charityName) return { error: "اسم الجمعية مطلوب" };

    const schedule = await prisma.meetingSchedule.findUnique({
      where: { id: data.scheduleId },
      include: { bookings: { select: { date: true, startTime: true } } },
    });
    if (!schedule || !schedule.isActive) return { error: "هذا الجدول غير متاح للحجز" };

    const rules = parseMeetingRules(schedule);
    const lookup = findOpenSlot(
      schedule.availableDays,
      rules,
      schedule.bookings,
      data.date,
      data.startTime,
      new Date()
    );
    if (!lookup.ok) return { error: lookup.reason };

    const booking = await prisma.meetingBooking.create({
      data: {
        scheduleId: data.scheduleId,
        charityName,
        date: data.date,
        startTime: data.startTime,
      }
    });

    // إشعارٌ لصاحب الجدول — وهو يُكتب هنا مباشرةً لا بـ`createAppNotification`:
    // تلك تشترط جلسةً (لئلّا تُدفع إشعاراتٌ مُلفَّقة)، والحاجزُ لا جلسةَ له.
    // والمصدرُ هنا فعلُ الحجز نفسُه، فالنصُّ من القاعدة لا من المُرسِل.
    try {
      await prisma.appNotification.create({
        data: {
          employeeId: schedule.createdById,
          title: "حجز موعد اجتماع جديد",
          message: `حجزت ${charityName} موعد «${schedule.title}» يوم ${data.date} الساعة ${formatClock12(data.startTime)}`,
          link: `/main/charity-meetings/${schedule.id}`,
        },
      });
    } catch {
      // الحجزُ وقع والإشعارُ تبعٌ له: فشلُ التبع لا يُفقد الجمعيةَ موعدَها،
      // والشارةُ على التبويب تُحسب من الحجوزات نفسِها فيبقى الخبرُ واصلاً.
    }

    revalidatePath(`/book-meeting/${schedule.slug}`);
    revalidatePath("/main/charity-meetings");
    revalidatePath(`/main/charity-meetings/${schedule.id}`);

    return { success: true, booking };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "عذراً، تم حجز هذا الموعد للتو" };
    return { error: error.message };
  }
}

export async function submitAlternativeRequest(data: {
  scheduleId: string;
  charityName: string;
  message: string;
  contactPhone?: string;
}) {
  try {
    const schedule = await prisma.meetingSchedule.findUnique({ where: { id: data.scheduleId } });
    if (!schedule || !schedule.isActive || !schedule.allowAlternativeRequest) {
      return { error: "هذا الخيار غير متاح لهذا الجدول" };
    }

    const request = await prisma.meetingAlternativeRequest.create({
      data: {
        scheduleId: data.scheduleId,
        charityName: data.charityName,
        message: data.message,
        contactPhone: data.contactPhone || null,
      }
    });

    revalidatePath("/main/charity-meetings");
    return { success: true, request };
  } catch (error: any) {
    return { error: error.message };
  }
}

/** عددُ الحجوزات التي لم يرَها صاحبُ جدولها — رقمُ الشارة على التبويب. */
export async function getUnseenBookingCount() {
  try {
    const session = await getSession();
    if (!session || !session.id) return 0;

    return await prisma.meetingBooking.count({
      where: { seenAt: null, schedule: { createdById: session.id } },
    });
  } catch {
    return 0;
  }
}

/**
 * «رأيتُ حجوزاتَ هذا الجدول» — تُنادى عند فتح صفحته.
 *
 * والملكيّةُ تُقرأ أوّلاً ثم يُكتب بالمُعرِّف: `updateMany` لا يحرسها بشرطٍ
 * على العلاقة، ولا يُترك الختمُ لمن يعرف مُعرِّفَ جدولٍ ليس له.
 */
export async function markScheduleBookingsSeen(scheduleId: string) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { error: "غير مصرح لك" };

    const schedule = await prisma.meetingSchedule.findUnique({
      where: { id: scheduleId },
      select: { createdById: true },
    });
    if (!schedule || schedule.createdById !== session.id) return { error: "غير مصرح لك" };

    const { count } = await prisma.meetingBooking.updateMany({
      where: { scheduleId, seenAt: null },
      data: { seenAt: new Date() },
    });

    if (count > 0) revalidatePath("/main/charity-meetings");
    return { success: true, count };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function toggleMeetingScheduleActive(id: string, isActive: boolean) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { error: "غير مصرح لك" };

    await prisma.meetingSchedule.update({
      where: { id, createdById: session.id },
      data: { isActive }
    });

    revalidatePath("/main/charity-meetings");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteMeetingSchedule(id: string) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { error: "غير مصرح لك" };

    await prisma.meetingSchedule.delete({
      where: { id, createdById: session.id },
    });

    revalidatePath("/main/charity-meetings");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
