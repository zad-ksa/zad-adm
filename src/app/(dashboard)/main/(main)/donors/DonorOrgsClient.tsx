"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { EmptyState, PageHeader, SearchField, Segmented, StatStrip, TableShell, Th, rowClass, tbodyClass, tdClass, theadRowClass } from "@/components/console/layout";
import { Badge, EntityCard, MONO, btn, cx } from "@/components/console/ui";
import Select from "@/components/console/Select";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import { INTAKE_STATUSES } from "@/lib/donorOrg";
import { deleteDonorOrg } from "@/app/actions/donorOrgs";
import DonorSheet from "./DonorSheet";
import type { DonorRow, GrantPair } from "./donorData";

type Charity = { id: string; name: string; isInternal: boolean };
type View = "cards" | "table";
type SortKey = "name" | "charities" | "grants" | "status";

const ALL = "__ALL__";

/**
 * الجهاتُ المانحة — قائمةً بعرضين، ومُرشِّحاً بالجمعية.
 *
 * **ومُرشِّحُ الجمعية لا يُنقص القائمة، بل يُغيّر ما تقوله كلُّ بطاقة**: سؤالُ
 * «هل لهذه الجمعية حسابٌ هنا أم لا» لا جوابَ له إن غابت الجهاتُ التي لا حسابَ
 * لها فيها. فبلا مُرشِّحٍ تقول البطاقةُ «جمعياتُك التي رفعت: ٣» و«الطلبات: ٧»،
 * ومع جمعيةٍ بعينها تقول «الحساب: مُسجَّل» و«المشاريع المرفوعة: ٢».
 *
 * والأعدادُ كلُّها على الجمعيات المسنَدة للرائي لا على الجمعيات كلِّها — ولذلك
 * يقول رأسُ الصفحة ذلك صراحةً، ويُسمّى العمودُ «جمعياتُك». وبغير ذلك يُقارن
 * موظفان رقمَيهما فيَظنّان أحدَهما معطوباً.
 */
export default function DonorOrgsClient({
  charities,
  unrestricted,
  orgs,
  pairs,
}: {
  charities: Charity[];
  unrestricted: boolean;
  orgs: DonorRow[];
  pairs: GrantPair[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [view, setView] = useState<View>("cards");
  const [query, setQuery] = useState("");
  const [charityId, setCharityId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [sort, setSort] = useState<SortKey>("name");
  const [editing, setEditing] = useState<DonorRow | "new" | null>(null);

  /** معرّفُ الجهة ← معرّفُ الجمعية ← عددُ منحها. */
  const byOrg = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const p of pairs) {
      if (!map.has(p.donorOrgId)) map.set(p.donorOrgId, new Map());
      map.get(p.donorOrgId)!.set(p.charityId, p.count);
    }
    return map;
  }, [pairs]);

  const picked = charityId === ALL ? null : charityId;
  const pickedName = charities.find((c) => c.id === picked)?.name ?? "";

  const rows = useMemo(() => {
    const q = query.trim();
    const list = orgs
      .filter((o) => (status === ALL ? true : o.intakeStatus === status))
      .filter((o) => (q ? o.name.includes(q) || (o.fields ?? "").includes(q) : true))
      .map((o) => {
        const perCharity = byOrg.get(o.id);
        const scopedCharities = perCharity ? perCharity.size : 0;
        const scopedGrants = perCharity ? [...perCharity.values()].reduce((a, b) => a + b, 0) : 0;
        return {
          org: o,
          charityCount: scopedCharities,
          grantCount: scopedGrants,
          hasAccount: picked ? o.accountCharityIds.includes(picked) : false,
          charityGrants: picked ? (perCharity?.get(picked) ?? 0) : 0,
        };
      });

    const dir = (a: string, b: string) => a.localeCompare(b, "ar");
    list.sort((a, b) => {
      if (sort === "name") return dir(a.org.name, b.org.name);
      if (sort === "status") {
        if (a.org.intakeStatus !== b.org.intakeStatus) return a.org.intakeStatus === "OPEN" ? -1 : 1;
        return dir(a.org.name, b.org.name);
      }
      const key = sort === "charities" ? "charityCount" : "grantCount";
      const av = picked ? (sort === "charities" ? (a.hasAccount ? 1 : 0) : a.charityGrants) : a[key];
      const bv = picked ? (sort === "charities" ? (b.hasAccount ? 1 : 0) : b.charityGrants) : b[key];
      return bv - av || dir(a.org.name, b.org.name);
    });
    return list;
  }, [orgs, byOrg, query, status, sort, picked]);

  const openCount = orgs.filter((o) => o.intakeStatus === "OPEN").length;
  const totalGrants = useMemo(() => pairs.reduce((sum, p) => sum + p.count, 0), [pairs]);
  const withAccount = picked ? orgs.filter((o) => o.accountCharityIds.includes(picked)).length : null;

  const scopeLine = unrestricted
    ? `${orgs.length} جهة · والأرقامُ على الجمعيات كلِّها (${charities.length})`
    : charities.length === 0
      ? `${orgs.length} جهة · ولا جمعياتٍ مسنَدةً إليك، فالأرقامُ أصفار`
      : `${orgs.length} جهة · والأرقامُ على جمعياتك المسنَدة (${charities.length})`;

  const remove = (org: DonorRow) => {
    void (async () => {
      if (
        !(await confirmAction({
          title: `حذف «${org.name}»؟`,
          message: "لا تُحذف جهةٌ لها حساباتٌ أو منحٌ مرفوعة. والحذفُ لا يُستردّ.",
          confirmLabel: "حذف",
          tone: "danger",
        }))
      ) {
        return;
      }
      const res = await deleteDonorOrg(org.id);
      if (!res.ok) {
        notify("error", res.error);
        return;
      }
      notify("ok", "حُذفت الجهة.");
      startTransition(() => router.refresh());
    })();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        crumbs={[{ label: "تنمية الموارد المالية" }, { label: "الجهات المانحة" }]}
        icon={<Building2 className="size-6" />}
        title="الجهات المانحة"
        description={scopeLine}
        actions={
          <>
            <Segmented
              label="طريقة العرض"
              value={view}
              onChange={setView}
              options={[
                { id: "cards", label: "بطاقات" },
                { id: "table", label: "جدول" },
              ]}
            />
            <button type="button" onClick={() => setEditing("new")} className={btn.primary}>
              <Plus className="size-4" /> إضافة جهة
            </button>
          </>
        }
      />

      <StatStrip
        items={[
          { label: "الجهات", value: orgs.length },
          { label: "مفتوحةٌ للرفع", value: openCount, dot: openCount > 0 ? "active" : "muted" },
          { label: "مغلقة", value: orgs.length - openCount, dot: "muted" },
          picked
            ? { label: `لـ${pickedName} حسابٌ فيها`, value: withAccount ?? 0 }
            : { label: "طلباتُ جمعياتك", value: totalGrants },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          label="بحث في الجهات"
          placeholder="ابحث بالاسم أو بمجالات الدعم…"
          value={query}
          onChange={setQuery}
          className="min-w-[240px] flex-1"
        />
        <Select
          value={charityId}
          onSelect={setCharityId}
          placeholder="كل الجمعيات"
          options={[
            { value: ALL, label: "كل الجمعيات" },
            ...charities.map((c) => ({ value: c.id, label: c.name, hint: c.isInternal ? "كيانٌ داخلي" : undefined })),
          ]}
        />
        <Select
          value={status}
          onSelect={setStatus}
          placeholder="كل الحالات"
          options={[{ value: ALL, label: "كل الحالات" }, ...INTAKE_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
        />
        <Select
          value={sort}
          onSelect={(v) => setSort(v as SortKey)}
          placeholder="الترتيب"
          options={[
            { value: "name", label: "الترتيب: الاسم" },
            { value: "status", label: "الترتيب: المفتوحة أولاً" },
            { value: "charities", label: picked ? "الترتيب: من له حساب" : "الترتيب: عدد الجمعيات" },
            { value: "grants", label: "الترتيب: عدد الطلبات" },
          ]}
        />
      </div>

      {picked && (
        <p className="text-body text-slate-500 dark:text-slate-400">
          الأرقامُ أدناه لـ«{pickedName}» وحدها: هل لها حسابٌ عند الجهة، وكم مشروعاً رفعته إليها.
        </p>
      )}

      {rows.length === 0 ? (
        <TableShell>
          <tbody>
            <tr>
              <td>
                <EmptyState
                  icon={<Search className="size-4" />}
                  title="لا جهةَ تُطابق"
                  description="غيّر البحث أو المُرشِّحات."
                />
              </td>
            </tr>
          </tbody>
        </TableShell>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <EntityCard
              key={r.org.id}
              href={`/main/donors/${r.org.id}`}
              title={r.org.name}
              badge={<Badge tone={r.org.intakeStatus === "OPEN" ? "good" : "neutral"}>{r.org.intakeStatus === "OPEN" ? "مفتوح" : "مغلق"}</Badge>}
              media={<Building2 className="size-4 text-primary/60 dark:text-teal-300/60" />}
              subtitle={
                r.org.opensAt || r.org.closesAt
                  ? `يُفتح ${r.org.opensAt ?? "—"} · يُغلق ${r.org.closesAt ?? "—"}`
                  : "لا موعدَ معلن"
              }
              body={r.org.fields ? <span className="line-clamp-2">{r.org.fields}</span> : <span className="text-slate-400">لا مجالاتَ مسجَّلة</span>}
              stats={
                picked
                  ? [
                      { label: "الحساب", value: r.hasAccount ? "مُسجَّل" : "غير مُسجَّل" },
                      { label: "المشاريع المرفوعة", value: r.charityGrants },
                    ]
                  : [
                      { label: "جمعياتُك التي رفعت", value: r.charityCount },
                      { label: "إجماليُّ الطلبات", value: r.grantCount },
                    ]
              }
              footer={
                <>
                  {r.org.url ? (
                    <a
                      href={r.org.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cx(btn.secondary, "flex-1")}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="size-3.5" /> زيارة الموقع
                    </a>
                  ) : (
                    <span className={cx(btn.secondary, "pointer-events-none flex-1 opacity-50")}>لا رابطَ مسجَّل</span>
                  )}
                  <button type="button" onClick={() => setEditing(r.org)} aria-label={`تعديل ${r.org.name}`} className={btn.icon}>
                    <Pencil className="size-3.5" />
                  </button>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <TableShell footer={`${rows.length} من ${orgs.length} جهة`}>
          <thead>
            <tr className={theadRowClass}>
              <Th>الجهة</Th>
              <Th>الحالة</Th>
              <Th>مجالات الدعم</Th>
              <Th>{picked ? "الحساب" : "جمعياتُك التي رفعت"}</Th>
              <Th>{picked ? "المشاريع المرفوعة" : "إجماليُّ الطلبات"}</Th>
              <Th>يُفتح</Th>
              <Th>يُغلق</Th>
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {rows.map((r) => (
              <tr key={r.org.id} className={rowClass} onClick={() => router.push(`/main/donors/${r.org.id}`)}>
                <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>{r.org.name}</td>
                <td className={tdClass}>
                  <Badge tone={r.org.intakeStatus === "OPEN" ? "good" : "neutral"}>
                    {r.org.intakeStatus === "OPEN" ? "مفتوح" : "مغلق"}
                  </Badge>
                </td>
                <td className={cx(tdClass, "max-w-[320px] text-slate-500 dark:text-slate-400")}>
                  <span className="line-clamp-2">{r.org.fields ?? "—"}</span>
                </td>
                <td className={cx(tdClass, MONO)}>{picked ? (r.hasAccount ? "مُسجَّل" : "—") : r.charityCount}</td>
                <td className={cx(tdClass, MONO)}>{picked ? r.charityGrants : r.grantCount}</td>
                <td className={cx(tdClass, MONO, "text-slate-500")}>{r.org.opensAt ?? "—"}</td>
                <td className={cx(tdClass, MONO, "text-slate-500")}>{r.org.closesAt ?? "—"}</td>
                <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                  <span className="flex items-center gap-1">
                    {r.org.url && (
                      <a href={r.org.url} target="_blank" rel="noreferrer" aria-label="زيارة الموقع" className={btn.icon}>
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                    <button type="button" onClick={() => setEditing(r.org)} aria-label="تعديل" className={btn.icon}>
                      <Pencil className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => remove(r.org)} aria-label="حذف" className={btn.iconDanger}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {editing && (
        <DonorSheet
          kind="FOUNDATION"
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            startTransition(() => router.refresh());
          }}
          counts={
            editing === "new"
              ? null
              : {
                  charities: byOrg.get(editing.id)?.size ?? 0,
                  grants: [...(byOrg.get(editing.id)?.values() ?? [])].reduce((a, b) => a + b, 0),
                }
          }
        />
      )}
    </div>
  );
}
