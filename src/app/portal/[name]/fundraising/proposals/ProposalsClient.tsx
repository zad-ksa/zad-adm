"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  SearchField,
  SortTh,
  StatStrip,
  TableShellCards,
  tableFrameClass,
  tbodyClass,
  tdClass,
  theadRowClass,
  type SortDir,
} from "@/components/console/layout";
import { Badge, MONO, cx } from "@/components/console/ui";
import Select from "@/components/console/Select";
import { PROPOSAL_STATUSES, proposalStatusLabel, proposalStatusOf, proposalStatusTone } from "@/lib/donorFields";
import type { PortalProposalListRow } from "@/lib/portalFundraising";

type Column = "donor" | "field" | "project" | "status" | "date";

/**
 * «مقترحاتنا»: ما كتبته الجمعيةُ في مجالات الجهات، ومصيرُ كلِّ مقترح.
 *
 * وهي الحلقةُ بين «الجهات» و«المنح»: الأولى تقول أين نقترح، والأخيرة ما رُفع
 * فعلاً — وهذه ما كُتب وينتظر. وكانت مبعثرةً في ملفات الجهات لا تُجمع.
 */
export default function ProposalsClient({
  charityName,
  proposals,
}: {
  charityName: string;
  proposals: PortalProposalListRow[];
}) {
  const base = `/portal/${encodeURIComponent(charityName)}/fundraising`;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [column, setColumn] = useState<Column>("date");
  const [dir, setDir] = useState<SortDir>("desc");
  const onSort = (next: Column, nextDir: SortDir) => {
    setColumn(next);
    setDir(nextDir);
  };

  const shown = useMemo(() => {
    const q = query.trim();
    const text = (a: string, b: string) => a.localeCompare(b, "ar");
    const sign = dir === "asc" ? 1 : -1;
    const list = proposals.filter(
      (p) =>
        (status === "all" || proposalStatusOf(p.status) === status) &&
        (q === "" || p.name.includes(q) || p.donorName.includes(q) || p.fieldName.includes(q))
    );
    list.sort((a, b) => {
      switch (column) {
        case "donor":
          return sign * text(a.donorName, b.donorName) || b.createdAtMs - a.createdAtMs;
        case "field":
          return sign * text(a.fieldName, b.fieldName) || b.createdAtMs - a.createdAtMs;
        case "project":
          return sign * text(a.name, b.name) || b.createdAtMs - a.createdAtMs;
        case "status":
          return sign * text(a.status, b.status) || b.createdAtMs - a.createdAtMs;
        default:
          return sign * (a.createdAtMs - b.createdAtMs);
      }
    });
    return list;
  }, [proposals, query, status, column, dir]);

  const counted = (value: string) => proposals.filter((p) => proposalStatusOf(p.status) === value).length;

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        icon={<FileText className="size-6" />}
        title="مقترحاتنا"
        description="ما كتبته الجمعية في مجالات الجهات المانحة، ومصير كل مقترح عند فريق زاد."
      />

      <StatStrip
        items={[
          { label: "كل المقترحات", value: proposals.length },
          { label: "رفع للجهة", value: counted("SUBMITTED"), dot: "active" },
          { label: "قيد الاقتراح", value: counted("PROPOSED") },
          { label: "مؤجل", value: counted("DEFERRED"), dot: counted("DEFERRED") > 0 ? "warn" : "muted" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={setQuery}
          label="بحث في المقترحات"
          placeholder="ابحث باسم المشروع أو الجهة أو المجال…"
          className="min-w-56 flex-1"
        />
        <Select
          value={status}
          onSelect={setStatus}
          placeholder="الحال"
          options={[
            { value: "all", label: "كل الأحوال" },
            ...PROPOSAL_STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <div className={tableFrameClass}>
          <EmptyState
            icon={<FileText className="size-4" />}
            title={proposals.length === 0 ? "لا مقترحات بعد" : "لا نتائج لهذه التصفية"}
            description={
              proposals.length === 0
                ? "افتح جهة مانحة واقترح مشروعا تحت أحد مجالاتها."
                : "امسح البحث أو اختر كل الأحوال."
            }
          />
        </div>
      ) : (
        <TableShellCards
          footer={
            shown.length === proposals.length
              ? `${proposals.length} مقترح`
              : `${shown.length} من ${proposals.length} مقترح`
          }
          cards={shown.map((p) => (
            <div key={p.id} className="space-y-1.5 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
                <Badge tone={proposalStatusTone(p.status)}>{proposalStatusLabel(p.status)}</Badge>
              </div>
              <p className="text-caption text-slate-500 dark:text-slate-400">
                <Link href={`${base}/donors/${p.donorId}`} className="text-primary hover:underline dark:text-teal-300">
                  {p.donorName}
                </Link>
                {" · "}
                {p.fieldName}
              </p>
              {p.note && <p className="text-caption text-slate-500 dark:text-slate-400">{p.note}</p>}
              <p className={cx(MONO, "text-meta text-slate-400")}>{p.createdAt}</p>
            </div>
          ))}
        >
          <thead>
            <tr className={theadRowClass}>
              <SortTh id="project" active={column} dir={dir} onSort={onSort}>
                المشروع
              </SortTh>
              <SortTh id="donor" active={column} dir={dir} onSort={onSort}>
                الجهة
              </SortTh>
              <SortTh id="field" active={column} dir={dir} onSort={onSort}>
                المجال
              </SortTh>
              <SortTh id="status" active={column} dir={dir} onSort={onSort}>
                الحال
              </SortTh>
              <SortTh id="date" active={column} dir={dir} onSort={onSort}>
                تاريخ الاقتراح
              </SortTh>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {shown.map((p) => (
              <tr key={p.id}>
                <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>
                  {p.name}
                  {!p.fromPlan && <span className="ms-2 text-meta text-slate-400">من خارج الخطة</span>}
                  {p.note && (
                    <p className="mt-0.5 text-meta font-normal leading-5 text-slate-500 dark:text-slate-400">
                      {p.note}
                    </p>
                  )}
                </td>
                <td className={tdClass}>
                  <Link
                    href={`${base}/donors/${p.donorId}`}
                    className="text-primary transition-colors outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-teal-300"
                  >
                    {p.donorName}
                  </Link>
                </td>
                <td className={tdClass}>{p.fieldName}</td>
                <td className={tdClass}>
                  <Badge tone={proposalStatusTone(p.status)}>{proposalStatusLabel(p.status)}</Badge>
                </td>
                <td className={cx(tdClass, MONO, "text-slate-500")}>{p.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </TableShellCards>
      )}
    </div>
  );
}
