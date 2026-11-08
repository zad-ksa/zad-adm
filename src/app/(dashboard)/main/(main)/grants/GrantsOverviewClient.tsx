"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HandCoins, Pencil } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  SearchField,
  SortTh,
  StatStrip,
  TableShell,
  Th,
  tbodyClass,
  tdClass,
  theadRowClass,
  type SortDir,
} from "@/components/console/layout";
import { Badge, MONO, btn, cx } from "@/components/console/ui";
import Select from "@/components/console/Select";
import MultiSelect from "@/components/console/MultiSelect";
import { notify } from "@/components/console/toastBus";
import { GRANT_STATUSES, grantStatusLabel, normalizeDonorName } from "@/lib/donorOrg";
import { updateGrantApplicationStatus } from "@/app/actions/charity";
import GrantSheet, { type EditableGrant } from "@/components/grants/GrantSheet";
import GrantStatusDialog, { type StatusTarget } from "@/components/grants/GrantStatusDialog";
import type { GrantOverviewRow } from "../donors/donorData";

type Charity = { id: string; name: string; isInternal: boolean };
type Column = "charity" | "donor" | "initiative" | "amount" | "status" | "date";

const ALL = "__ALL__";

const money = (n: number) => n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 0 });

/**
 * ترتيبُ الحالات ترتيبُ دورةِ الحياة لا ترتيبُ الحروف.
 *
 * ففرزُ الحالة أبجدياً يُجاور «مرفوضة» و«مقبولة» لأنّهما تبدآن بميم، ويضع
 * «قيد الدراسة» بينهما — وهو ترتيبٌ لا يُفيد قارئاً. والمقصودُ من فرز الحالة
 * أن تتجاور المنحُ المتشابهةُ موقفاً، فيُفرز بموضع الحالة في `GRANT_STATUSES`
 * وهو تسلسلُها الطبيعيّ: قيد الدراسة ← مقبولة ← مرفوضة ← مغلقة.
 */
// `Map<string, …>` لا الحروفَ الأربعةَ المُعلَنة: `status` عمودُ نصٍّ في
// المخطَّط لا نوعٌ محصور، فقد يحمل صفٌّ قديمٌ قيمةً ليست منها — فتُقرأ ولا
// تُسقِط الفرزَ، وتُذهب إلى آخر الترتيب بـ`?? 99`.
const STATUS_ORDER = new Map<string, number>(GRANT_STATUSES.map((s, i) => [s.value, i]));

const STATUS_TONE: Record<string, "good" | "danger" | "neutral" | "warn"> = {
  APPROVED: "good",
  REJECTED: "danger",
  CLOSED: "neutral",
  PENDING: "warn",
};

/**
 * جدولُ المنح الجامع: بحثٌ ومُرشِّحاتٌ وفرزٌ بالرأس، وتعديلٌ وتحويلُ حالة.
 *
 * **والفرزُ والبحثُ في المتصفّح لا على الخادم.** والمنحُ مئاتٌ في نطاق الرائي
 * (٢٧ اليوم)، فنقلُها مرّةً واحدةً أرخصُ من طلبٍ لكل حرفٍ يُكتب في البحث —
 * ويبقى الجدولُ يستجيب بلا انتظار. ولو بلغت الآلافَ يوماً فالموضعُ المُغيَّر
 * `loadGrantsOverview` وحدَه.
 */
export default function GrantsOverviewClient({
  grants,
  donors,
  charities,
  unrestricted,
}: {
  grants: GrantOverviewRow[];
  donors: { id: string; name: string }[];
  charities: Charity[];
  unrestricted: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [pickedCharities, setPickedCharities] = useState<string[]>([]);
  const [pickedDonors, setPickedDonors] = useState<string[]>([]);
  const [status, setStatus] = useState(ALL);
  const [column, setColumn] = useState<Column>("date");
  const [dir, setDir] = useState<SortDir>("desc");

  const [editing, setEditing] = useState<EditableGrant | null>(null);
  const [transition, setTransition] = useState<{ grant: StatusTarget; next: "APPROVED" | "CLOSED" } | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  const shown = useMemo(() => {
    // البحثُ بالاسم المسوّى: «مؤسسة» و«مؤسسه»، و«إحسان» و«احسان» — وهي هجاءاتٌ
    // تتناوب في الملفّات التي دخلت منها هذه الصفوف. وبحثٌ حرفيٌّ لا يجد
    // المكتوبَ بهمزةٍ لمن كتبه بغيرها، فيُظنّ أنّ المنحةَ غيرُ موجودة.
    const needle = normalizeDonorName(query);
    const list = grants
      .filter((g) => (pickedCharities.length === 0 ? true : pickedCharities.includes(g.charityId)))
      .filter((g) =>
        pickedDonors.length === 0 ? true : g.donorOrgId !== null && pickedDonors.includes(g.donorOrgId)
      )
      .filter((g) => (status === ALL ? true : g.status === status))
      .filter((g) =>
        needle === ""
          ? true
          : [g.charityName, g.donorName, g.initiativeName].some((t) =>
              normalizeDonorName(t).includes(needle)
            )
      );

    const sign = dir === "asc" ? 1 : -1;
    const text = (a: string, b: string) => a.localeCompare(b, "ar");
    list.sort((a, b) => {
      switch (column) {
        case "charity":
          return sign * text(a.charityName, b.charityName) || b.createdAtMs - a.createdAtMs;
        case "donor":
          return sign * text(a.donorName, b.donorName) || b.createdAtMs - a.createdAtMs;
        case "initiative":
          return sign * text(a.initiativeName, b.initiativeName) || b.createdAtMs - a.createdAtMs;
        case "amount":
          return sign * (a.requestedAmount - b.requestedAmount);
        case "status":
          return (
            sign * ((STATUS_ORDER.get(a.status) ?? 99) - (STATUS_ORDER.get(b.status) ?? 99)) ||
            b.createdAtMs - a.createdAtMs
          );
        default:
          return sign * (a.createdAtMs - b.createdAtMs);
      }
    });
    return list;
  }, [grants, query, pickedCharities, pickedDonors, status, column, dir]);

  /**
   * خياراتُ مُرشِّح الجهات: الاسمُ ومعه عددُ منحه، والمرفوعُ فيها أوّلاً.
   *
   * **ويُحسب العددُ على بقيّة المُرشِّحات لا على مُرشِّح الجهات نفسِه.** فمن
   * قصَر العرضَ على جمعيةٍ رأى الجهاتَ التي رفعت إليها **هذه** الجمعيةُ في
   * الأعلى بأعدادها، وهو سؤالُه حين قصَرَه. ولو حُسب على المُرشِّح نفسِه لصار
   * اختيارُ جهةٍ يُصفِّر أعدادَ ما عداها، فتهبط كلُّها إلى الأسفل وتُفقد
   * القائمةُ معناها عند أوّل نقرة.
   *
   * والصفرُ يبقى معروضاً: جهةٌ بلا منحٍ خبرٌ كجهةٍ لها ثلاث، وحذفُها من
   * القائمة يمنع رفعَ أوّلِ منحةٍ إليها.
   */
  const donorOptions = useMemo(() => {
    const needle = normalizeDonorName(query);
    const counts = new Map<string, number>();

    for (const g of grants) {
      if (g.donorOrgId === null) continue;
      if (pickedCharities.length > 0 && !pickedCharities.includes(g.charityId)) continue;
      if (status !== ALL && g.status !== status) continue;
      if (
        needle !== "" &&
        ![g.charityName, g.donorName, g.initiativeName].some((t) => normalizeDonorName(t).includes(needle))
      )
        continue;
      counts.set(g.donorOrgId, (counts.get(g.donorOrgId) ?? 0) + 1);
    }

    return donors
      .map((d) => ({ value: d.id, label: d.name, count: counts.get(d.id) ?? 0 }))
      // الأكثرُ منحاً أوّلاً، ثمّ بالاسم — والبحثُ في اللوحة يكفي من أراد اسماً
      // بعينه، فالترتيبُ هنا للقراءة لا للعثور.
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ar"));
  }, [donors, grants, pickedCharities, status, query]);

  const onSort = (id: Column, next: SortDir) => {
    setColumn(id);
    setDir(next);
  };

  const sumShown = shown.reduce((sum, g) => sum + g.requestedAmount, 0);
  const approvedShown = shown.filter((g) => g.status === "APPROVED").length;
  const filtering =
    query !== "" || pickedCharities.length > 0 || pickedDonors.length > 0 || status !== ALL;

  /** قيد الدراسة ومرفوضة تمضيان مباشرةً؛ المقبولةُ والمغلقةُ تسألان أوّلاً. */
  const changeStatus = (g: GrantOverviewRow, to: string) => {
    if (to === g.status) return;
    if (to === "APPROVED" || to === "CLOSED") {
      setTransition({
        grant: {
          id: g.id,
          charityId: g.charityId,
          charityName: g.charityName,
          initiativeName: g.initiativeName,
          requestedAmount: g.requestedAmount,
          status: g.status,
        },
        next: to,
      });
      return;
    }
    void (async () => {
      const res = await updateGrantApplicationStatus(g.id, g.charityId, to);
      if (!res.success) {
        notify("error", res.message || "تعذّر تحديث الحالة");
        return;
      }
      notify("ok", `صارت الحالةُ «${grantStatusLabel(to)}».`);
      refresh();
    })();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        crumbs={[{ label: "تنمية الموارد المالية" }, { label: "المنح" }]}
        icon={<HandCoins className="size-6" />}
        title="المنح"
        description={
          unrestricted
            ? "كلُّ ما رُفع إلى كلِّ الجهات المانحة."
            : "كلُّ ما رفعته جمعياتُك المسنَدة إلى كلِّ الجهات المانحة."
        }
      />

      <StatStrip
        items={[
          { label: "المعروضة", value: shown.length, hint: filtering ? `من ${grants.length}` : undefined },
          { label: "مقبولة من المعروضة", value: approvedShown, dot: approvedShown > 0 ? "active" : "muted" },
          { label: "إجمالي المطلوب", value: money(sumShown), unit: "ريال" },
          { label: "جمعيات", value: new Set(shown.map((g) => g.charityId)).size },
          { label: "جهات", value: new Set(shown.map((g) => g.donorName)).size },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={setQuery}
          label="بحث في المنح"
          placeholder="ابحث باسم الجهة أو المشروع أو الجمعية…"
          className="min-w-[260px] flex-1"
        />
        <MultiSelect
          label="الجمعيات"
          placeholder="كل الجمعيات"
          allLabel="كل الجمعيات"
          countNoun="جمعيات"
          values={pickedCharities}
          onChange={setPickedCharities}
          options={charities.map((c) => ({ value: c.id, label: c.name }))}
        />
        <MultiSelect
          label="الجهات المانحة"
          placeholder="كل الجهات"
          allLabel="كل الجهات"
          countNoun="جهات"
          values={pickedDonors}
          onChange={setPickedDonors}
          options={donorOptions}
        />
        <Select
          value={status}
          onSelect={setStatus}
          placeholder="كل الحالات"
          options={[
            { value: ALL, label: "كل الحالات" },
            ...GRANT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
        />
      </div>

      <TableShell
        empty={
          shown.length === 0 ? (
            <EmptyState
              icon={<HandCoins className="size-4" />}
              title={grants.length === 0 ? "لم تُرفع منحةٌ بعد" : "لا منحةَ تُطابق البحثَ والمُرشِّحات"}
              description={
                grants.length === 0
                  ? "تُرفع المنحُ من صفحة الجهة المانحة أو من صفحة منح الجمعية."
                  : undefined
              }
            />
          ) : undefined
        }
        footer={`${shown.length} منحة · إجمالي المطلوب ${money(sumShown)} ريال`}
      >
        <thead>
          <tr className={theadRowClass}>
            <SortTh id="charity" active={column} dir={dir} onSort={onSort}>
              الجمعية
            </SortTh>
            <SortTh id="donor" active={column} dir={dir} onSort={onSort}>
              الجهة المانحة
            </SortTh>
            <SortTh id="initiative" active={column} dir={dir} onSort={onSort}>
              المشروع
            </SortTh>
            <SortTh id="amount" active={column} dir={dir} onSort={onSort}>
              المبلغ المطلوب
            </SortTh>
            <SortTh id="status" active={column} dir={dir} onSort={onSort}>
              الحالة
            </SortTh>
            <SortTh id="date" active={column} dir={dir} onSort={onSort}>
              تاريخ الرفع
            </SortTh>
            <Th className="w-px" />
          </tr>
        </thead>
        <tbody className={tbodyClass}>
          {shown.map((g) => (
            <tr key={g.id}>
              <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>{g.charityName}</td>
              <td className={cx(tdClass, "text-slate-700 dark:text-slate-200")}>
                {g.donorOrgId ? (
                  <Link
                    href={`/main/donors/${g.donorOrgId}`}
                    className="rounded-sm outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:text-teal-300"
                  >
                    {g.donorName}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    {g.donorName}
                    <span className="text-meta text-slate-400">بلا جهةٍ مرتبطة</span>
                  </span>
                )}
              </td>
              <td className={cx(tdClass, "text-slate-700 dark:text-slate-200")}>{g.initiativeName}</td>
              <td className={cx(tdClass, MONO)}>{money(g.requestedAmount)}</td>
              <td className={tdClass}>
                {/* الحالةُ تُقرأ شارةً ملوَّنة لا نصّاً في قائمة: اللونُ هو ما
                    يُقرأ في لمحةٍ على جدولٍ طويل، وهو وجهُ اللون الوحيدُ في
                    هوية اللوحة — حالةٌ لا تزيين. والتغييرُ في عمود الأفعال. */}
                <Badge tone={STATUS_TONE[g.status] ?? "neutral"}>{grantStatusLabel(g.status)}</Badge>
              </td>
              <td className={cx(tdClass, MONO, "text-slate-500")}>{g.createdAt}</td>
              <td className={tdClass}>
                <span className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: g.id,
                        charityId: g.charityId,
                        charityName: g.charityName,
                        donorOrgId: g.donorOrgId,
                        initiativeName: g.initiativeName,
                        requestedAmount: g.requestedAmount,
                      })
                    }
                    aria-label={`تعديل منحة ${g.initiativeName}`}
                    className={btn.icon}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  {/* قائمةٌ بلا قيمة: دعوةٌ ثابتةٌ («الحالة») لا عرضٌ لما هو
                      مختار — فالمختارُ معروضٌ شارةً في عموده، وقائمةٌ تُعيده
                      تُكرِّره وتُغري بتغييرٍ لم يُقصد. والحالةُ الحاضرةُ تُحذف
                      من الخيارات: اختيارُ ما هو حاصلٌ ليس فعلاً. */}
                  <Select
                    onSelect={(to) => changeStatus(g, to)}
                    placeholder="الحالة"
                    options={GRANT_STATUSES.filter((s) => s.value !== g.status).map((s) => ({
                      value: s.value,
                      label: s.label,
                    }))}
                  />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      {editing && (
        <GrantSheet
          grant={editing}
          donorOptions={donors}
          charities={charities}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {transition && (
        <GrantStatusDialog
          grant={transition.grant}
          next={transition.next}
          onClose={() => setTransition(null)}
          onSaved={() => {
            setTransition(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
