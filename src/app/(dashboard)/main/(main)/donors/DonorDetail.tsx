"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarClock, ExternalLink, FileText, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Badge, MONO, btn, cx, field } from "@/components/console/ui";
import { CopyButton, SecretValue } from "@/components/console/Copy";
import { Sheet } from "@/components/console/overlays";
import Select from "@/components/console/Select";
import MultiSelect from "@/components/console/MultiSelect";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import { GRANT_STATUSES, grantStatusLabel } from "@/lib/donorOrg";
import { deleteDonorAccountRow, saveDonorAccount } from "@/app/actions/donorOrgs";
import { updateGrantApplicationStatus } from "@/app/actions/charity";
import GrantSheet, { type EditableGrant } from "@/components/grants/GrantSheet";
import GrantStatusDialog, { type StatusTarget } from "@/components/grants/GrantStatusDialog";
import DonorSheet from "./DonorSheet";
import type { DonorAccountRow, DonorGrantRow, DonorRow } from "./donorData";

type Charity = { id: string; name: string; isInternal: boolean };
type GrantSort = "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "charity" | "status";


const GRANT_SORTS: { value: GrantSort; label: string }[] = [
  { value: "date-desc", label: "الترتيب: الأحدث أولاً" },
  { value: "date-asc", label: "الترتيب: الأقدم أولاً" },
  { value: "amount-desc", label: "الترتيب: الأكبر مبلغاً" },
  { value: "amount-asc", label: "الترتيب: الأصغر مبلغاً" },
  { value: "charity", label: "الترتيب: الجمعية" },
  { value: "status", label: "الترتيب: الحالة" },
];

const money = (n: number) => n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 0 });

/**
 * صفحةُ جهةٍ مانحة: حساباتُ الجمعيات عندها، ثم المنحُ المرفوعة إليها.
 *
 * وهي صفحةٌ واحدةٌ لثلاثة تبويبات (الجهات، منصة إحسان، صندوق دعم الجمعيات) لأن
 * الثلاثةَ شيءٌ واحدٌ باختلاف النوع. و`underDevelopment` يَسم التبويبين اللذين
 * لم يُصمَّما بعد.
 *
 * و`showAccounts` يُطفئ جدولَ حسابات الدخول — مُطفأٌ في «منصة إحسان» و«صندوق
 * دعم الجمعيات»: الدخولُ إليهما ليس بحسابٍ لكل جمعيةٍ كجهاتِ المنح، فجدولٌ
 * بصفوفٍ فارغةٍ لكل جمعيةٍ يَعِد بما لا يوجد. والمنحُ تبقى كما هي.
 *
 * والجمعياتُ المعروضةُ جمعياتُ الرائي المسنَدة وحدها — حساباً كانت أو منحاً.
 */
export default function DonorDetail({
  org,
  kind,
  charities,
  accounts,
  grants,
  underDevelopment = false,
  showAccounts = true,
}: {
  org: DonorRow;
  kind: string;
  charities: Charity[];
  accounts: DonorAccountRow[];
  grants: DonorGrantRow[];
  underDevelopment?: boolean;
  showAccounts?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingOrg, setEditingOrg] = useState(false);
  const [accountFor, setAccountFor] = useState<{ charity: Charity; row: DonorAccountRow | null } | null>(null);
  const [addingGrant, setAddingGrant] = useState(false);
  const [editingGrant, setEditingGrant] = useState<EditableGrant | null>(null);
  const [statusFor, setStatusFor] = useState<{ grant: StatusTarget; next: "APPROVED" | "CLOSED" } | null>(null);

  const [pickedCharities, setPickedCharities] = useState<string[]>([]);
  // حالاتٌ لا حالة: «المقبولة والمغلقة» سؤالٌ واحد، وكان يلزمه نظرتان بمُرشِّحٍ
  // مفرد. وقائمةٌ فارغةٌ تعني «الكلّ» كمُرشِّح الجمعيات — فلا خيارَ «كل الحالات»
  // يُزاحم الحالاتِ في القائمة.
  const [pickedStatuses, setPickedStatuses] = useState<string[]>([]);
  const [sort, setSort] = useState<GrantSort>("date-desc");

  const accountOf = useMemo(() => new Map(accounts.map((a) => [a.charityId, a])), [accounts]);

  /** كم منحةً في كل حالة — بعد مُرشِّح الجمعيات وحدَه. */
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of grants) {
      if (pickedCharities.length > 0 && !pickedCharities.includes(g.charityId)) continue;
      counts.set(g.status, (counts.get(g.status) ?? 0) + 1);
    }
    return counts;
  }, [grants, pickedCharities]);

  const shownGrants = useMemo(() => {
    const dir = (a: string, b: string) => a.localeCompare(b, "ar");
    const list = grants
      .filter((g) => (pickedCharities.length === 0 ? true : pickedCharities.includes(g.charityId)))
      .filter((g) => (pickedStatuses.length === 0 ? true : pickedStatuses.includes(g.status)));

    list.sort((a, b) => {
      switch (sort) {
        case "date-asc":
          return a.createdAtMs - b.createdAtMs;
        case "amount-desc":
          return b.requestedAmount - a.requestedAmount;
        case "amount-asc":
          return a.requestedAmount - b.requestedAmount;
        case "charity":
          return dir(a.charityName, b.charityName) || b.createdAtMs - a.createdAtMs;
        case "status":
          return dir(a.status, b.status) || b.createdAtMs - a.createdAtMs;
        default:
          return b.createdAtMs - a.createdAtMs;
      }
    });
    return list;
  }, [grants, pickedCharities, pickedStatuses, sort]);

  const sumRequested = shownGrants.reduce((sum, g) => sum + g.requestedAmount, 0);
  const distinctCharities = new Set(shownGrants.map((g) => g.charityId)).size;
  const scopedCharityCount = new Set(grants.map((g) => g.charityId)).size;

  /**
   * تحويلُ حالة منحة — والمقبولةُ والمغلقةُ تسألان أوّلاً.
   *
   * فالاعتمادُ يكتب سجلّاً ماليّاً بالمبلغ المعتمد ويُجدوِل أقساطَ العقد،
   * والإغلاقُ يلزمه تاريخُه. وهما في `GrantStatusDialog` المشترك نفسِه الذي
   * يستعمله جدولُ المنح — فلا يختلف الاعتمادُ بحسب الصفحة التي جرى منها.
   */
  const changeGrantStatus = (g: DonorGrantRow, to: string) => {
    if (to === g.status) return;
    if (to === "APPROVED" || to === "CLOSED") {
      setStatusFor({
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
      startTransition(() => router.refresh());
    })();
  };

  const removeAccount = (row: DonorAccountRow, charityName: string) => {
    void (async () => {
      if (
        !(await confirmAction({
          title: `حذف حساب «${charityName}»؟`,
          message: "يُحذف اسمُ المستخدم وكلمةُ المرور من الموقع. والحسابُ عند الجهة يبقى كما هو.",
          confirmLabel: "حذف",
          tone: "danger",
        }))
      ) {
        return;
      }
      const res = await deleteDonorAccountRow(row.id);
      if (!res.ok) {
        notify("error", res.error);
        return;
      }
      notify("ok", "حُذف الحساب.");
      startTransition(() => router.refresh());
    })();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        crumbs={[
          { label: "تنمية الموارد المالية" },
          ...(kind === "FOUNDATION" ? [{ label: "الجهات المانحة", href: "/main/donors" }] : []),
          { label: org.name },
        ]}
        icon={<Building2 className="size-6" />}
        title={org.name}
        description={
          <>
            {underDevelopment && (
              <span className="me-2 align-middle">
                <Badge tone="gold">تحت التطوير</Badge>
              </span>
            )}
            {org.fields ?? "لا مجالاتَ دعمٍ مسجَّلة"}
          </>
        }
        actions={
          <>
            {org.url ? (
              <a href={org.url} target="_blank" rel="noreferrer" className={btn.secondary}>
                <ExternalLink className="size-4" /> زيارة الموقع
              </a>
            ) : (
              <span className={cx(btn.secondary, "pointer-events-none opacity-50")}>لا رابطَ مسجَّل</span>
            )}
            <button type="button" onClick={() => setEditingOrg(true)} className={btn.primary}>
              <Pencil className="size-4" /> تعديل
            </button>
          </>
        }
      />

      <StatStrip
        items={[
          {
            label: "حالة الرفع",
            value: org.intakeStatus === "OPEN" ? "مفتوح" : "مغلق",
            hint: org.intakeReason,
            dot: org.intakeStatus === "OPEN" ? "active" : "muted",
          },
          { label: "يُفتح", value: org.opensAt ?? "—" },
          { label: "يُغلق", value: org.closesAt ?? "—" },
          { label: "جمعياتُك التي رفعت", value: scopedCharityCount },
          { label: "إجماليُّ الطلبات", value: grants.length },
        ]}
      />

      {org.intakeMode === "AUTO" && (
        <p className="flex items-center gap-2 text-body text-slate-500 dark:text-slate-400">
          <CalendarClock className="size-4 shrink-0" />
          الحالةُ محسوبةٌ من التاريخين: {org.intakeReason}. ولا تُضبط يدوياً ما دام لها موعدٌ مسجَّل.
        </p>
      )}

      {/* ── حساباتُ الدخول ──────────────────────────────────────────────── */}
      {showAccounts && (
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-section font-semibold tracking-tight">
              <KeyRound className="size-4 text-primary dark:text-teal-300" />
              حسابات الدخول
            </h2>
            <p className="mt-0.5 text-body text-slate-500 dark:text-slate-400">
              صفٌّ لكل جمعيةٍ من جمعياتك المسنَدة. وكلمةُ المرور مُغطّاةٌ حتى تُكشف.
            </p>
          </div>
        </div>

        {charities.length === 0 ? (
          <div className={tableFrameClass}>
            <EmptyState
              icon={<KeyRound className="size-4" />}
              title="لا جمعياتٍ مسنَدةً إليك"
              description="تُسنَد الجمعياتُ من إدارة الموظفين، ثم تظهر صفوفُها هنا."
            />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr className={theadRowClass}>
                <Th>الجمعية</Th>
                <Th>اسم المستخدم</Th>
                <Th>كلمة المرور</Th>
                <Th className="w-px" />
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {charities.map((c) => {
                const row = accountOf.get(c.id) ?? null;
                return (
                  <tr key={c.id}>
                    <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>
                      {c.name}
                      {c.isInternal && <span className="ms-2 text-meta text-slate-400">كيانٌ داخلي</span>}
                    </td>
                    <td className={tdClass}>
                      {row ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cx(MONO, "text-body text-slate-700 dark:text-slate-200")} dir="ltr">
                            {row.username}
                          </span>
                          <CopyButton value={row.username} title="نسخ اسم المستخدم" />
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className={tdClass}>
                      <SecretValue value={row?.password ?? null} />
                    </td>
                    <td className={tdClass}>
                      <span className="flex items-center gap-1">
                        {row ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setAccountFor({ charity: c, row })}
                              aria-label={`تعديل حساب ${c.name}`}
                              className={btn.icon}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAccount(row, c.name)}
                              aria-label={`حذف حساب ${c.name}`}
                              className={btn.iconDanger}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAccountFor({ charity: c, row: null })}
                            className={btn.secondary}
                          >
                            <Plus className="size-3.5" /> إضافة حساب
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </section>
      )}

      {/* ── المنحُ المرفوعة ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-section font-semibold tracking-tight">
              <FileText className="size-4 text-primary dark:text-teal-300" />
              المنح المرفوعة لهذه الجهة
            </h2>
            <p className="mt-0.5 text-body text-slate-500 dark:text-slate-400">
              من جمعياتك المسنَدة — تُفرز وتُفلتر بجمعيةٍ أو أكثر.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* الرفعُ من هنا والجهةُ مثبَّتةٌ، ومن صفحة منح الجمعية والجمعيةُ
                مثبَّتة — فعلٌ واحدٌ (`addGrantApplication`) بوجهين، لا منطقٌ
                ثانٍ يُكتب فيختلف عن الأوّل. */}
            <button
              type="button"
              onClick={() => setAddingGrant(true)}
              disabled={charities.length === 0}
              title={charities.length === 0 ? "لا جمعياتٍ مسنَدةً إليك" : undefined}
              className={cx(btn.primary, charities.length === 0 && "pointer-events-none opacity-50")}
            >
              <Plus className="size-4" /> إضافة منحة
            </button>
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
              label="الحالات"
              placeholder="كل الحالات"
              allLabel="كل الحالات"
              countNoun="حالات"
              values={pickedStatuses}
              onChange={setPickedStatuses}
              // العددُ بجوار كل حالة: كم منحةً فيها — بعد مُرشِّح الجمعيات لا
              // بعد مُرشِّح الحالات نفسِه، وإلّا صفَّرت أوّلُ نقرةٍ ما عداها.
              options={GRANT_STATUSES.map((s) => ({
                value: s.value,
                label: s.label,
                count: statusCounts.get(s.value) ?? 0,
              }))}
            />
            <Select
              value={sort}
              onSelect={(v) => setSort(v as GrantSort)}
              placeholder="الترتيب"
              options={GRANT_SORTS.map((s) => ({ value: s.value, label: s.label }))}
            />
          </div>
        </div>

        <TableShell
          empty={
            shownGrants.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-4" />}
                title={grants.length === 0 ? "لم تُرفع منحةٌ لهذه الجهة بعد" : "لا منحةَ تُطابق المُرشِّحات"}
                description={grants.length === 0 ? "ارفعها من «إضافة منحة» أعلاه، أو من صفحة منح الجمعية." : undefined}
              />
            ) : undefined
          }
          footer={`${shownGrants.length} منحة · ${distinctCharities} جمعية · إجمالي المطلوب ${money(sumRequested)} ريال`}
        >
          <thead>
            <tr className={theadRowClass}>
              <Th>الجمعية</Th>
              <Th>المبادرة</Th>
              <Th>المبلغ المطلوب</Th>
              <Th>الحالة</Th>
              <Th>تاريخ الرفع</Th>
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {shownGrants.map((g) => (
              <tr key={g.id}>
                <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>{g.charityName}</td>
                <td className={cx(tdClass, "text-slate-700 dark:text-slate-200")}>{g.initiativeName}</td>
                <td className={cx(tdClass, MONO)}>{money(g.requestedAmount)}</td>
                <td className={tdClass}>
                  <Badge
                    tone={
                      g.status === "APPROVED" ? "good" : g.status === "REJECTED" ? "danger" : g.status === "CLOSED" ? "neutral" : "warn"
                    }
                  >
                    {grantStatusLabel(g.status)}
                  </Badge>
                </td>
                <td className={cx(tdClass, MONO, "text-slate-500")}>{g.createdAt}</td>
                <td className={tdClass}>
                  <span className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingGrant({
                          id: g.id,
                          charityId: g.charityId,
                          charityName: g.charityName,
                          donorOrgId: org.id,
                          initiativeName: g.initiativeName,
                          requestedAmount: g.requestedAmount,
                        })
                      }
                      aria-label={`تعديل منحة ${g.initiativeName}`}
                      className={btn.icon}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <Select
                      onSelect={(to) => changeGrantStatus(g, to)}
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
      </section>

      {editingOrg && (
        <DonorSheet
          row={org}
          kind={kind}
          counts={{ charities: scopedCharityCount, grants: grants.length }}
          onClose={() => setEditingOrg(false)}
          onSaved={() => {
            setEditingOrg(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {(addingGrant || editingGrant) && (
        <GrantSheet
          grant={editingGrant ?? undefined}
          donor={{ id: org.id, name: org.name }}
          charities={charities}
          onClose={() => {
            setAddingGrant(false);
            setEditingGrant(null);
          }}
          onSaved={() => {
            setAddingGrant(false);
            setEditingGrant(null);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {statusFor && (
        <GrantStatusDialog
          grant={statusFor.grant}
          next={statusFor.next}
          onClose={() => setStatusFor(null)}
          onSaved={() => {
            setStatusFor(null);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {accountFor && (
        <AccountSheet
          donorOrgId={org.id}
          donorName={org.name}
          charity={accountFor.charity}
          row={accountFor.row}
          onClose={() => setAccountFor(null)}
          onSaved={() => {
            setAccountFor(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

/**
 * حسابُ جمعيةٍ عند جهة.
 *
 * وكلمةُ المرور تُعرض نصّاً في الحقل لا نقاطاً: من يفتح هذه اللوحة يُحرِّرها،
 * ومن حرَّر سِرّاً لا يراه كتبه مرّتين.
 */
function AccountSheet({
  donorOrgId,
  donorName,
  charity,
  row,
  onClose,
  onSaved,
}: {
  donorOrgId: string;
  donorName: string;
  charity: Charity;
  row: DonorAccountRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState(row?.username ?? "");
  const [password, setPassword] = useState(row?.password ?? "");
  const [busy, setBusy] = useState(false);

  const save = () => {
    setBusy(true);
    void (async () => {
      const res = await saveDonorAccount(donorOrgId, charity.id, username, password);
      setBusy(false);
      if (!res.ok) {
        notify("error", res.error);
        return;
      }
      notify("ok", row ? "حُفظ الحساب." : "أُضيف الحساب.");
      onSaved();
    })();
  };

  return (
    <Sheet
      title={row ? `حساب ${charity.name}` : `إضافة حساب ${charity.name}`}
      subtitle={`عند ${donorName}`}
      onClose={onClose}
      onSubmit={save}
      busy={busy}
      footer={
        <>
          <button type="submit" disabled={busy} className={btn.primary}>
            حفظ
          </button>
          <button type="button" onClick={onClose} disabled={busy} className={btn.ghost}>
            إلغاء
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <label className="block space-y-1.5">
          <span className="block text-body font-medium text-slate-700 dark:text-slate-300">اسم المستخدم</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required dir="ltr" className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-body font-medium text-slate-700 dark:text-slate-300">كلمة المرور</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" className={field} />
        </label>
        <p className="text-meta leading-5 text-slate-500 dark:text-slate-400">
          تُخزَّن كلمةُ المرور مشفَّرةً في القاعدة، وتُعرض في الجدول مُغطّاةً حتى تُكشف. ولا تُكتب في سجلّ
          التغييرات.
        </p>
      </div>
    </Sheet>
  );
}
