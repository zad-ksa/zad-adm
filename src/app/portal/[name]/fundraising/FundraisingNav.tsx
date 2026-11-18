"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/console/ui";

/**
 * تنقّلُ القسم: شاشتاه معروضتان معاً، والحاليّةُ مُعلَّمة.
 *
 * **وكان زرّاً يتبدّل اسمُه بحسب مكانك**: في الجهات «المنح المرفوعة»، وفي
 * المنح «الجهات المانحة» — فلا يُرى أنّ القسم شاشتان إلّا بعد دخول إحداهما،
 * ولا يقول شيءٌ أين أنت، والهدفُ يتحرّك تحت اليد بين الشاشتين.
 *
 * **وملفُّ الجهة يُبقي «الجهات» مُعلَّمةً**: هو ابنُها، ومسارُه يبدأ بها —
 * فالتعليمُ بـ`startsWith` لا بالمطابقة.
 */
export default function FundraisingNav({
  charityName,
  donors,
  grants,
}: {
  charityName: string;
  donors: number;
  grants: number;
}) {
  const pathname = decodeURIComponent(usePathname());
  const base = `/portal/${charityName}/fundraising`;
  const onGrants = pathname.startsWith(`${base}/grants`);

  const items = [
    { href: base, label: "الجهات المانحة", count: donors, active: !onGrants },
    { href: `${base}/grants`, label: "المنح المرفوعة", count: grants, active: onGrants },
  ];

  return (
    <nav
      aria-label="أقسام تنمية الموارد المالية"
      className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={`/portal/${encodeURIComponent(charityName)}${item.href.slice(`/portal/${charityName}`.length)}`}
          aria-current={item.active ? "page" : undefined}
          className={cx(
            "rounded-[5px] px-3 py-1.5 text-caption font-semibold transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-primary/40",
            item.active
              ? "bg-primary/10 text-primary dark:bg-teal-400/10 dark:text-teal-300"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          {item.label}
          <span className="ms-1.5 text-meta font-normal text-slate-400">{item.count}</span>
        </Link>
      ))}
    </nav>
  );
}
