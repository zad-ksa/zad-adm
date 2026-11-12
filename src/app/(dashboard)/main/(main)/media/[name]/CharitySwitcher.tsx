"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/console/Select";
import { Spinner } from "@/components/console/ui";

/**
 * التنقّلُ بين خطط الجمعيات من الصفحة نفسها — بجمعيات الموظَّف وحدَها، كما
 * يحسبها نطاقُ الخطّة الإعلاميّة (`getMediaScope`).
 */
export default function CharitySwitcher({
  current,
  charities,
}: {
  current: string;
  charities: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <span className="inline-flex items-center gap-2">
      <Select
        options={charities.map((name) => ({ value: name, label: name }))}
        value={current}
        onSelect={(name) => {
          if (name === current) return;
          start(() => router.push(`/main/media/${encodeURIComponent(name)}`));
        }}
        placeholder="اختر الجمعية"
        variant="soft"
        className="min-w-[16rem]"
      />
      {pending && <Spinner size={14} />}
    </span>
  );
}
