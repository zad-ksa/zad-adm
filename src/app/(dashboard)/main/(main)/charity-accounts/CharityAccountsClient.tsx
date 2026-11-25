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
  tbodyClass,
  tdClass,
  theadRowClass,
} from "@/components/console/layout";
import Select from "@/components/console/Select";
import { MONO, btn, cx } from "@/components/console/ui";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { notify } from "@/components/console/toastBus";
import { deleteCharityClientAccount } from "@/app/actions/charityAccounts";
import { charityTitleLabel } from "@/lib/charityPermissions";
import { CharityAccountSheet, type SheetState } from "./CharityAccountSheet";
import type { AccountRow, CharityRow } from "./types";

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

  const shown = useMemo(() => {
    const q = query.trim();
    return accounts.filter((account) => {
      if (charityFilter !== "all" && !account.memberships.some((m) => m.charityId === charityFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        account.name.includes(q) ||
        account.phone.includes(q) ||
        account.memberships.some((m) => m.charityName.includes(q))
      );
    });
  }, [accounts, query, charityFilter]);

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
        footer={shown.length === accounts.length ? `${accounts.length} حساب` : `${shown.length} من ${accounts.length}`}
        empty={
          shown.length === 0 ? (
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
            <Th>الحساب</Th>
            <Th>الجوال</Th>
            <Th>المسمى</Th>
            <Th>العضويات — انقرها لتعديل الوصول</Th>
            {canManage && <Th />}
          </tr>
        </thead>
        <tbody className={tbodyClass}>
          {shown.map((account) => (
            <tr key={account.id}>
              <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>
                {account.name}
              </td>
              <td className={cx(tdClass, MONO, "text-slate-500")} dir="ltr">
                {account.phone}
              </td>
              <td className={cx(tdClass, "text-slate-500 dark:text-slate-400")}>
                {charityTitleLabel(account.title)}
              </td>
              <td className={tdClass}>
                {account.memberships.length === 0 ? (
                  <span className="text-meta text-slate-400">بلا عضوية</span>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {account.memberships.map((membership) => (
                      <li key={membership.charityId}>
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() =>
                            setSheet({ mode: "access", account, charityId: membership.charityId })
                          }
                          className={cx(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption transition-colors outline-none",
                            "focus-visible:ring-2 focus-visible:ring-primary/40",
                            canManage && "hover:border-primary/40",
                            membership.isOfficial
                              ? "border-primary/25 bg-primary/[0.06] text-primary dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-300"
                              : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
                            !membership.isActive && "opacity-50"
                          )}
                          title={
                            membership.isOfficial
                              ? "الحساب الرسمي للجمعية"
                              : `${membership.services.length} خدمة · ${membership.permissions.length} صلاحية`
                          }
                        >
                          {membership.isOfficial && <ShieldCheck aria-hidden className="size-3" />}
                          {membership.charityName}
                          {!membership.isOfficial && (
                            <span className={cx(MONO, "text-slate-400")}>
                              {membership.services.length}/{membership.permissions.length}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              {canManage && (
                <td className={cx(tdClass, "text-end")}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setSheet({ mode: "link", account })}
                      title="ضم إلى جمعية أخرى"
                      aria-label="ضم إلى جمعية أخرى"
                      className={btn.icon}
                    >
                      <Building2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(account)}
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
