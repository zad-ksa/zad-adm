"use client";

import { useState, useTransition } from "react";
import Switch from "@/components/console/Switch";
import { notify } from "@/components/console/toastBus";
import { setCharityMediaPlanEnabled } from "@/app/actions/mediaPlan";

/**
 * مفتاحُ ظهور تبويب «الخطة الإعلامية» في بوّابة الجمعية — بجوار اسمها.
 *
 * وموضعُه هنا بقصد: من يضع الخطّةَ هو من يعرف متى تصير جاهزةً للعرض، فالمفتاحُ
 * في يده لا في شاشةِ إعداداتٍ بعيدة.
 *
 * والحالةُ تُقلَب في الشاشة قبل جواب الخادم ثمّ تُردّ إن رفض: المفتاحُ يُلمس
 * ويُنتظر، فتأخيرُ أثره لحظةً يجعل صاحبَه يلمسه مرّتين.
 */
export default function MediaPlanToggle({
  charityId,
  charityName,
  initialEnabled,
}: {
  charityId: string;
  charityName: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, start] = useTransition();

  const flip = (next: boolean) => {
    setEnabled(next);
    start(async () => {
      const result = await setCharityMediaPlanEnabled(charityId, next);
      if (result.error) {
        setEnabled(!next);
        notify("error", result.error);
        return;
      }
      notify(
        "ok",
        next ? `تم اظهار التبويب لـ${charityName}` : `تم اخفاء التبويب عن ${charityName}`
      );
    });
  };

  return (
    <Switch
      checked={enabled}
      onChange={flip}
      busy={pending}
      label={enabled ? "ظاهرة للجمعية" : "مخفية عن الجمعية"}
    />
  );
}
