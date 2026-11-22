"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Select from "@/components/console/Select";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Info,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import {
  charityPermissionGroups,
  CHARITY_USER_TITLES,
  charityMemberLabel,
  sanitizeCharityPermissions,
} from "@/lib/charityPermissions";
import { normalizeSaudiPhone } from "@/lib/phone";
import {
  createCharityStaff,
  lookupStaffByPhone,
  setCharityStaffActive,
  updateCharityStaff,
} from "@/app/actions/charityHr";
import { Field, HrCard, SectionHead, StatTile } from "./ui";
import { Badge, Note, btn, field } from "@/components/console/ui";

type Staff = {
  id: string;
  name: string;
  phone: string;
  title: string;
  permissions: string[];
  /** الخدمات المفوَّض لها في هذه الجمعية. */
  services: string[];
  isActive: boolean;
  /** Administrator of THIS charity — per membership, not per account. */
  isAdmin: boolean;
  isAccountActive: boolean;
};

/**
 * What the server last said about the number currently in the phone field.
 *
 *  idle          — nothing worth checking yet (empty or incomplete number)
 *  checking      — a lookup is in flight
 *  available     — the number is free; this will create a new account
 *  existing      — the number belongs to someone; adding will LINK them here
 *  alreadyMember — already active in this charity; nothing to add
 *  unchecked     — the lookup could not run (rate limit / transient error).
 *                  Never blocks saving: the action re-checks server-side.
 */
type PhoneState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | {
      kind: "existing";
      name: string;
      phone: string;
      isAccountActive: boolean;
      deactivatedHere: boolean;
    }
  | { kind: "alreadyMember"; name: string }
  | { kind: "unchecked"; reason: string };

type LookupResult = Exclude<PhoneState, { kind: "idle" } | { kind: "checking" }>;

/** How long to wait after the last keystroke before asking the server. */
const LOOKUP_DEBOUNCE_MS = 400;

/**
 * Permission picker.
 *
 * Defined at module scope, NOT inside StaffManagerClient: a component created
 * during render is a brand-new type on every keystroke, so React unmounts and
 * remounts the whole subtree and the focused control loses focus mid-edit.
 */
/**
 * الخدمات المفوَّض لها العضو.
 *
 * وكلُّ صلاحيّةٍ تتبع خدمةً، ولا تعمل إلا والخدمةُ مفوَّضةٌ له — فالخدماتُ تُختار
 * أوّلاً ثمّ تُعرض صلاحيّاتُها تحتها. وحسابُ الجمعية مفوَّضٌ بها جميعاً بلا اختيار.
 *
 * ومثل PermissionEditor: في نطاق الوحدة لا داخل المكوّن، وإلا فقد الحقل تركيزه
 * مع كل ضغطة مفتاح.
 */
function ServiceEditor({
  services,
  selected,
  onToggle,
}: {
  services: string[];
  selected: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <div>
      <p className="text-slate-400 dark:text-slate-500 mb-2 text-caption">
        الخدمات المفوَّض لها
      </p>
      {services.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500 text-meta">
          لا توجد خدمات مقدَّمة لهذه الجمعية بعد.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {services.map((name) => {
            const checked = selected.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => onToggle(name)}
                aria-pressed={checked}
                className={`text-body flex items-center gap-2 px-4 py-2 rounded-xl text-right
                            transition-[box-shadow,color,background-color] duration-300 ${
                              checked
                                ? "text-primary dark:text-teal-400 bg-primary/[0.06] shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.28)]"
                                : "text-slate-500 dark:text-slate-400 shadow-[inset_0_0_0_1px_rgb(100_116_139_/_.16)]"
                            }`}
              >
                <span
                  className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors duration-300 ${
                    checked ? "bg-primary dark:bg-teal-500" : "shadow-[inset_0_0_0_1px_rgb(100_116_139_/_.32)]"
                  }`}
                >
                  {checked && <Check className="w-2 h-2 text-white" strokeWidth={4} />}
                </span>
                <span className="truncate">{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PermissionEditor({
  selected,
  grantable,
  services,
  onToggle,
}: {
  selected: string[];
  grantable: Set<string>;
  /**
   * خدماتُ هذا العضو المختارةُ الآن — تحت كلِّ واحدةٍ صلاحيّاتُها.
   *
   * فالصلاحيّةُ تتبع خدمةً، ولا تعمل إلا والخدمةُ مفوَّضةٌ له. وعرضُها قبل
   * اختيار خدمتها منحٌ لما لا يعمل.
   */
  services: string[];
  onToggle: (id: string) => void;
}) {
  const groups = charityPermissionGroups(services);
  return (
    <div className="space-y-4">
      {groups.length === 0 && (
        <p className="text-slate-400 dark:text-slate-500 text-body">
          اختر خدمةً أعلاه لتظهر صلاحيّاتُها.
        </p>
      )}
      {groups.map((group) => {
        // Only permissions the signed-in manager holds are offered — the subset
        // rule, mirrored server-side in validateGrant.
        const available = group.permissions.filter((p) => grantable.has(p.id));
        if (available.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="text-slate-400 dark:text-slate-500 mb-2 text-caption">
              {group.title}
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {available.map((permission) => {
                const checked = selected.includes(permission.id);
                return (
                  <button
                    key={permission.id}
                    type="button"
                    onClick={() => onToggle(permission.id)}
                    aria-pressed={checked}
                    className={`text-body flex items-center gap-2 px-4 py-2 rounded-xl text-right
                                transition-[box-shadow,color,background-color] duration-300 ${
                                  checked
                                    ? "text-primary dark:text-teal-400 bg-primary/[0.06] shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.28)] dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.28)]"
                                    : "text-slate-500 dark:text-slate-400 shadow-[inset_0_0_0_1px_rgb(100_116_139_/_.16)] hover:shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.24)]"
                                }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors duration-300 ${
                        checked
                          ? "bg-primary dark:bg-teal-500"
                          : "shadow-[inset_0_0_0_1px_rgb(100_116_139_/_.32)]"
                      }`}
                    >
                      {checked && <Check className="w-2 h-2 text-white" strokeWidth={4} />}
                    </span>
                    <span className="truncate">{permission.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}


/**
 * The administrator switch — the whole of the authority question for a member.
 *
 * Rendered only for an actor who is already an administrator here: conferring
 * it is administrator-only, and the server refuses the same grant in
 * validateGrant regardless of what the client was shown.
 */
// `AdminToggle` زال: علَمُ «حساب الجمعية» يُعيَّن من شاشة زادٍ وحدَها
// (`/main/charity-accounts`)، فلا زرَّ له في البوّابة — ولا حتى لحساب الجمعية
// نفسِه: إعطاؤه لشخصٍ آخر من داخل الجمعية نقلٌ لمفتاح البيت من غير صاحبه.

export default function StaffManagerClient({
  charityId,
  currentUserId,
  grantablePermissions,
  charityServices,
  initialStaff,
}: {
  charityId: string;
  currentUserId: string;
  grantablePermissions: string[];
  /** خدمات زاد المقدَّمة لهذه الجمعية — قائمة التفويض. */
  charityServices: string[];
  initialStaff: Staff[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Separate from `error`, which is drawn at the top of the PAGE. A failure
  // while saving permissions used to land there — behind the open dialog —
  // so the save appeared to do nothing at all.
  const [editError, setEditError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    // Optional email login. Left blank, the account signs in by phone + OTP
    // and its owner can set these later themselves from «بيانات الدخول».
    email: "",
    password: "",
    title: "FULL_TIME",
    permissions: [] as string[],
    services: [] as string[],
    isAdmin: false,
  });
  const [phoneState, setPhoneState] = useState<PhoneState>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<Staff | null>(null);
  const [editDraft, setEditDraft] = useState({
    title: "FULL_TIME",
    permissions: [] as string[],
    services: [] as string[],
    isAdmin: false,
  });

  // Answers already received, keyed by canonical number. Returning to a number
  // checked a moment ago is instant and spends no rate limit.
  const lookupCache = useRef(new Map<string, LookupResult>());
  // Monotonic token: a slow reply for an old number must never overwrite the
  // state of the number now in the field.
  const lookupSeq = useRef(0);

  const grantable = useMemo(() => new Set(grantablePermissions), [grantablePermissions]);
  // Every title is a plain job label now, so all of them are always offered.
  // Authority is the separate administrator switch, which only an administrator
  // may set.
  const titleOptions = CHARITY_USER_TITLES;

  const counts = useMemo(
    () => ({
      total: initialStaff.length,
      active: initialStaff.filter((s) => s.isActive).length,
      admins: initialStaff.filter((s) => s.isAdmin && s.isActive).length,
    }),
    [initialStaff]
  );

  const isExisting = phoneState.kind === "existing";
  const isAlreadyMember = phoneState.kind === "alreadyMember";
  // The name belongs to the person, not to this charity — createCharityStaff
  // never renames an existing account. The lock states that in the UI; it is
  // not what enforces it.
  const isNameLocked = isExisting || isAlreadyMember;

  /**
   * The network half of the lookup: debounced, and dropped if it comes back
   * after the number has moved on.
   *
   * Runs only for a complete Saudi mobile that is not already cached, so a
   * half-typed number never reaches the server and never costs rate limit.
   * Everything synchronous — idle, cache hits, the "checking" flag — is
   * settled in handlePhoneChange, so this effect never calls setState in its
   * own body and cannot cascade a render.
   */
  useEffect(() => {
    if (!isAdding) return;

    const canonical = normalizeSaudiPhone(form.phone);
    if (!canonical) return;
    if (lookupCache.current.has(canonical)) return;

    // Read, never bump: the token is bumped by whoever changes the number, so
    // a reply for a number the user has already edited away is discarded.
    const seq = lookupSeq.current;

    const timer = setTimeout(async () => {
      const res = await lookupStaffByPhone(charityId, canonical);
      if (seq !== lookupSeq.current) return; // a newer number is being typed

      let next: LookupResult;
      if (!res.success) {
        next = { kind: "unchecked", reason: res.error };
      } else if (res.data.status === "AVAILABLE") {
        next = { kind: "available" };
      } else if (res.data.status === "ALREADY_IN_CHARITY") {
        next = { kind: "alreadyMember", name: res.data.name! };
      } else {
        next = {
          kind: "existing",
          name: res.data.name!,
          phone: res.data.phone!,
          isAccountActive: res.data.isAccountActive!,
          deactivatedHere: res.data.status === "DEACTIVATED_HERE",
        };
      }

      // A rate-limit answer is about us, not about the number — caching it
      // would pin a wrong verdict on that number for the rest of the session.
      if (next.kind !== "unchecked") lookupCache.current.set(canonical, next);

      setPhoneState(next);
      if (next.kind === "existing") {
        const foundName = next.name;
        setForm((f) => ({ ...f, name: foundName }));
      }
    }, LOOKUP_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [form.phone, isAdding, charityId]);

  function refresh(message: string) {
    setNotice(message);
    startTransition(() => router.refresh());
  }

  function toggleIn(list: string[], id: string) {
    return list.includes(id) ? list.filter((p) => p !== id) : [...list, id];
  }

  /**
   * تبديلُ خدمةٍ — ومعها تُنقّى الصلاحيّاتُ التي لا تبقى لها خدمة.
   *
   * فلو بقيت محدَّدةً بعد رفع خدمتها لحُفظت ولا تُرى في المُنتقي: قيمةٌ تَثبُت
   * في الصفِّ ولا يظهر لها مربَّعٌ يُلغيها. والصلاحيّاتُ الإداريّةُ لا تتبع
   * خدمةً فتبقى.
   */
  function withService(draft: { services: string[]; permissions: string[] }, name: string) {
    const services = toggleIn(draft.services, name);
    const allowed = new Set(
      charityPermissionGroups(services).flatMap((g) => g.permissions.map((p) => p.id))
    );
    return { services, permissions: draft.permissions.filter((id) => allowed.has(id)) };
  }

  function resetAddForm() {
    lookupSeq.current++; // discard anything still in flight
    setForm({ name: "", phone: "", email: "", password: "", title: "FULL_TIME", permissions: [], services: [], isAdmin: false });
    setPhoneState({ kind: "idle" });
    setIsAdding(false);
  }

  /**
   * Editing the number invalidates everything derived from it, immediately —
   * not after the debounce. Leaving a fetched name in a now-unlocked field for
   * 400ms is how an account gets created under the wrong person's name.
   *
   * Also decides, synchronously, what the field's status is: a cached verdict
   * shows at once, a complete new number goes straight to "checking", and
   * anything incomplete falls back to idle.
   */
  function handlePhoneChange(value: string) {
    // Any edit invalidates a reply that may still be in flight.
    lookupSeq.current++;

    const canonical = normalizeSaudiPhone(value);
    const cached = canonical ? lookupCache.current.get(canonical) : undefined;

    if (cached) {
      setPhoneState(cached);
    } else if (canonical) {
      setPhoneState({ kind: "checking" });
    } else {
      setPhoneState({ kind: "idle" });
    }

    setForm((f) => ({
      ...f,
      phone: value,
      // A locked name belonged to the previous number, so it goes; a name the
      // manager typed themselves is theirs to keep.
      name: cached?.kind === "existing" ? cached.name : isNameLocked ? "" : f.name,
    }));
    setError(null);
  }

  async function submitCreate() {
    setError(null);
    setBusy(true);
    try {
      const res = await createCharityStaff(charityId, {
        ...form,
        // Only ever true while the banner is on screen, so the manager has seen
        // exactly whose account they are attaching.
        confirmedExisting: isExisting,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      const linked = res.data.linked;
      resetAddForm();
      refresh(linked ? "تمت إضافة الموظف إلى الجمعية" : "تم إنشاء حساب الموظف");
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit() {
    if (!editing) return;
    setEditError(null);
    setBusy(true);
    try {
      const res = await updateCharityStaff(charityId, editing.id, editDraft);
      if (!res.success) {
        setEditError(res.error);
        return;
      }
      setEditing(null);
      refresh("تم تحديث بيانات الموظف");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(member: Staff) {
    setError(null);
    setBusy(true);
    try {
      const res = await setCharityStaffActive(charityId, member.id, !member.isActive);
      if (!res.success) {
        setError(res.error);
        return;
      }
      refresh(member.isActive ? "تم تعطيل الموظف" : "تمت إعادة تفعيل الموظف");
    } finally {
      setBusy(false);
    }
  }

  // The button says what will actually happen, which is what makes the extra
  // confirmation screen unnecessary.
  const submitLabel = isExisting
    ? phoneState.deactivatedHere
      ? "إعادة تفعيل الموظف"
      : "إضافة الموظف إلى الجمعية"
    : "إنشاء حساب الموظف";

  const canSubmit =
    !busy &&
    !isAlreadyMember &&
    phoneState.kind !== "checking" &&
    normalizeSaudiPhone(form.phone) !== null &&
    (isExisting || form.name.trim().length > 0);

  return (
    <div className="space-y-6">
      {error && (
        <Note tone="danger" icon={<AlertTriangle className="size-3.5" />}>
          {error}
        </Note>
      )}
      {notice && !error && (
        <Note tone="good" icon={<Check className="size-3.5" />}>
          {notice}
        </Note>
      )}

      {/* ── Bento row: three quiet stats + one loud action ─────────────────
          Spans 3/3/2/4 rather than four equal quarters, so the eye lands on
          the action card instead of scanning a uniform strip. */}
      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-6 lg:col-span-3">
          <StatTile label="إجمالي الموظفين" value={counts.total} tone="neutral" />
        </div>
        <div className="col-span-6 lg:col-span-3">
          <StatTile label="نشط" value={counts.active} tone="primary" />
        </div>
        <div className="col-span-6 lg:col-span-2">
          <StatTile label="مدير نظام" value={counts.admins} tone="neutral" />
        </div>

        <div className="col-span-6 lg:col-span-4">
          <HrCard interactive className="p-4 h-full flex flex-col justify-between gap-4">
            <div className="flex items-start gap-2">
              <span className="text-primary dark:text-teal-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-meta">
                يمكنك منح الصلاحيات التي تملكها أنت فقط.
              </p>
            </div>
            <button
              onClick={() => {
                setIsAdding(true);
                setError(null);
                setNotice(null);
              }}
              className={`text-body ${btn.primary} w-full`}
            >
              <Plus className="w-4 h-4" />
              إضافة موظف
            </button>
          </HrCard>
        </div>
      </section>

      {/* ── Add form ──────────────────────────────────────────────────────
          Phone first, deliberately: it is the identity key, and everything
          under it (new person or existing, what their name is, whether we can
          proceed at all) is an answer to it. Asking for the name first invites
          typing one that the lookup then overwrites. */}
      {isAdding && (
        <HrCard className="p-6 space-y-6">
          <SectionHead
            icon={UserPlus}
            title="إضافة موظف"
            hint="ابدأ برقم الجوال — يتحقق النظام منه تلقائياً"
            action={
              <button
                onClick={resetAddForm}
                aria-label="إغلاق"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors duration-300 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            }
          />

          <div className="grid grid-cols-12 gap-4">
            {/* Phone + live status */}
            <div className="col-span-12 sm:col-span-5">
              <Field label="رقم الجوال">
                <input
                  value={form.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`text-body ${field} font-mono tabular-nums`}
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                  inputMode="numeric"
                  autoFocus
                  aria-describedby="phone-status"
                />
              </Field>
              <p
                id="phone-status"
                role="status"
                aria-live="polite"
                className="text-meta flex items-center gap-2 mt-2 min-h-4"
              >
                {phoneState.kind === "checking" && (
                  <span className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جارٍ التحقق...
                  </span>
                )}
                {phoneState.kind === "available" && (
                  <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4" />
                    رقم جديد — سيُنشأ حساب
                  </span>
                )}
                {phoneState.kind === "unchecked" && (
                  <span className="flex items-center gap-2 text-slate-400">
                    <Info className="w-4 h-4" />
                    تعذّر التحقق الآن، سيتم التحقق عند الحفظ
                  </span>
                )}
              </p>
            </div>

            {/* Title */}
            <Field label="المسمى الوظيفي" className="col-span-12 sm:col-span-4">
              <Select
                variant="soft"
                value={form.title}
                onSelect={(v) => setForm({ ...form, title: v })}
                placeholder="اختر المسمى"
                options={titleOptions.map((t) => ({ value: t.id, label: t.label }))}
                className="w-full [&>button]:w-full [&>button]:justify-between"
              />
            </Field>

            {/* The alert sits directly above the name field, which is exactly
                what it explains: why the name is filled in and why it is
                locked. Disclosure stays narrow — name and number only, never
                which other charity this person serves. */}
            {isExisting && (
              <div className="col-span-12">
                <Note tone="warn" icon={<AlertTriangle className="size-3.5" />}>
                  <p className="font-semibold">هذا الرقم مسجّل مسبقاً في النظام</p>
                  <p className="mt-2">
                    <span className="font-medium">{phoneState.name}</span>
                    <span className="mx-2 opacity-60">·</span>
                    <span dir="ltr" className="font-mono tabular-nums">
                      {phoneState.phone}
                    </span>
                  </p>
                  <p className="mt-2 leading-relaxed">
                    {phoneState.deactivatedHere
                      ? "كان معطّلاً في جمعيتكم — سيُعاد تفعيله بالصلاحيات المحددة أدناه."
                      : "سيُضاف إلى جمعيتكم بالصلاحيات المحددة أدناه، ويبقى مرتبطاً بأي جهة أخرى مسجّل بها."}
                  </p>
                  {!phoneState.isAccountActive && (
                    <p className="mt-2 font-semibold">
                      تنبيه: الحساب موقوف من إدارة زاد ولن يتمكن من الدخول حتى يُفعّل.
                    </p>
                  )}
                </Note>
              </div>
            )}

            {isAlreadyMember && (
              <div className="col-span-12">
                <Note tone="danger" icon={<AlertTriangle className="size-3.5" />}>
                  <span className="font-medium">{phoneState.name}</span> مضاف بالفعل إلى الجمعية.
                  يمكنك تعديل صلاحياته من القائمة أدناه.
                </Note>
              </div>
            )}

            {/* Name — locked whenever it belongs to an account that already
                exists. */}
            <Field
              label="الاسم"
              className="col-span-12 sm:col-span-9"
              hint={
                isNameLocked
                  ? "الاسم مرتبط بحساب مسجّل ولا يمكن تعديله من هنا. غيّر رقم الجوال لإدخال اسم جديد."
                  : undefined
              }
            >
              <div className="relative">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`text-body ${field} ${
                    isNameLocked ? "pl-10 text-slate-500 dark:text-slate-400" : ""
                  }`}
                  placeholder={isNameLocked ? "" : "اسم الموظف"}
                  readOnly={isNameLocked}
                  aria-readonly={isNameLocked}
                  tabIndex={isNameLocked ? -1 : undefined}
                />
                {isNameLocked && (
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                )}
              </div>
            </Field>

            {!isExisting && (
              <>
                <Field
                  label="البريد الإلكتروني (اختياري)"
                  className="col-span-12 sm:col-span-6"
                  hint="للدخول بكلمة المرور بدل رمز التحقق. اتركه فارغًا ليضبطه الموظف بنفسه لاحقًا."
                >
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={field}
                    placeholder="name@example.com"
                    dir="ltr"
                  />
                </Field>

                <Field label="كلمة المرور" className="text-body text-body col-span-12 sm:col-span-6">
                  <input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={field}
                    placeholder="٨ أحرف على الأقل — مع البريد فقط"
                    dir="ltr"
                  />
                </Field>
              </>
            )}
          </div>

          {/* الخدماتُ أوّلاً ثمّ صلاحيّاتُها تحتها: الصلاحيّةُ تتبع خدمةً، فترتيبُ
              العكسِ يَعرض ما لا يعمل. */}
          <ServiceEditor
            services={charityServices}
            selected={form.services}
            onToggle={(name) => setForm({ ...form, ...withService(form, name) })}
          />

          <PermissionEditor
            selected={form.permissions}
            grantable={grantable}
            services={form.services}
            onToggle={(id) => setForm({ ...form, permissions: toggleIn(form.permissions, id) })}
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={submitCreate}
              disabled={!canSubmit}
              className={btn.primary}
            >
              {busy && <Loader2 className="text-body w-4 h-4 animate-spin" />}
              {submitLabel}
            </button>
            <button onClick={resetAddForm} className={btn.secondary}>
              إلغاء
            </button>
          </div>
        </HrCard>
      )}

      {/* ── Staff list ───────────────────────────────────────────────────── */}
      <HrCard>
        <div className="p-6 pb-4">
          <SectionHead icon={ShieldCheck} title="قائمة الموظفين" hint={`${counts.total} حساب`} />
        </div>

        {initialStaff.length === 0 ? (
          <p className="px-6 pb-8 text-center text-slate-400 text-body">
            لا يوجد موظفون بعد
          </p>
        ) : (
          <ul>
            {initialStaff.map((member) => {
              const isSelf = member.id === currentUserId;
              // Only an administrator may touch another administrator, so a
              // manage_charity_users holder cannot unseat the people above them.
              // وحسابُ الجمعية مقفولٌ على الجميع هنا: يُدار من زاد.
              const locked = isSelf || member.isAdmin;
              return (
                <li
                  key={member.id}
                  className={`flex flex-wrap items-center gap-4 px-6 py-4
                              shadow-[inset_0_1px_0_0_rgb(100_116_139_/_.10)]
                              transition-colors duration-300
                              hover:bg-primary/[0.02] dark:hover:bg-teal-400/[0.02]
                              ${member.isActive ? "" : "opacity-60"}`}
                >
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-title font-semibold text-slate-800 dark:text-slate-100"
                      >
                        {member.name}
                      </span>
                      {member.isAdmin && (
                        <Badge tone="brand">
                          <ShieldCheck className="w-3 h-3" />
                          حساب الجمعية
                        </Badge>
                      )}
                      {isSelf && <Badge tone="neutral">أنت</Badge>}
                      {!member.isActive && <Badge tone="neutral">معطّل</Badge>}
                      {!member.isAccountActive && <Badge tone="danger">موقوف من زاد</Badge>}
                    </div>
                    <p
                      className="text-meta flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-400 dark:text-slate-500"
                    >
                      <span dir="ltr" className="font-mono tabular-nums">
                        {member.phone}
                      </span>
                      <span>{charityMemberLabel(member.isAdmin, member.title)}</span>
                      {!member.isAdmin && (
                        <span>
                          {member.services.length > 0
                            ? `${member.services.length} خدمة مفوَّضة`
                            : "بلا خدمات"}
                        </span>
                      )}
                      <span>
                        {member.isAdmin
                          ? "جميع الصلاحيات والخدمات"
                          : member.permissions.length > 0
                            ? `${member.permissions.length} صلاحية`
                            : "بدون صلاحيات إدارية"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditing(member);
                        setEditDraft({
                          title: member.title,
                          // Retired ids can still be sitting in a membership
                          // created before they were retired; seeding the draft
                          // with them would show a permission that no longer
                          // exists and send it straight back on save.
                          permissions: sanitizeCharityPermissions(member.permissions),
                          services: member.services,
                          isAdmin: member.isAdmin,
                        });
                        setError(null);
                        setEditError(null);
                      }}
                      disabled={locked || busy || isPending}
                      title={
                        isSelf
                          ? "لا يمكنك تعديل صلاحياتك بنفسك"
                          : member.isAdmin
                            ? "حساب الجمعية يُدار من زاد"
                            : undefined
                      }
                      className={btn.secondary}
                    >
                      الصلاحيات
                    </button>
                    <button
                      onClick={() => toggleActive(member)}
                      disabled={locked || busy || isPending}
                      title={member.isAdmin ? "حساب الجمعية يُدار من زاد" : undefined}
                      className={`text-meta text-meta inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium
                                  disabled:opacity-40 disabled:pointer-events-none
                                  transition-[box-shadow,color] duration-300 ${
                                    member.isActive
                                      ? "text-rose-600 dark:text-rose-400 shadow-[inset_0_0_0_1px_rgb(225_29_72_/_.20)] hover:border border-red-200 dark:border-red-500/20"
                                      : "text-emerald-600 dark:text-emerald-400 shadow-[inset_0_0_0_1px_rgb(16_185_129_/_.20)] hover:border border-emerald-200 dark:border-emerald-500/20"
                                  }`}
                    >
                      {member.isActive ? (
                        <UserX className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                      {member.isActive ? "تعطيل" : "تفعيل"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </HrCard>

      {/* ── Permission editor ────────────────────────────────────────────── */}
      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4
 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setEditing(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto no-scrollbar
 animate-in zoom-in-95 duration-300"
          >
            <HrCard className="p-6 space-y-6">
              <SectionHead
                title={`صلاحيات ${editing.name}`}
                hint="داخل هذه الجمعية فقط"
                action={
                  <button
                    onClick={() => setEditing(null)}
                    aria-label="إغلاق"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors duration-300 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                }
              />

              <Field label="المسمى الوظيفي" hint="مسمى تعريفي فقط، لا يمنح أي صلاحية.">
                <Select
                  variant="soft"
                  value={editDraft.title}
                  onSelect={(v) => setEditDraft({ ...editDraft, title: v })}
                  placeholder="اختر المسمى"
                  options={titleOptions.map((t) => ({ value: t.id, label: t.label }))}
                  className="w-full [&>button]:w-full [&>button]:justify-between"
                />
              </Field>

              {/* ولا علَمَ «حساب الجمعية» هنا: يُعيَّن من زادٍ وحدَها، فلا يُنقل من
                  داخل الجمعية إلى شخصٍ آخر. وصفُّه مقفولٌ في القائمة أصلاً. */}
              <ServiceEditor
                services={charityServices}
                selected={editDraft.services}
                onToggle={(name) => setEditDraft({ ...editDraft, ...withService(editDraft, name) })}
              />
              <PermissionEditor
                selected={editDraft.permissions}
                grantable={grantable}
                services={editDraft.services}
                onToggle={(id) =>
                  setEditDraft({ ...editDraft, permissions: toggleIn(editDraft.permissions, id) })
                }
              />

              {editError && (
                <Note tone="danger" icon={<AlertTriangle className="size-3.5" />}>
                  {editError}
                </Note>
              )}

              <div className="flex flex-wrap gap-2">
                <button onClick={submitEdit} disabled={busy} className={btn.primary}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  حفظ
                </button>
                <button onClick={() => setEditing(null)} className={btn.secondary}>
                  إلغاء
                </button>
              </div>
            </HrCard>
          </div>
        </div>
      )}
    </div>
  );
}
