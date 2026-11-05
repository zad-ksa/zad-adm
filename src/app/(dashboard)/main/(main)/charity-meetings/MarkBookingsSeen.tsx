"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markScheduleBookingsSeen } from "@/app/actions/meeting-schedules";

/**
 * فتحُ صفحةِ الجدول هو رؤيةُ حجوزاتِه.
 *
 * ولا تُختم في الصفحة نفسِها وهي تُرسم: الرسمُ قد يتكرّر، والكتابةُ أثناءه
 * أثرٌ لا يملكه من يقرأ. فعلامةٌ تُرسل مرّةً من المتصفّح، و`seen` يحرسها من
 * التكرار في وضع التطوير حيث يُرسَم الأثرُ مرّتين.
 *
 * ولا يُنادى إلّا إن كان ثَمّ ما لم يُرَ — ففتحُ جدولٍ قديمٍ لا يُوقظ القاعدة.
 */
export default function MarkBookingsSeen({
  scheduleId,
  unseenCount,
}: {
  scheduleId: string;
  unseenCount: number;
}) {
  const router = useRouter();
  const seen = useRef(false);

  useEffect(() => {
    if (seen.current || unseenCount === 0) return;
    seen.current = true;
    markScheduleBookingsSeen(scheduleId)
      // الشارةُ في الشريط تُحسب في تخطيطٍ لا يُعاد رسمُه بالتنقّل، فيُنعَش
      // المسارُ كي ينزل الرقمُ الآن لا عند أوّل تحديثٍ كامل.
      .then(() => router.refresh())
      .catch(() => {
        // فشلُ الختم يُبقي الحجزَ «جديداً»: تُعاد المحاولةُ عند الفتح القادم.
      });
  }, [scheduleId, unseenCount, router]);

  return null;
}
