"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Coins } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  SearchField,
  SortTh,
  StatStrip,
  TableShell,
  tableFrameClass,
  tbodyClass,
  tdClass,
  theadRowClass,
  type SortDir,
} from "@/components/console/layout";
import { Badge, MONO, cx } from "@/components/console/ui";
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

/** أعمدةُ الفرز — بالنقر على الرأس، كشاشات زاد. */
type Column = "donor" | "project" | "amount" | "status" | "date";

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
  donors,
  initialDonor,
  tabs,
}: {
  charityName: string;
  grants: PortalGrantRow[];
  /** جهاتُ ما رُفع — يُرشَّح بها الجدول. */
  donors: { id: string; label: string }[];
  /** جهةٌ تُفتح الصفحةُ مُرشَّحةً بها، قادمةً من ملفِّها. */
  initialDonor: string | null;
  /** تبويبُ القسم — تحت العنوان لا فوق المسار. */
  tabs?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [donor, setDonor] = useState(initialDonor ?? "all");
  const [column, setColumn] = useState<Column>("date");
  const [dir, setDir] = useState<SortDir>("desc");
  const onSort = (next: Column, nextDir: SortDir) => {
    setColumn(next);
    setDir(nextDir);
  };
  const base = `/portal/${encodeURIComponent(charityName)}/fundraising`;

  const shown = useMemo(() => {
    const q = query.trim();
    const text = (a: string, b: string) => a.localeCompare(b, "ar");
    const sign = dir === "asc" ? 1 : -1;
    const list = grants.filter(
      (g) =>
        (status === "all" || g.status === status) &&
        (donor === "all" || g.donorOrgId === donor) &&
        (q === "" || g.initiativeName.includes(q) || g.donorName.includes(q))
    );
    list.sort((a, b) => {
      switch (column) {
        case "amount":
          return sign * (a.requestedAmount - b.requestedAmount);
        case "donor":
          return sign * text(a.donorName, b.donorName) || b.createdAtMs - a.createdAtMs;
        case "project":
          return sign * text(a.initiativeName, b.initiativeName) || b.createdAtMs - a.createdAtMs;
        case "status":
          return sign * text(a.status, b.status) || b.createdAtMs - a.createdAtMs;
        default:
          return sign * (a.createdAtMs - b.createdAtMs);
      }
    });
    return list;
  }, [grants, query, status, donor, column, dir]);

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
      />

      {tabs}

      <StatStrip
        items={[
          {
            label: "عدد الطلبات",
            value: shown.length,
            hint: shown.length === grants.length ? undefined : `من ${grants.length} بعد التصفية`,
          },
          { label: "إجمالي المطلوب", value: `${money(requested)} ر.س` },
          { label: "إجمالي المقبول", value: `${money(approved)} ر.س` },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={setQuery}
          label="بحث في المنح"
          placeholder="ابحث باسم المشروع أو الجهة…"
          className="min-w-56 flex-1"
        />
        {donors.length > 1 && (
          <Select
            value={donor}
            onSelect={setDonor}
            placeholder="الجهة"
            options={[
              { value: "all", label: "كل الجهات" },
              ...donors.map((d) => ({ value: d.id, label: d.label })),
            ]}
          />
        )}
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
        <TableShell
          footer={
            shown.length === grants.length
              ? `${grants.length} طلب`
              : `${shown.length} من ${grants.length} طلب`
          }
        >
          <thead>
            <tr className={theadRowClass}>
              <SortTh id="donor" active={column} dir={dir} onSort={onSort}>
                الجهة
              </SortTh>
              <SortTh id="project" active={column} dir={dir} onSort={onSort}>
                المشروع
              </SortTh>
              <SortTh id="amount" active={column} dir={dir} onSort={onSort}>
                المبلغ المطلوب (ريال)
              </SortTh>
              <SortTh id="status" active={column} dir={dir} onSort={onSort}>
                الحالة
              </SortTh>
              <SortTh id="date" active={column} dir={dir} onSort={onSort}>
                تاريخ الرفع
              </SortTh>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {shown.map((g) => (
              <tr key={g.id}>
                <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>{g.donorName}</td>
                <td className={tdClass}>{g.initiativeName}</td>
                <td className={cx(tdClass, MONO)}>{money(g.requestedAmount)}</td>
                <td className={tdClass}>
                  <Badge tone={TONE[g.status] ?? "neutral"}>{grantStatusLabel(g.status)}</Badge>
                </td>
                <td className={cx(tdClass, MONO, "text-slate-500")}>{g.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
