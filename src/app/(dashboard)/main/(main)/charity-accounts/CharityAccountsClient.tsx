"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Pencil, Plus, ShieldCheck, Trash2, Users, X } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  SearchField,
  Segmented,
  StatStrip,
  TableShell,
  Th,
  tbodyClass,
  theadRowClass,
} from "@/components/console/layout";
import Select from "@/components/console/Select";
import { Avatar, Badge, Count, Dot, MONO, btn, cx } from "@/components/console/ui";
import { MenuItem, MenuSeparator, RowMenu, RowMenuTrigger, useRowMenu } from "@/components/console/overlays";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { notify } from "@/components/console/toastBus";
import { deleteCharityClientAccount } from "@/app/actions/charityAccounts";
import { charityMemberLabel } from "@/lib/charityPermissions";
import { CharityAccountSheet, type SheetState } from "./CharityAccountSheet";
import type { AccountRow, CharityRow, Membership } from "./types";

type StatusFilter = "all" | "official" | "member";

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "official", label: "رسمي" },
  { id: "member", label: "عضو" },
];

/** صفُّ العرض: عضويّةٌ في جمعية — أو حسابٌ لا عضويّةَ له بعد. */
type Row = { account: AccountRow; membership: Membership | null };

/**
 * حسابات الجمعيات — شاشةُ موارد بشريّة بهيئة شاشة موظّفي زاد.
 *
 * **ووحدةُ الصفِّ عضويّةٌ لا حساب**: السؤالُ «من يعمل في أيِّ جمعيةٍ وبأيِّ
 * صفة»، والمسمّى والخدماتُ والصلاحيّاتُ كلُّها لجمعيةٍ بعينها. وحسابٌ في
 * جمعيّتين يُقرأ صفّين، وهو الصواب: هو عضوان في العمل وإن كان حساباً واحداً
 * في القاعدة. وحسابٌ بلا عضويّةٍ يُعرض صفّاً كي لا يختفي من يحتاج إسناداً.
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
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [toDelete, setToDelete] = useState<AccountRow | null>(null);
  const menu = useRowMenu();

  const allRows: Row[] = useMemo(
    () =>
      accounts.flatMap<Row>((account) =>
        account.memberships.length === 0
          ? [{ account, membership: null }]
          : account.memberships.map((membership) => ({ account, membership }))
      ),
    [accounts]
  );

  const visible = useMemo(() => {
    const q = query.trim();
    return allRows.filter(({ account, membership }) => {
      if (charityFilter !== "all" && membership?.charityId !== charityFilter) return false;
      if (status === "official" && !membership?.isOfficial) return false;
      if (status === "member" && (!membership || membership.isOfficial)) return false;
      if (!q) return true;
      return (
        account.name.includes(q) ||
        account.phone.includes(q) ||
        (membership?.charityName.includes(q) ?? false)
      );
    });
  }, [allRows, query, charityFilter, status]);

  const stats = useMemo(() => {
    const officials = allRows.filter((r) => r.membership?.isOfficial).length;
    const withOfficial = new Set(
      allRows.filter((r) => r.membership?.isOfficial).map((r) => r.membership!.charityId)
    );
    return {
      accounts: accounts.length,
      memberships: allRows.filter((r) => r.membership).length,
      officials,
      orphans: charities.filter((c) => !withOfficial.has(c.id)).length,
    };
  }, [allRows, accounts.length, charities]);

  const filtered = query.trim() !== "" || charityFilter !== "all" || status !== "all";
  const clearFilters = () => {
    setQuery("");
    setCharityFilter("all");
    setStatus("all");
  };

  /** الصفُّ المفتوحُ قائمتُه — بمعرّفٍ مركَّبٍ لأنّ الحسابَ قد يتكرّر. */
  const menuRow = visible.find(
    (r) => `${r.account.id}:${r.membership?.charityId ?? "none"}` === menu.anchor?.id
  );

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
    <div className="space-y-6 pb-10 text-slate-900 dark:text-slate-100">
      <PageHeader
        crumbs={[{ label: "لوحة التحكم", href: "/main/admin" }, { label: "حسابات الجمعيات" }]}
        title="حسابات الجمعيات"
        description="حسابات موظفي الجمعيات: أين هو عضو، وبأي صفة، وما يصل إليه من خدمات وصلاحيات."
        actions={
          canManage ? (
            <button type="button" onClick={() => setSheet({ mode: "add" })} className={btn.primary}>
              <Plus className="size-4" />
              إضافة حساب
            </button>
          ) : undefined
        }
      />

      <StatStrip
        items={[
          {
            label: "الحسابات",
            value: stats.accounts,
            hint: `${stats.memberships} عضوية`,
            onClick: clearFilters,
          },
          {
            label: "حسابات رسمية",
            value: stats.officials,
            hint: "تمنح غيرها",
            dot: "active",
            onClick: () => setStatus("official"),
            selected: status === "official",
          },
          {
            label: "أعضاء",
            value: stats.memberships - stats.officials,
            hint: "بصلاحيات محددة",
            onClick: () => setStatus("member"),
            selected: status === "member",
          },
          {
            label: "جمعيات بلا حساب رسمي",
            value: stats.orphans,
            hint: stats.orphans > 0 ? "لا تستطيع منح أحد" : "كلها مغطاة",
            dot: stats.orphans > 0 ? "danger" : "muted",
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
        <div className="flex items-center gap-2">
          <Segmented options={STATUS_OPTIONS} value={status} onChange={setStatus} label="الصفة" />
          <Select
            value={charityFilter}
            onSelect={setCharityFilter}
            placeholder="كل الجمعيات"
            options={[
              { value: "all", label: "كل الجمعيات" },
              ...charities.map((c) => ({ value: c.id, label: c.name })),
            ]}
            className="min-w-40"
          />
        </div>
        {filtered && (
          <button type="button" onClick={clearFilters} className={cx(btn.ghost, "md:ms-auto")}>
            <X className="size-3.5" />
            مسح التصفية
          </button>
        )}
      </div>

      <TableShell
        empty={
          visible.length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" />}
              title={accounts.length === 0 ? "لا حسابات بعد" : "لا نتائج مطابقة"}
              description={
                accounts.length === 0
                  ? "أنشئ حسابا وأسنده إلى جمعية، ثم حدد خدماته وصلاحياته فيها."
                  : "جرّب كلمة بحث أخرى أو امسح التصفية."
              }
              action={
                accounts.length === 0 ? (
                  canManage ? (
                    <button type="button" onClick={() => setSheet({ mode: "add" })} className={btn.primary}>
                      <Plus className="size-4" />
                      إضافة حساب
                    </button>
                  ) : undefined
                ) : (
                  <button type="button" onClick={clearFilters} className={btn.secondary}>
                    مسح التصفية
                  </button>
                )
              }
            />
          ) : undefined
        }
        footer={
          visible.length > 0 ? (
            <>
              عرض <span className={MONO}>{visible.length}</span> من{" "}
              <span className={MONO}>{allRows.length}</span>
            </>
          ) : undefined
        }
      >
        <thead>
          <tr className={theadRowClass}>
            <Th>العضو</Th>
            <Th className="hidden sm:table-cell">الجمعية</Th>
            <Th className="hidden md:table-cell">المسمى</Th>
            <Th className="hidden lg:table-cell">الوصول</Th>
            <Th>الصفة</Th>
            <th className="w-12" aria-label="إجراءات" />
          </tr>
        </thead>
        <tbody className={tbodyClass}>
          {visible.map(({ account, membership }) => {
            const key = `${account.id}:${membership?.charityId ?? "none"}`;
            const official = !!membership?.isOfficial;
            const open = () => {
              if (canManage && membership) {
                setSheet({ mode: "access", account, charityId: membership.charityId });
              }
            };
            const nothing =
              !!membership &&
              !official &&
              membership.services.length === 0 &&
              membership.permissions.length === 0;

            return (
              <tr
                key={key}
                onClick={open}
                className={cx(
                  "transition-colors",
                  canManage && membership && "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                  membership && !membership.isActive && "text-slate-500"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={account.name} />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          open();
                        }}
                        disabled={!canManage || !membership}
                        className="block max-w-[16rem] truncate text-right text-body font-medium text-slate-900 outline-none hover:underline focus-visible:underline disabled:no-underline dark:text-slate-100"
                      >
                        {account.name}
                      </button>
                      <span className={cx(MONO, "block text-meta text-slate-500 dark:text-slate-400")} dir="ltr">
                        {account.phone}
                      </span>
                      <span className="block text-meta text-slate-500 sm:hidden">
                        {membership?.charityName ?? "بلا عضوية"}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="hidden px-4 py-3 sm:table-cell">
                  {membership ? (
                    <span className="flex items-center gap-1.5 text-body text-slate-700 dark:text-slate-200">
                      {official && (
                        <ShieldCheck aria-hidden className="size-3.5 shrink-0 text-primary dark:text-teal-300" />
                      )}
                      {membership.charityName}
                    </span>
                  ) : (
                    <span className="text-body text-amber-600 dark:text-amber-400">لا شيء</span>
                  )}
                </td>

                <td className="hidden px-4 py-3 md:table-cell">
                  {membership ? (
                    <Badge tone={official ? "brand" : "neutral"}>
                      {charityMemberLabel(official, membership.title) || "بلا مسمى"}
                    </Badge>
                  ) : (
                    <span className="text-body text-slate-400">—</span>
                  )}
                </td>

                <td className="hidden px-4 py-3 lg:table-cell">
                  {!membership ? (
                    <span className="text-body text-slate-400">—</span>
                  ) : official ? (
                    <span className="text-body text-slate-600 dark:text-slate-300">وصول كامل</span>
                  ) : nothing ? (
                    <Badge tone="warn">بلا صلاحيات</Badge>
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body text-slate-600 dark:text-slate-300">
                      <Count n={membership.services.length} unit="خدمة" />
                      <Dot />
                      <Count n={membership.permissions.length} unit="صلاحية" />
                    </span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-body">
                    <span
                      aria-hidden
                      className={cx(
                        "size-2 rounded-full",
                        !membership
                          ? "bg-amber-500 shadow-[0_0_0_3px_rgb(245_158_11/0.15)]"
                          : membership.isActive
                            ? "bg-emerald-500 shadow-[0_0_0_3px_rgb(16_185_129/0.15)]"
                            : "bg-slate-400"
                      )}
                    />
                    <span
                      className={
                        membership?.isActive ? "text-slate-700 dark:text-slate-200" : "text-slate-500"
                      }
                    >
                      {!membership
                        ? "بلا إسناد"
                        : official
                          ? "حساب الجمعية"
                          : membership.isActive
                            ? "نشط"
                            : "موقوف"}
                    </span>
                  </span>
                </td>

                <td className="px-2 py-3">
                  <RowMenuTrigger
                    label={`إجراءات ${account.name}`}
                    expanded={menu.anchor?.id === key}
                    onToggle={(e) => menu.toggle(e, key)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>

      <RowMenu anchor={menu.anchor}>
        {menuRow && (
          <>
            <MenuItem
              icon={<Pencil className="size-4" />}
              disabled={!canManage || !menuRow.membership}
              onClick={() => {
                if (menuRow.membership) {
                  setSheet({
                    mode: "access",
                    account: menuRow.account,
                    charityId: menuRow.membership.charityId,
                  });
                }
                menu.close();
              }}
            >
              تعديل الوصول في هذه الجمعية
            </MenuItem>
            <MenuItem
              icon={<Building2 className="size-4" />}
              disabled={!canManage}
              onClick={() => {
                setSheet({ mode: "link", account: menuRow.account });
                menu.close();
              }}
            >
              ضم إلى جمعية أخرى
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon={<Trash2 className="size-4" />}
              tone="danger"
              disabled={!canManage}
              onClick={() => {
                setToDelete(menuRow.account);
                menu.close();
              }}
            >
              حذف الحساب
            </MenuItem>
          </>
        )}
      </RowMenu>

      {stats.orphans > 0 && (
        <p className="text-meta text-slate-500 dark:text-slate-400">
          {stats.orphans} جمعية بلا حساب رسمي — ولا يستطيع أحد داخلها منح الصلاحيات حتى ينشأ لها
          واحد.
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
