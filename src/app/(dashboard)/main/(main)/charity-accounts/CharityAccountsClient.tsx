"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  SearchField,
  StatStrip,
  TableShell,
  Th,
  rowClass,
  tbodyClass,
  tdClass,
  theadRowClass,
} from "@/components/console/layout";
import Select from "@/components/console/Select";
import { Badge, MONO, btn, cx } from "@/components/console/ui";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { notify } from "@/components/console/toastBus";
import { deleteCharityClientAccount } from "@/app/actions/charityAccounts";
import { charityMemberLabel } from "@/lib/charityPermissions";
import { CharityAccountSheet, type SheetState } from "./CharityAccountSheet";
import type { AccountRow, CharityRow, Membership } from "./types";

/**
 * حسابات الجمعيات — شاشةُ موارد بشرية كشاشة موظّفي زاد.
 *
 * **وكانت نموذجاً في نافذةٍ وجدولاً تحته**: الحسابُ صفٌّ واحدٌ مهما خدم من
 * جمعيات، ووصولُه في كلٍّ منها لا يُرى إلا بفتح لوحٍ منفصل. فصار الصفُّ
 * يعرض عضويّاتِه شاراتٍ تُنقر، فيُقرأ «أين هو وبأي صفة» من الجدول.
 *
 * **والضمُّ إلى جمعيةٍ أخرى من الصفِّ نفسِه**: الحسابُ واحدٌ لصاحبه، وكان
 * ضمُّه إلى جمعيةٍ ثانيةٍ متعذِّراً — فيُنشأ له حسابٌ ثانٍ برقمه، والقاعدةُ
 * تردُّه.
 */
export default function CharityAccountsClient({
  charities,
  accounts,
  canManage,
}: {
  charities: CharityRow[];
  accounts: AccountRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [query, setQuery] = useState("");
  const [charityFilter, setCharityFilter] = useState("all");
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [toDelete, setToDelete] = useState<AccountRow | null>(null);

  const stats = useMemo(() => {
    const officials = accounts.filter((a) => a.memberships.some((m) => m.isOfficial)).length;
    const multi = accounts.filter((a) => a.memberships.length > 1).length;
    // جمعيةٌ بلا حسابٍ رسميّ لا تستطيع منحَ أحد — وهو أهمُّ رقمٍ هنا.
    const withOfficial = new Set(
      accounts.flatMap((a) => a.memberships.filter((m) => m.isOfficial).map((m) => m.charityId))
    );
    return {
      total: accounts.length,
      officials,
      multi,
      orphanCharities: charities.filter((c) => !withOfficial.has(c.id)).length,
    };
  }, [accounts, charities]);

  /**
   * صفٌّ لكلِّ عضويّةٍ لا لكلِّ حساب.
   *
   * **ووحدةُ هذه الشاشة عضويّةٌ لا حساب**: السؤالُ «من يعمل في أيِّ جمعيةٍ
   * وبأيِّ صفة»، والمسمّى والخدماتُ والصلاحيّاتُ كلُّها لجمعيةٍ بعينها. وحسابٌ
   * في جمعيّتين يُقرأ صفّين، وهو الصواب: هو شخصان في العمل وإن كان حساباً
   * واحداً في القاعدة. وحسابٌ بلا عضويّةٍ يُعرض صفّاً كي لا يختفي.
   */
  const allRows = useMemo(
    () =>
      accounts.flatMap((account) =>
        account.memberships.length === 0
          ? [{ account, membership: null as Membership | null }]
          : account.memberships.map((membership) => ({ account, membership }))
      ),
    [accounts]
  );

  const rows = useMemo(() => {
    const q = query.trim();
    return allRows.filter(({ account, membership }) => {
      if (charityFilter !== "all" && membership?.charityId !== charityFilter) return false;
      if (!q) return true;
      return (
        account.name.includes(q) ||
        account.phone.includes(q) ||
        (membership?.charityName.includes(q) ?? false)
      );
    });
  }, [allRows, query, charityFilter]);

  const filtered = query.trim() !== "" || charityFilter !== "all";

  const remove = () => {
    if (!toDelete) return;
    const target = toDelete;
    start(async () => {
      const res = await deleteCharityClientAccount(target.id);
      setToDelete(null);
      if (!res.success) {
        notify("error", res.error ?? "تعذر الحذف");
        return;
      }
      notify("ok", "حذف الحساب.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        crumbs={[{ label: "لوحة التحكم", href: "/main/admin" }, { label: "حسابات الجمعيات" }]}
        icon={<Users className="size-6" />}
        title="حسابات الجمعيات"
        description="حسابات موظفي الجمعيات: أين هو عضو، وبأي صفة، وما يصل إليه من خدمات وصلاحيات."
        actions={
          canManage ? (
            <button type="button" onClick={() => setSheet({ mode: "add" })} className={btn.primary}>
              <Plus className="size-4" />
              حساب جديد
            </button>
          ) : undefined
        }
      />

      <StatStrip
        items={[
          { label: "الحسابات", value: stats.total, hint: `في ${charities.length} جمعية` },
          { label: "حسابات رسمية", value: stats.officials, hint: "تمنح غيرها", dot: "active" },
          { label: "يخدم أكثر من جمعية", value: stats.multi },
          {
            label: "جمعيات بلا حساب رسمي",
            value: stats.orphanCharities,
            hint: stats.orphanCharities > 0 ? "لا تستطيع منح أحد" : undefined,
            dot: stats.orphanCharities > 0 ? "danger" : "muted",
          },
        ]}
      />

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <SearchField
          className="md:w-80"
          value={query}
          onChange={setQuery}
          placeholder="ابحث بالاسم أو الجوال أو الجمعية"
          label="بحث في الحسابات"
        />
        <Select
          value={charityFilter}
          onSelect={setCharityFilter}
          placeholder="كل الجمعيات"
          options={[
            { value: "all", label: "كل الجمعيات" },
            ...charities.map((c) => ({ value: c.id, label: c.name })),
          ]}
          className="min-w-44"
        />
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCharityFilter("all");
            }}
            className={cx(btn.ghost, "md:ms-auto")}
          >
            <X className="size-3.5" />
            مسح التصفية
          </button>
        )}
      </div>

      <TableShell
        footer={
          rows.length === allRows.length
            ? `${allRows.length} عضوية في ${accounts.length} حساب`
            : `${rows.length} من ${allRows.length}`
        }
        empty={
          rows.length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" />}
              title={accounts.length === 0 ? "لا حسابات بعد" : "لا نتائج مطابقة"}
              description={
                accounts.length === 0
                  ? "أنشئ حسابا وأسنده إلى جمعية، ثم حدد خدماته وصلاحياته فيها."
                  : "امسح التصفية أو جرب كلمة أخرى."
              }
            />
          ) : undefined
        }
      >
        <thead>
          <tr className={theadRowClass}>
            <Th>العضو</Th>
            <Th>الجمعية</Th>
            <Th>المسمى</Th>
            <Th>الخدمات</Th>
            <Th>الصلاحيات</Th>
            {canManage && <Th />}
          </tr>
        </thead>
        <tbody className={tbodyClass}>
          {rows.map(({ account, membership }) => (
            <tr
              key={`${account.id}:${membership?.charityId ?? "none"}`}
              onClick={() =>
                canManage &&
                membership &&
                setSheet({ mode: "access", account, charityId: membership.charityId })
              }
              className={cx(canManage && membership && rowClass)}
            >
              <td className={tdClass}>
                <span className="block font-medium text-slate-900 dark:text-slate-100">
                  {account.name}
                </span>
                <span className={cx(MONO, "block text-meta text-slate-400")} dir="ltr">
                  {account.phone}
                </span>
              </td>

              <td className={tdClass}>
                {membership ? (
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    {membership.isOfficial && (
                      <ShieldCheck aria-hidden className="size-3.5 text-primary dark:text-teal-300" />
                    )}
                    {membership.charityName}
                  </span>
                ) : (
                  <span className="text-slate-400">بلا عضوية</span>
                )}
              </td>

              <td className={cx(tdClass, "text-slate-500 dark:text-slate-400")}>
                {membership
                  ? charityMemberLabel(membership.isOfficial, membership.title) || "—"
                  : "—"}
              </td>

              <td className={tdClass}>
                {!membership ? (
                  <span className="text-slate-400">—</span>
                ) : membership.isOfficial ? (
                  <Badge tone="brand">كل الخدمات</Badge>
                ) : membership.services.length === 0 ? (
                  <span className="text-meta text-slate-400">لا خدمة</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {membership.services.slice(0, 2).map((name) => (
                      <Badge key={name} tone="neutral">
                        {name}
                      </Badge>
                    ))}
                    {membership.services.length > 2 && (
                      <Badge tone="neutral">+{membership.services.length - 2}</Badge>
                    )}
                  </span>
                )}
              </td>

              <td className={cx(tdClass, MONO, "text-slate-500")}>
                {!membership ? "—" : membership.isOfficial ? "الكل" : membership.permissions.length}
              </td>

              {canManage && (
                <td className={cx(tdClass, "text-end")}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSheet({ mode: "link", account });
                      }}
                      title="ضم إلى جمعية أخرى"
                      aria-label="ضم إلى جمعية أخرى"
                      className={btn.icon}
                    >
                      <Building2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setToDelete(account);
                      }}
                      title="حذف الحساب"
                      aria-label="حذف الحساب"
                      className={btn.iconDanger}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </TableShell>

      {stats.orphanCharities > 0 && (
        <p className="flex items-center gap-1.5 text-meta text-slate-500 dark:text-slate-400">
          <UserPlus aria-hidden className="size-3.5 text-slate-400" />
          {stats.orphanCharities} جمعية بلا حساب رسمي — ولا يستطيع أحد داخلها منح الصلاحيات حتى
          ينشأ لها واحد.
        </p>
      )}

      {sheet && (
        <CharityAccountSheet
          state={sheet}
          charities={charities}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!toDelete}
        title={toDelete ? `حذف حساب «${toDelete.name}»؟` : ""}
        message="يحذف الحساب وعضوياته في كل الجمعيات، ولا يمكن التراجع."
        confirmLabel="حذف"
        tone="danger"
        isPending={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={remove}
      />
    </div>
  );
}
