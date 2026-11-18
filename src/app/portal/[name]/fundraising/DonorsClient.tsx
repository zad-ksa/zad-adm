"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Coins, KeyRound, Search, Trash2 } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  TableShell,
  Th,
  tableFrameClass,
  tbodyClass,
  tdClass,
  theadRowClass,
} from "@/components/console/layout";
import { Badge, MONO, btn, cx, field } from "@/components/console/ui";
import { SecretValue } from "@/components/console/Copy";
import { Sheet } from "@/components/console/overlays";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import { deletePortalDonorAccount, savePortalDonorAccount } from "@/app/actions/charityFundraising";
import type { PortalDonorRow } from "@/lib/portalFundraising";

/**
 * جدولُ الجهات المانحة في بوّابة الجمعية.
 *
 * **والتاريخُ عمودٌ واحدٌ لا عمودان**: المفتوحُ يُسأل عن موعد إغلاقه، والمغلقُ
 * عن موعد فتحه — وعمودان أحدُهما فارغٌ دائماً في كلِّ صفٍّ عرضٌ لا خبر.
 *
 * **وكلمةُ المرور مُغطّاةٌ حتى تُكشف**: هي كلمةُ مرور الجمعية عند الجهة، تراها
 * في شاشتها كما يراها فريقُ زاد — والتغطيةُ لمن يقف خلف الشاشة لا لصاحبها.
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
  const [editing, setEditing] = useState<PortalDonorRow | null>(null);
  const [busy, start] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim();
    return donors.filter(
      (d) => (!onlyOpen || d.intakeStatus === "OPEN") && (q === "" || d.name.includes(q))
    );
  }, [donors, query, onlyOpen]);

  const openCount = donors.filter((d) => d.intakeStatus === "OPEN").length;
  const withAccount = donors.filter((d) => d.username).length;

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        icon={<Coins className="size-6" />}
        title="تنمية الموارد المالية"
        description={`${donors.length} جهة مانحة · ${openCount} مفتوحة للرفع · ${withAccount} لها حساب مسجل`}
        actions={
          <Link href={`/portal/${encodeURIComponent(charityName)}/fundraising/grants`} className={btn.secondary}>
            المنح المرفوعة
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الجهة…"
            className={cx(field, "ps-9")}
          />
        </label>
        <button
          type="button"
          onClick={() => setOnlyOpen((v) => !v)}
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
        <TableShell>
          <thead>
            <tr className={theadRowClass}>
              <Th>الجهة</Th>
              <Th>الحالة</Th>
              <Th>اسم المستخدم</Th>
              <Th>كلمة المرور</Th>
              <Th>الموعد</Th>
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
                  {donor.username ? (
                    <span className={cx(MONO, "text-body text-slate-700 dark:text-slate-200")} dir="ltr">
                      {donor.username}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">لا حساب</span>
                  )}
                </td>
                <td className={tdClass}>
                  <SecretValue value={donor.password} emptyLabel="—" />
                </td>
                <td className={tdClass}>
                  {donor.nextDate ? (
                    <span className="text-body text-slate-600 dark:text-slate-300">
                      <span className="text-meta text-slate-400">
                        {donor.intakeStatus === "OPEN" ? "يغلق" : "يفتح"}{" "}
                      </span>
                      {donor.nextDate}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500" title={donor.intakeReason}>
                      بلا موعد معلن
                    </span>
                  )}
                </td>
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
          onRun={(fn) =>
            start(async () => {
              const res = await fn();
              if (!res.ok) {
                notify("error", res.error ?? "تعذرت العملية");
                return;
              }
              notify("ok", "حُفظ الحساب.");
              setEditing(null);
              router.refresh();
            })
          }
        />
      )}
    </div>
  );
}

function AccountSheet({
  charityId,
  donor,
  busy,
  onClose,
  onRun,
}: {
  charityId: string;
  donor: PortalDonorRow;
  busy: boolean;
  onClose: () => void;
  onRun: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [username, setUsername] = useState(donor.username ?? "");
  const [password, setPassword] = useState(donor.password ?? "");

  return (
    <Sheet
      title={donor.name}
      subtitle="حساب الجمعية عند هذه الجهة — يُحفظ مشفرا، ويراه فريق زاد كما ترينه هنا."
      onClose={onClose}
      busy={busy}
      onSubmit={() => onRun(() => savePortalDonorAccount(charityId, donor.id, username, password))}
      footer={
        <>
          <div>
            {donor.username && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (
                    await confirmAction({
                      title: "حذف الحساب؟",
                      message: "يُحذف اسم المستخدم وكلمة المرور من الموقع. والحساب عند الجهة يبقى كما هو.",
                      confirmLabel: "حذف",
                      tone: "danger",
                    })
                  ) {
                    onRun(() => deletePortalDonorAccount(charityId, donor.id));
                  }
                }}
                className={cx(btn.secondary, "text-rose-600 dark:text-rose-400")}
              >
                <Trash2 className="size-4" /> حذف الحساب
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={busy} className={btn.secondary}>
              إلغاء
            </button>
            <button type="submit" disabled={busy || !username.trim() || !password.trim()} className={btn.primary}>
              حفظ
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
            اسم المستخدم
          </span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={field} dir="ltr" />
        </label>
        <label className="block">
          <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
            كلمة المرور
          </span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} className={field} dir="ltr" />
        </label>
      </div>
    </Sheet>
  );
}
