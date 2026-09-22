import Link from "next/link";
import Image from "next/image";
import { Avatar, Badge, cx } from "@/components/console/ui";

/**
 * قائمة نشاطٍ في «الرئيسية» — المهام العاجلة، والجاري تنفيذها، وآخر المنجز.
 *
 * كانت ثلاث كتلٍ متطابقة البنية مكتوبة ثلاث مرات بيدها، كلٌّ بشريطٍ ملوّن
 * بجانب العنوان ونقاط SVG للتقويم. صارت مكوّناً واحداً بأسلوب العُدّة:
 * الشارة تحمل الحالة، والتاريخ نصٌّ هادئ، والصورة أو الحروف الأولى لصاحبها.
 */
export type ActivityItem = {
  id: string;
  title: string;
  date: Date | string;
  badge: { tone: "danger" | "warn" | "good" | "gold"; label: string };
  tag?: string;
  person?: { name: string; avatarUrl?: string | null } | null;
  personPrefix?: string;
};

export default function ActivityList({
  title,
  items,
  empty,
  moreHref,
}: {
  title: string;
  items: ActivityItem[];
  empty: string;
  moreHref?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {moreHref && (
          <Link
            href={moreHref}
            className="rounded-sm text-[12.5px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-teal-300"
          >
            عرض الكل ←
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-slate-500 dark:text-slate-400">{empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={item.badge.tone}>{item.badge.label}</Badge>
                    {item.tag && <Badge tone="brand">{item.tag}</Badge>}
                  </div>
                  <time className="text-[12px] text-slate-500 dark:text-slate-400">
                    {new Date(item.date).toLocaleDateString("ar-SA")}
                  </time>
                </div>
                <p className="text-[13.5px] font-medium leading-6 text-slate-900 dark:text-slate-100">{item.title}</p>
                <div className="flex items-center gap-2">
                  {item.person?.avatarUrl ? (
                    <Image
                      src={item.person.avatarUrl}
                      alt=""
                      width={24}
                      height={24}
                      className={cx("size-6 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700")}
                    />
                  ) : (
                    <Avatar name={item.person?.name || "?"} size="sm" />
                  )}
                  <span className="text-[12.5px] text-slate-600 dark:text-slate-400">
                    {item.personPrefix}
                    {item.person?.name || "غير محدد"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
