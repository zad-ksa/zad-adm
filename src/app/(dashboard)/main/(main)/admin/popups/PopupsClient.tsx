"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/console/layout";
import { Badge, btn, cx, field } from "@/components/console/ui";
import { Sheet } from "@/components/console/overlays";
import Select from "@/components/console/Select";
import MultiSelect from "@/components/console/MultiSelect";
import DateField from "@/components/console/DateField";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import { POPUP_PAGES, POPUP_REPEATS, popupPageLabel } from "@/lib/portalPopups";
import { deletePortalPopup, savePortalPopup, togglePortalPopup } from "@/app/actions/portalPopups";

export type PopupRow = {
  id: string;
  title: string;
  body: string;
  pageKey: string;
  charityIds: string[];
  repeatMode: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  authorName: string | null;
  /** كم عضواً أغلقه — يقول إن كان وصل أم لا. */
  seenCount: number;
};

type Charity = { id: string; name: string };

/**
 * شاشةُ الإشعارات الانبثاقيّة: ما يُعرض لأعضاء الجمعيات في صفحةٍ بعينها.
 *
 * **والاستهدافُ الفارغُ تعميم**: لا خانةَ «للجميع» منفصلة — قائمةٌ فارغةٌ
 * تعني الكلَّ، وجمعيةٌ تُضاف غداً تدخل فيه بلا تعديل. وخانةٌ ثانيةٌ تقول
 * الشيءَ نفسَه تُنشئ حالتين متناقضتين: «للجميع» ومعها جمعيّتان مختارتان.
 */
export default function PopupsClient({
  popups,
  charities,
}: {
  popups: PopupRow[];
  charities: Charity[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PopupRow | "new" | null>(null);
  const [busy, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        notify("error", res.error ?? "تعذرت العملية");
        return;
      }
      done?.();
      router.refresh();
    });

  const nameOf = (id: string) => charities.find((c) => c.id === id)?.name ?? "جمعية محذوفة";

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        crumbs={[{ label: "لوحة التحكم", href: "/main/admin" }, { label: "إشعارات البوابة" }]}
        icon={<BellRing className="size-6" />}
        title="إشعارات البوابة الانبثاقية"
        description="رسالة تظهر لعضو الجمعية حين يفتح الصفحة التي تختارها — مرة واحدة أو في كل زيارة."
        actions={
          <button type="button" onClick={() => setEditing("new")} className={btn.primary}>
            <Plus className="size-4" /> إشعار جديد
          </button>
        }
      />

      {popups.length === 0 ? (
        <EmptyState
          icon={<BellRing className="size-4" />}
          title="لا إشعارات بعد"
          description="اكتب إشعارا واختر صفحته والجمعيات التي تراه."
        />
      ) : (
        <ul className="space-y-3">
          {popups.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-body font-semibold text-slate-900 dark:text-slate-100">{p.title}</h2>
                    <Badge tone={p.isActive ? "good" : "neutral"}>{p.isActive ? "يعمل" : "معطل"}</Badge>
                    <Badge tone="brand">{popupPageLabel(p.pageKey)}</Badge>
                    <Badge tone="neutral">
                      {p.repeatMode === "EVERY" ? "كل زيارة" : "مرة واحدة"}
                    </Badge>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-caption leading-6 text-slate-600 dark:text-slate-300">
                    {p.body}
                  </p>
                  <p className="mt-1.5 text-meta text-slate-400">
                    {p.charityIds.length === 0
                      ? "كل الجمعيات"
                      : p.charityIds.map(nameOf).join("، ")}
                    {(p.startsAt || p.endsAt) &&
                      ` · من ${p.startsAt ?? "الآن"} إلى ${p.endsAt ?? "إشعار آخر"}`}
                    {` · أغلقه ${p.seenCount}`}
                    {p.authorName ? ` · ${p.authorName}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => togglePortalPopup(p.id, !p.isActive))}
                    className={btn.secondary}
                  >
                    {p.isActive ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                    {p.isActive ? "تعطيل" : "تفعيل"}
                  </button>
                  <button
                    type="button"
                    aria-label="تعديل"
                    onClick={() => setEditing(p)}
                    className={btn.icon}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="حذف"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await confirmAction({
                          title: `حذف «${p.title}»؟`,
                          message: "لن يظهر بعدها لأحد، ويحذف معه سجل من أغلقوه.",
                          confirmLabel: "حذف",
                          tone: "danger",
                        })
                      ) {
                        run(() => deletePortalPopup(p.id));
                      }
                    }}
                    className={cx(btn.icon, "text-rose-500 hover:text-rose-600")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PopupSheet
          row={editing === "new" ? null : editing}
          charities={charities}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(id, input) => run(() => savePortalPopup(id, input), () => setEditing(null))}
        />
      )}
    </div>
  );
}

function PopupSheet({
  row,
  charities,
  busy,
  onClose,
  onSave,
}: {
  row: PopupRow | null;
  charities: Charity[];
  busy: boolean;
  onClose: () => void;
  onSave: (
    id: string | null,
    input: {
      title: string;
      body: string;
      pageKey: string;
      charityIds: string[];
      repeatMode: string;
      isActive: boolean;
      startsAt: string | null;
      endsAt: string | null;
    }
  ) => void;
}) {
  const [title, setTitle] = useState(row?.title ?? "");
  const [body, setBody] = useState(row?.body ?? "");
  const [pageKey, setPageKey] = useState(row?.pageKey ?? "ANY");
  const [charityIds, setCharityIds] = useState<string[]>(row?.charityIds ?? []);
  const [repeatMode, setRepeatMode] = useState(row?.repeatMode ?? "ONCE");
  const [startsAt, setStartsAt] = useState(row?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(row?.endsAt ?? "");

  return (
    <Sheet
      title={row ? "تعديل الإشعار" : "إشعار جديد"}
      subtitle="يظهر لعضو الجمعية حين يفتح الصفحة المختارة."
      onClose={onClose}
      busy={busy}
      onSubmit={() =>
        onSave(row?.id ?? null, {
          title,
          body,
          pageKey,
          charityIds,
          repeatMode,
          isActive: row?.isActive ?? true,
          startsAt: startsAt || null,
          endsAt: endsAt || null,
        })
      }
      footer={
        <>
          <span />
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={busy} className={btn.secondary}>
              إلغاء
            </button>
            <button type="submit" disabled={busy || !title.trim() || !body.trim()} className={btn.primary}>
              حفظ
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
            العنوان
          </span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} autoFocus />
        </label>

        <label className="block">
          <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
            النص
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className={cx(field, "h-auto py-2 leading-6")}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
            يظهر في
          </span>
          <Select
            value={pageKey}
            onSelect={setPageKey}
            placeholder="اختر الصفحة…"
            options={POPUP_PAGES.map((p) => ({ value: p.key, label: p.label }))}
            className="[&>button]:w-full [&>button]:justify-between"
          />
        </label>

        <div>
          <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
            الجمعيات
          </span>
          <MultiSelect
            options={charities.map((c) => ({ value: c.id, label: c.name }))}
            values={charityIds}
            onChange={setCharityIds}
            placeholder="كل الجمعيات"
            label="الجمعيات"
            countNoun="جمعية"
            className="[&>button]:w-full [&>button]:justify-between"
          />
          <p className="mt-1 text-meta text-slate-400">اتركها فارغة ليصل كل الجمعيات، ومنها ما يضاف لاحقا.</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
            التكرار
          </span>
          <Select
            value={repeatMode}
            onSelect={setRepeatMode}
            placeholder="التكرار"
            options={POPUP_REPEATS.map((r) => ({ value: r.value, label: r.label }))}
            className="[&>button]:w-full [&>button]:justify-between"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
              يبدأ (اختياري)
            </span>
            <DateField value={startsAt} onChange={setStartsAt} />
          </label>
          <label className="block">
            <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
              ينتهي (اختياري)
            </span>
            <DateField value={endsAt} onChange={setEndsAt} min={startsAt || undefined} />
          </label>
        </div>
      </div>
    </Sheet>
  );
}
