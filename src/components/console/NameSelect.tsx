"use client";

import { useMemo, useState } from "react";
import { Undo2 } from "lucide-react";
import Select, { type SelectOption, type SelectVariant } from "@/components/console/Select";
import { btn, cx, field } from "@/components/console/ui";

/**
 * حقلُ اسمِ شخص: يُختار من قائمةٍ مبوَّبة، أو يُكتب خارجها.
 *
 * **والمخزَّنُ اسمٌ لا مُعرِّف**: مواضعُ كهذه تحفظ الاسمَ نصّاً — لأنّ صاحبَه قد
 * لا يكون في الموقع أصلاً (متطوّعٌ، أو موظّفٌ في جهةٍ ثالثة). فالقائمةُ تيسيرُ
 * كتابةٍ لا رابطةُ صفوف: تمنع الخطأَ الإملائيَّ في اسمٍ معروف، ولا تمنع اسماً
 * ليس فيها.
 *
 * **والمكتوبُ خارجَها لا يختفي**: صفٌّ قديمٌ فيه اسمٌ ليس في القائمة يُفتح على
 * صندوق الكتابة وفيه اسمُه — ولو فُتح على قائمةٍ لا تحويه لقُرئ «بلا اسم»،
 * ولمُحي بأوّل حفظ.
 */

export type NamePerson = { name: string; hint?: string };

/** مجموعةٌ في القائمة: عنوانٌ وأسماؤه — «موظفو زاد»، «موظفو الجمعية». */
export type NameGroup = { label: string; people: NamePerson[] };

const MANUAL = "__manual__";

export default function NameSelect({
  value,
  onChange,
  groups,
  placeholder = "بلا اسم",
  manualLabel = "كتابة اسم خارج القائمة",
  variant = "console",
  maxLength = 120,
}: {
  value: string;
  onChange: (name: string) => void;
  groups: NameGroup[];
  /** ما يُقرأ حين لا اسمَ مختار. */
  placeholder?: string;
  manualLabel?: string;
  variant?: SelectVariant;
  maxLength?: number;
}) {
  const known = useMemo(() => {
    const set = new Set<string>();
    for (const group of groups) for (const person of group.people) set.add(person.name);
    return set;
  }, [groups]);

  // ولا يُحسب في أثرٍ بعد الرسم: الحسابُ مرّةً عند البدء — فاسمٌ خارج القائمة
  // يُفتح مكتوباً، ولا يُرى لحظةً في قائمةٍ لا تحويه.
  const [writing, setWriting] = useState(() => value.trim() !== "" && !known.has(value));

  const options = useMemo<SelectOption[]>(() => {
    const list: SelectOption[] = [
      { value: "", label: placeholder },
      { value: MANUAL, label: `✎ ${manualLabel}` },
    ];
    for (const group of groups) {
      if (group.people.length === 0) continue;
      // عنوانُ المجموعة خيارٌ معطَّل: يُعرض ولا يُختار.
      list.push({ value: `__group__${group.label}`, label: group.label, disabled: true });
      for (const person of group.people) {
        list.push({ value: person.name, label: person.name, hint: person.hint });
      }
    }
    return list;
  }, [groups, placeholder, manualLabel]);

  if (writing) {
    return (
      <div className="space-y-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder="اكتب الاسم"
          className={field}
        />
        <button
          type="button"
          onClick={() => {
            // اسمٌ ليس في القائمة لا تعرضه القائمة، فيُفرَّغ عند العودة إليها.
            if (!known.has(value.trim())) onChange("");
            setWriting(false);
          }}
          className={cx(btn.ghost, "h-7 px-2 text-caption")}
        >
          <Undo2 className="size-3.5" />
          العودة الى القائمة
        </button>
      </div>
    );
  }

  return (
    <Select
      variant={variant}
      value={known.has(value) ? value : ""}
      onSelect={(picked) => {
        if (picked === MANUAL) {
          onChange("");
          setWriting(true);
          return;
        }
        onChange(picked);
      }}
      placeholder={placeholder}
      options={options}
      className="w-full [&>button]:w-full [&>button]:justify-between"
    />
  );
}
