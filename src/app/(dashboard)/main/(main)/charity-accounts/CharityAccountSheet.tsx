"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Building2, Check, Loader2, Search, ShieldCheck, UserPlus } from "lucide-react";
import { Sheet } from "@/components/console/overlays";
import Select from "@/components/console/Select";
import { Field, Note, btn, cx, field } from "@/components/console/ui";
import { notify } from "@/components/console/toastBus";
import { CHARITY_USER_TITLES } from "@/lib/charityPermissions";
import {
  addCharityClientAccount,
  lookupCharityAccountByPhone,
  setCharityAccountAccess,
} from "@/app/actions/charityAccounts";
import AccessPicker from "./AccessPicker";
import type { AccountRow, CharityRow } from "./types";

const TITLES = CHARITY_USER_TITLES.map((t) => ({ value: t.id, label: t.label }));

type Found = {
  id: string;
  name: string;
  phone: string;
  title: string;
  isActive: boolean;
  memberships: { charityId: string; charityName: string; isActive: boolean; isOfficial: boolean }[];
};

export type SheetState =
  | { mode: "add" }
  /** تعديلُ وصولِ حسابٍ في جمعيةٍ بعينها. */
  | { mode: "access"; account: AccountRow; charityId: string }
  /** ضمُّ حسابٍ قائمٍ إلى جمعيةٍ جديدة. */
  | { mode: "link"; account: AccountRow };

/**
 * لوحُ حساب الجمعية — إنشاءً، وضمّاً إلى جمعيةٍ أخرى، وتعديلَ وصولٍ فيها.
 *
 * **والجوّالُ يُبحث به قبل الكتابة**: الحسابُ واحدٌ لصاحبه وإن خدم جمعيتين،
 * فإنشاءُ حسابٍ ثانٍ برقمه يُرفض عند الحفظ بعد أن يُكتب كلُّ شيء. والبحثُ
 * يقول «هذا فلان، وهو عضوٌ في كذا» ويعرض الضمَّ بدل الإنشاء.
 *
 * **والوصولُ يُحرَّر لجمعيةٍ واحدةٍ في كلِّ مرّة**: الخدماتُ تختلف من جمعيةٍ
 * إلى أخرى، والصلاحيّةُ تتبع خدمتَها — فلوحٌ واحدٌ لجمعيّتين يَمنح ما لا يعمل.
 */
export function CharityAccountSheet({
  state,
  charities,
  onClose,
  onSaved,
}: {
  state: Exclude<SheetState, null>;
  charities: CharityRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const servicesOf = (id: string) => charities.find((c) => c.id === id)?.services ?? [];

  // ── إنشاءٌ أو ضمّ ────────────────────────────────────────────────────────
  const linking = state.mode === "link";
  const adding = state.mode === "add";

  const [name, setName] = useState(linking ? state.account.name : "");
  const [phone, setPhone] = useState(linking ? state.account.phone : "");
  const [title, setTitle] = useState(linking ? state.account.title : "FULL_TIME");
  const [charityId, setCharityId] = useState(
    state.mode === "access" ? state.charityId : ""
  );
  const [isOfficial, setOfficial] = useState(
    state.mode === "access"
      ? state.account.memberships.find((m) => m.charityId === state.charityId)?.isOfficial ?? false
      : false
  );
  const [services, setServices] = useState<string[]>(
    state.mode === "access"
      ? state.account.memberships.find((m) => m.charityId === state.charityId)?.services ?? []
      : []
  );
  const [permissions, setPermissions] = useState<string[]>(
    state.mode === "access"
      ? state.account.memberships.find((m) => m.charityId === state.charityId)?.permissions ?? []
      : []
  );

  // ── البحثُ بالجوّال ──────────────────────────────────────────────────────
  const [found, setFound] = useState<Found | null>(null);
  const [checking, setChecking] = useState(false);
  const seq = useRef(0);

  // **ولا كتابةَ حالٍ في جسم الأثر**: كلُّ تبديلٍ يقع داخل المؤقِّت أو بعد
  // الردّ — وكتابتُها في الجسم تُشعل رسماً متتالياً (`set-state-in-effect`).
  useEffect(() => {
    if (!adding) return;
    const mine = ++seq.current;
    const timer = setTimeout(() => {
      if (mine !== seq.current) return;
      if (phone.replace(/\D/g, "").length < 9) {
        setFound(null);
        setChecking(false);
        return;
      }
      setChecking(true);
      void lookupCharityAccountByPhone(phone)
        .then((res) => {
          if (mine !== seq.current) return;
          setFound(res.success && res.found ? res.account : null);
        })
        .finally(() => {
          if (mine === seq.current) setChecking(false);
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [phone, adding]);

  /** الجمعياتُ التي ليس الحسابُ عضواً فيها — وهي وحدَها تُعرض عند الضمّ. */
  const linkTargets = (account: AccountRow) =>
    charities.filter((c) => !account.memberships.some((m) => m.charityId === c.id));

  const submit = () => {
    setError(null);

    if (state.mode === "access" || state.mode === "link") {
      const account = state.account;
      if (!charityId) return setError("اختر الجمعية");
      start(async () => {
        const res = await setCharityAccountAccess({
          accountId: account.id,
          charityId,
          isOfficial,
          permissions,
          services,
        });
        if (!res.success) return setError(res.error ?? "تعذر الحفظ");
        notify("ok", state.mode === "link" ? "ضم الحساب إلى الجمعية." : "حفظ الوصول.");
        onSaved();
      });
      return;
    }

    if (!name.trim() || !phone.trim() || !charityId) {
      return setError("الاسم والجوال والجمعية مطلوبة");
    }
    start(async () => {
      const res = await addCharityClientAccount({
        name: name.trim(),
        phone: phone.trim(),
        title,
        charityIds: [charityId],
        isAdmin: isOfficial,
        permissions: isOfficial ? [] : permissions,
        services: isOfficial ? [] : services,
      });
      if (!res.success) return setError(res.error ?? "تعذر إنشاء الحساب");
      notify("ok", "أنشئ الحساب.");
      onSaved();
    });
  };

  const heading =
    state.mode === "add"
      ? "حساب جديد"
      : state.mode === "link"
        ? `ضم «${state.account.name}» إلى جمعية`
        : `وصول «${state.account.name}»`;

  const charityOptions = (
    state.mode === "link" ? linkTargets(state.account) : charities
  ).map((c) => ({ value: c.id, label: c.name }));

  return (
    <Sheet
      title={heading}
      subtitle={
        state.mode === "access"
          ? charities.find((c) => c.id === charityId)?.name
          : "الخدمات تختلف من جمعية إلى أخرى، والصلاحية تتبع خدمتها."
      }
      leading={
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary dark:bg-teal-400/10 dark:text-teal-300">
          {state.mode === "add" ? <UserPlus className="size-4" /> : <ShieldCheck className="size-4" />}
        </span>
      }
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={btn.secondary}>
            إلغاء
          </button>
          <button type="submit" disabled={busy} className={btn.primary}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {state.mode === "add" ? "إنشاء الحساب" : "حفظ"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Note tone="danger">{error}</Note>}

        {adding && (
          <>
            <Field id="ca-phone" label="رقم الجوال" hint="يبحث عن صاحبه في المنصة قبل الإنشاء.">
              <div className="relative">
                <input
                  id="ca-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  className={cx(field, "pe-9 text-start")}
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {checking ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                </span>
              </div>
            </Field>

            {/* ووجودُ الحساب يُقال قبل الكتابة لا بعد الحفظ: الرقمُ فريدٌ في
                القاعدة، فإنشاءٌ ثانٍ به مردودٌ لا محالة. */}
            {found && (
              <Note tone="warn">
                <span className="font-semibold">{found.name}</span> له حساب في المنصة
                {found.memberships.length > 0 && (
                  <>
                    {" "}— عضو في{" "}
                    {found.memberships.map((m) => m.charityName).join("، ")}
                  </>
                )}
                . لا ينشأ له حساب ثان؛ أغلق هذا اللوح واضممه من صفه في الجدول.
              </Note>
            )}

            <Field id="ca-name" label="الاسم">
              <input
                id="ca-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الثلاثي"
                className={field}
              />
            </Field>

            <Field id="ca-title" label="المسمى">
              <Select value={title} onSelect={setTitle} options={TITLES} placeholder="اختر المسمى" />
            </Field>
          </>
        )}

        {state.mode !== "access" && (
          <Field
            id="ca-charity"
            label="الجمعية"
            hint={
              state.mode === "link"
                ? "الجمعيات التي ليس عضوا فيها بعد."
                : "جمعية واحدة الآن، وتضاف غيرها من صف الحساب."
            }
          >
            {charityOptions.length === 0 ? (
              <Note tone="brand">هو عضو في كل الجمعيات المتاحة.</Note>
            ) : (
              <Select
                value={charityId || undefined}
                onSelect={setCharityId}
                options={charityOptions}
                placeholder="اختر الجمعية"
              />
            )}
          </Field>
        )}

        {charityId && (
          <>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <input
                type="checkbox"
                checked={isOfficial}
                onChange={(e) => setOfficial(e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--color-primary,theme(colors.teal.600))]"
              />
              <span className="min-w-0">
                <span className="block text-body font-medium text-slate-900 dark:text-slate-100">
                  حساب الجمعية الرسمي
                </span>
                <span className="mt-0.5 block text-meta leading-5 text-slate-500 dark:text-slate-400">
                  يحمل كل الصلاحيات — بما يضاف منها لاحقا — ويفوض بكل خدمات الجمعية، ويمنحها لبقية
                  الحسابات.
                </span>
              </span>
            </label>

            {isOfficial ? (
              <Note tone="brand">
                الحساب الرسمي يملك كل الصلاحيات ويفوض بكل خدمات الجمعية تلقائيا.
              </Note>
            ) : (
              <AccessPicker
                charityServices={servicesOf(charityId)}
                services={services}
                permissions={permissions}
                // وتُكتب الحالان في تحديثٍ واحد: نداءان متتاليان يبنيان كلٌّ
                // منهما على نسخةٍ قديمة، فيُلغي الثاني ما كتبه الأوّل — وهو
                // ما كان يجعل الخدمةَ لا يتغيّر لونُها عند نقرها.
                onChange={(next) => {
                  setServices(next.services);
                  setPermissions(next.permissions);
                }}
                disabled={busy}
              />
            )}
          </>
        )}

        {state.mode === "access" && (
          <p className="flex items-center gap-1.5 text-meta text-slate-400">
            <Building2 aria-hidden className="size-3.5" />
            لتعديل وصوله في جمعية أخرى، افتحها من صفه في الجدول.
          </p>
        )}
      </div>
    </Sheet>
  );
}
