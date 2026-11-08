"use client";

import DateField from "./DateField";
import TimeField from "./TimeField";
import { isTimeString } from "@/lib/timeOptions";
import { isISODate } from "@/lib/calendarGrid";

/**
 * تاريخٌ ووقتٌ في حقلين، بقيمةٍ واحدةٍ على صيغة `input[type=datetime-local]`:
 * «YYYY-MM-DDTHH:MM».
 *
 * وحقلان لا حقلٌ واحد: `datetime-local` يرسم في ويندوز سطراً واحداً من ستّة
 * مواضعَ تُكتب بالأرقام، ولا تقويمَ فيه يُقرأ اسمُ يومه. والحقلان هنا هما
 * نفسُهما المستعملان في كلّ شاشةٍ أخرى — تقويمُ العدّة وساعتُها.
 *
 * **ولا تُرفع قيمةٌ ناقصة**: ما دام أحدُ الشقّين فارغاً فالقيمةُ `""`، لأنّ
 * «2026-11-09T» ليست لحظةً ولا تُقرأ في الخادم. وهذا موافقٌ لما كان: الحقلُ
 * الأصليُّ لا يُعطي قيمةً حتى يكتمل.
 */
export default function DateTimeField({
  value,
  onChange,
  id,
  minDate,
  maxDate,
  step = 15,
  disabled = false,
  required = false,
  className = "",
}: {
  /** «YYYY-MM-DDTHH:MM» أو نصٌّ فارغ. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  minDate?: string;
  maxDate?: string;
  step?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const [rawDate = "", rawTime = ""] = value.split("T");
  const date = isISODate(rawDate) ? rawDate : "";
  // الثواني تُقطع إن جاءت من قيمةٍ قديمة: «10:00:00» ليست من صيغة الحقل.
  const time = isTimeString(rawTime.slice(0, 5)) ? rawTime.slice(0, 5) : "";

  const emit = (nextDate: string, nextTime: string) => {
    onChange(nextDate && nextTime ? `${nextDate}T${nextTime}` : "");
  };

  return (
    <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${className}`}>
      <DateField
        id={id}
        value={date}
        onChange={(v) => emit(v, time)}
        min={minDate}
        max={maxDate}
        disabled={disabled}
        required={required}
        withWeekday={false}
      />
      <TimeField
        value={time}
        onChange={(v) => emit(date, v)}
        step={step}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}
