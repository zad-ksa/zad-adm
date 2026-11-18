"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Coins, Search } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  StatStrip,
  TableShell,
  Th,
  tableFrameClass,
  tbodyClass,
  tdClass,
  theadRowClass,
} from "@/components/console/layout";
import { Badge, btn, cx, field } from "@/components/console/ui";
import Select from "@/components/console/Select";
import { GRANT_STATUSES, grantStatusLabel } from "@/lib/donorOrg";
import type { PortalGrantRow } from "@/lib/portalFundraising";

const TONE: Record<string, "good" | "warn" | "danger" | "neutral"> = {
  APPROVED: "good",
  PENDING: "warn",
  REJECTED: "danger",
  CLOSED: "neutral",
};

const money = (n: number) => n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 0 });

/**
 * منحُ الجمعية وحالاتُها — جامعةٌ لما رُفع إلى الجهات كلِّها.
 *
 * والمجموعُ يُقرأ فوق الجدول: «كم طلبنا» و«كم قُبل» سؤالان يُسألان قبل تصفّح
 * الصفوف، وحسابُهما في المتصفّح من الصفوف المعروضة نفسِها — فلا رقمٌ في
 * الترويسة يخالف ما تحته.
 */
export default function GrantsClient({
  charityName,
  grants,
}: {
  charityName: string;
  grants: PortalGrantRow[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const base = `/portal/${encodeURIComponent(charityName)}/fundraising`;

  const shown = useMemo(() => {
    const q = query.trim();
    return grants.filter(
      (g) =>
        (status === "all" || g.status === status) &&
        (q === "" || g.initiativeName.includes(q) || g.donorName.includes(q))
    );
  }, [grants, query, status]);

  const requested = shown.reduce((sum, g) => sum + g.requestedAmount, 0);
  const approved = shown
    .filter((g) => g.status === "APPROVED")
    .reduce((sum, g) => sum + g.requestedAmount, 0);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        crumbs={[{ label: "تنمية الموارد المالية", href: base }, { label: "المنح" }]}
        icon={<Coins className="size-6" />}
        title="المنح المرفوعة"
        description="ما رفعته الجمعية إلى الجهات المانحة، وحالة كل طلب."
        actions={
          <Link href={base} className={btn.secondary}>
            الجهات المانحة
          </Link>
        }
      />

      <StatStrip
        items={[
          { label: "عدد الطلبات", value: shown.length },
          { label: "إجمالي المطلوب", value: `${money(requested)} ر.س` },
          { label: "إجمالي المقبول", value: `${money(approved)} ر.س` },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم المشروع أو الجهة…"
            className={cx(field, "ps-9")}
          />
        </label>
        <Select
          value={status}
          onSelect={setStatus}
          placeholder="الحالة"
          options={[
            { value: "all", label: "كل الحالات" },
            ...GRANT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <div className={tableFrameClass}>
          <EmptyState
            icon={<Coins className="size-4" />}
            title={grants.length === 0 ? "لا منح مرفوعة بعد" : "لا نتائج لهذه التصفية"}
            description={
              grants.length === 0
                ? "تظهر هنا الطلبات المرفوعة إلى الجهات المانحة بعد تسجيلها."
                : "امسح البحث أو اختر كل الحالات."
            }
          />
        </div>
      ) : (
        <TableShell>
          <thead>
            <tr className={theadRowClass}>
              <Th>الجهة</Th>
              <Th>المشروع</Th>
              <Th>المبلغ المطلوب</Th>
              <Th>الحالة</Th>
              <Th>تاريخ الرفع</Th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {shown.map((g) => (
              <tr key={g.id}>
                <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>{g.donorName}</td>
                <td className={tdClass}>{g.initiativeName}</td>
                <td className={cx(tdClass, "tabular-nums")}>{money(g.requestedAmount)}</td>
                <td className={tdClass}>
                  <Badge tone={TONE[g.status] ?? "neutral"}>{grantStatusLabel(g.status)}</Badge>
                </td>
                <td className={cx(tdClass, "tabular-nums")}>{g.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
