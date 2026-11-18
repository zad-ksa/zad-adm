"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Coins, KeyRound } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  SearchField,
  SortTh,
  StatStrip,
  TableShell,
  Th,
  tableFrameClass,
  tbodyClass,
  tdClass,
  theadRowClass,
  type SortDir,
} from "@/components/console/layout";
import { Badge, MONO, btn, cx } from "@/components/console/ui";
import { CopyButton, SecretValue } from "@/components/console/Copy";
import { notify } from "@/components/console/toastBus";
import AccountSheet from "./AccountSheet";
import type { PortalDonorRow } from "@/lib/portalFundraising";

type Column = "name" | "status" | "date" | "grants";

/**
 * جدولُ الجهات المانحة في بوّابة الجمعية.
 *
 * **والتاريخُ عمودٌ واحدٌ لا عمودان**: المفتوحُ يُسأل عن موعد إغلاقه، والمغلقُ
 * عن موعد فتحه — وعمودان أحدُهما فارغٌ دائماً في كلِّ صفٍّ عرضٌ لا خبر.
 *
 * **وكلمةُ المرور تُنسخ قبل أن تُكشف**: الحاجةُ الغالبةُ لصقُها في بوّابة
 * الجهة، وكشفُها على شاشةٍ مفتوحةٍ لا يلزم لذلك — فالنسخُ أوّلاً والكشفُ لمن
 * احتاجه.
 *
 * **والفرزُ بالنقر على الرأس** كشاشات زاد: الرأسُ هو المكانُ الذي يبحث فيه
 * القارئُ عن الفرز، ولا تُكتب له قائمةٌ منسدلةٌ تُنسى عند إضافة عمود.
 */
export default function DonorsClient({
  charityId,
  charityName,
  donors,
}: {
  charityId: string;
  charityName: string;
  donors: PortalDonorRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [column, setColumn] = useState<Column>("name");
  const [dir, setDir] = useState<SortDir>("asc");
  const [editing, setEditing] = useState<PortalDonorRow | null>(null);
  const [busy, start] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim();
    const text = (a: string, b: string) => a.localeCompare(b, "ar");
    const sign = dir === "asc" ? 1 : -1;
    const list = donors.filter(
      (d) => (!onlyOpen || d.intakeStatus === "OPEN") && (q === "" || d.name.includes(q))
    );
    list.sort((a, b) => {
      switch (column) {
        case "status":
          return sign * text(a.intakeStatus, b.intakeStatus) || text(a.name, b.name);
        case "grants":
          return sign * (a.grants - b.grants) || text(a.name, b.name);
        case "date":
          // وبلا موعدٍ تُدفع إلى الآخر في الاتّجاهين: «لا شيء» ليس أقدمَ تاريخ.
          if (!a.nextDate && !b.nextDate) return text(a.name, b.name);
          if (!a.nextDate) return 1;
          if (!b.nextDate) return -1;
          return sign * text(a.nextDate, b.nextDate);
        default:
          return sign * text(a.name, b.name);
      }
    });
    return list;
  }, [donors, query, onlyOpen, column, dir]);

  const openCount = donors.filter((d) => d.intakeStatus === "OPEN").length;
  const withAccount = donors.filter((d) => d.username).length;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        notify("error", res.error ?? "تعذرت العملية");
        return;
      }
      notify("ok", "حُفظ الحساب.");
      setEditing(null);
      router.refresh();
    });

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        icon={<Coins className="size-6" />}
        title="تنمية الموارد المالية"
        description="الجهات المانحة وحسابات جمعيتك عندها، ومجالات المنح في كل جهة."
        actions={
          <Link href={`/portal/${encodeURIComponent(charityName)}/fundraising/grants`} className={btn.secondary}>
            المنح المرفوعة
          </Link>
        }
      />

      {/* الأعدادُ بطاقاتٌ كشاشات زاد لا سطرَ نصٍّ في الوصف: تُمسح بنظرة. */}
      <StatStrip
        items={[
          { label: "الجهات المانحة", value: donors.length },
          { label: "مفتوحة للرفع الآن", value: openCount, dot: openCount > 0 ? "active" : "muted" },
          { label: "لها حساب مسجل", value: withAccount, hint: `من ${donors.length} جهة` },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={setQuery}
          label="بحث في الجهات"
          placeholder="ابحث باسم الجهة…"
          className="min-w-56 flex-1"
        />
        <button
          type="button"
          onClick={() => setOnlyOpen((v) => !v)}
          aria-pressed={onlyOpen}
          className={onlyOpen ? btn.primary : btn.secondary}
        >
          المفتوحة للرفع فقط
        </button>
      </div>

      {shown.length === 0 ? (
        <div className={tableFrameClass}>
          <EmptyState
            icon={<Building2 className="size-4" />}
            title="لا جهات تطابق البحث"
            description="امسح البحث أو ألغ تصفية المفتوحة."
          />
        </div>
      ) : (
        <TableShell
          footer={
            shown.length === donors.length
              ? `${donors.length} جهة`
              : `${shown.length} من ${donors.length} جهة`
          }
        >
          <thead>
            <tr className={theadRowClass}>
              <SortTh id="name" active={column} dir={dir} onSort={(c, d) => { setColumn(c); setDir(d); }}>
                الجهة
              </SortTh>
              <SortTh id="status" active={column} dir={dir} onSort={(c, d) => { setColumn(c); setDir(d); }}>
                الحالة
              </SortTh>
              <SortTh id="date" active={column} dir={dir} onSort={(c, d) => { setColumn(c); setDir(d); }}>
                الموعد
              </SortTh>
              <Th>اسم المستخدم</Th>
              <Th>كلمة المرور</Th>
              <SortTh id="grants" active={column} dir={dir} onSort={(c, d) => { setColumn(c); setDir(d); }}>
                المرفوع
              </SortTh>
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {shown.map((donor) => (
              <tr key={donor.id}>
                <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>
                  <Link
                    href={`/portal/${encodeURIComponent(charityName)}/fundraising/donors/${donor.id}`}
                    className="text-primary transition-colors outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-teal-300"
                  >
                    {donor.name}
                  </Link>
                  {donor.proposals > 0 && (
                    <span className="ms-2 text-meta text-slate-400">{donor.proposals} مشروع مقترح</span>
                  )}
                </td>
                <td className={tdClass}>
                  <Badge tone={donor.intakeStatus === "OPEN" ? "good" : "neutral"}>
                    {donor.intakeStatus === "OPEN" ? "مفتوح" : "مغلق"}
                  </Badge>
                </td>
                <td className={tdClass}>
                  {donor.nextDate ? (
                    <span className="text-body text-slate-600 dark:text-slate-300">
                      <span className="text-meta text-slate-400">
                        {donor.intakeStatus === "OPEN" ? "يغلق " : "يفتح "}
                      </span>
                      <span className={MONO}>{donor.nextDate}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500" title={donor.intakeReason}>
                      بلا موعد معلن
                    </span>
                  )}
                </td>
                <td className={tdClass}>
                  {donor.username ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cx(MONO, "text-body text-slate-700 dark:text-slate-200")} dir="ltr">
                        {donor.username}
                      </span>
                      <CopyButton value={donor.username} title="نسخ اسم المستخدم" />
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">لا حساب</span>
                  )}
                </td>
                <td className={tdClass}>
                  {donor.password ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CopyButton value={donor.password} title="نسخ كلمة المرور" />
                      <SecretValue value={donor.password} />
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">—</span>
                  )}
                </td>
                <td className={cx(tdClass, MONO, "text-slate-600 dark:text-slate-300")}>{donor.grants}</td>
                <td className={cx(tdClass, "whitespace-nowrap")}>
                  <button type="button" onClick={() => setEditing(donor)} className={btn.secondary}>
                    <KeyRound className="size-4" />
                    {donor.username ? "تعديل الحساب" : "إضافة حساب"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {editing && (
        <AccountSheet
          charityId={charityId}
          donor={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onRun={run}
        />
      )}
    </div>
  );
}
