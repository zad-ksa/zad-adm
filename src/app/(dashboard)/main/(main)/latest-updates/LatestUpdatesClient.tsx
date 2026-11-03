"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, Pencil, Plus, Rss, Trash2 } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { EmptyState } from "@/components/console/layout";
import { btn, cx, field, Field, MONO, Spinner } from "@/components/console/ui";
import { confirmAction } from "@/components/console/confirmBus";
import { notify } from "@/components/console/toastBus";
import {
  addLatestUpdate,
  deleteLatestUpdate,
  getCellHistory,
  updateLatestUpdate,
  type LatestUpdateEntry,
} from "@/app/actions/latestUpdates";
import type { Staleness } from "@/lib/latestUpdates";

export type LatestCell = {
  content: string;
  /** "YYYY-MM-DD" */
  eventDate: string;
  since: string;
  staleness: Staleness;
  count: number;
};

type Charity = { id: string; name: string };
type CellRef = { charity: Charity; serviceName: string };

const key = (charityId: string, serviceName: string) => `${charityId}::${serviceName}`;

/** اللون دلالة: كم مضى على آخر حدثٍ في الخلية بلا جديدٍ بعده. */
const STALENESS_CLASS: Record<Staleness, string> = {
  fresh: "text-slate-500 dark:text-slate-400",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  yellow: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const dateFormat = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** "YYYY-MM-DD" أو ISO → تاريخٌ ميلادي للعرض. */
function formatDate(value: string) {
  return dateFormat.format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
}

/** تاريخ الإضافة لحظةُ إدخال، فيُعرض بيوم الرياض لا بيوم UTC. */
function formatInstant(iso: string) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    timeZone: "Asia/Riyadh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export default function LatestUpdatesClient({
  charities,
  serviceNames,
  existing,
  addable,
  latest,
  canManage,
  today,
}: {
  charities: Charity[];
  serviceNames: string[];
  existing: string[];
  addable: string[];
  latest: Record<string, LatestCell>;
  canManage: boolean;
  today: string;
}) {
  const existingSet = new Set(existing);
  const addableSet = new Set(addable);
  const [adding, setAdding] = useState<CellRef | null>(null);
  const [viewing, setViewing] = useState<CellRef | null>(null);

  if (charities.length === 0 || serviceNames.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <EmptyState icon={<Rss className="w-5 h-5" />} title="لا جمعيات أو خدمات بعد" description="يظهر الجدول حين تُضاف الجمعيات وخدماتها." />
      </div>
    );
  }

  return (
    <>
      {/* التثبيت كما في Excel: الصفّ الأول والعمود الأول (الأيمن) يبقيان مع التمرير. */}
      <div className="relative max-h-[calc(100dvh-12rem)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:border-slate-800 dark:bg-slate-900">
        <table className="border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky start-0 top-0 z-30 min-w-44 border-b border-e border-slate-200 bg-slate-100 px-4 py-3 text-start text-[12.5px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                الجمعية
              </th>
              {serviceNames.map((s) => (
                <th
                  key={s}
                  scope="col"
                  className="sticky top-0 z-20 w-64 min-w-64 max-w-64 border-b border-e border-slate-200 bg-slate-50 px-4 py-3 text-start text-[12.5px] font-semibold text-slate-700 last:border-e-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {charities.map((c) => (
              <tr key={c.id}>
                <th
                  scope="row"
                  className="sticky start-0 z-10 border-b border-e border-slate-200 bg-slate-50 px-4 py-3 text-start align-top font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {c.name}
                </th>
                {serviceNames.map((s) => {
                  const k = key(c.id, s);
                  return (
                    <Cell
                      key={s}
                      exists={existingSet.has(k)}
                      canAdd={addableSet.has(k)}
                      cell={latest[k]}
                      label={`${c.name} — ${s}`}
                      onAdd={() => setAdding({ charity: c, serviceName: s })}
                      onOpen={() => setViewing({ charity: c, serviceName: s })}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Legend />

      {adding && <AddDialog target={adding} today={today} onClose={() => setAdding(null)} />}
      {viewing && (
        <HistoryDialog
          target={viewing}
          today={today}
          canAdd={addableSet.has(key(viewing.charity.id, viewing.serviceName))}
          canManage={canManage}
          onAdd={() => {
            setAdding(viewing);
            setViewing(null);
          }}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}

function Cell({
  exists,
  canAdd,
  cell,
  label,
  onAdd,
  onOpen,
}: {
  exists: boolean;
  canAdd: boolean;
  cell?: LatestCell;
  label: string;
  onAdd: () => void;
  onOpen: () => void;
}) {
  if (!exists) {
    return (
      <td className="w-64 min-w-64 max-w-64 border-b border-e border-slate-100 bg-slate-50/60 px-4 py-3 align-top text-[12px] text-slate-400 last:border-e-0 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-600">
        الخدمة غير مفعّلة
      </td>
    );
  }

  return (
    <td className="group relative w-64 min-w-64 max-w-64 border-b border-e border-slate-100 px-4 py-3 align-top last:border-e-0 dark:border-slate-800">
      {cell ? (
        <div
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen();
            }
          }}
          aria-label={`سجلّ ${label}`}
          className="-m-1.5 cursor-pointer rounded-lg p-1.5 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-slate-800/50"
        >
          {/* النصّ كاملاً يُقرأ في مكانه؛ وما زاد عن ارتفاع الخلية يُمرَّر داخلها. */}
          <p className="max-h-44 overflow-y-auto whitespace-pre-wrap break-words pe-6 leading-6 text-slate-800 dark:text-slate-200">
            {cell.content}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
            <span className={cx(MONO, "text-slate-500 dark:text-slate-400")}>{formatDate(cell.eventDate)}</span>
            <span className={cx("rounded-full px-2 py-0.5 font-medium", STALENESS_CLASS[cell.staleness])}>{cell.since}</span>
            {cell.count > 1 && (
              <span className="ms-auto inline-flex items-center gap-1 text-slate-400">
                <History className="size-3.5" />
                <span className={MONO}>{cell.count}</span>
              </span>
            )}
          </div>
        </div>
      ) : (
        <span className="text-slate-300 dark:text-slate-700">—</span>
      )}

      {canAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`إضافة مستجد: ${label}`}
          title="إضافة مستجد"
          className={cx(
            "absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-primary text-white shadow-sm transition-opacity",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
            "outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          )}
        >
          <Plus className="size-4" />
        </button>
      )}
    </td>
  );
}

function Legend() {
  const items: [Staleness, string][] = [
    ["green", "يوما عمل"],
    ["yellow", "4 أيام عمل"],
    ["red", "6 أيام عمل فأكثر"],
  ];
  return (
    <p className="flex flex-wrap items-center gap-3 text-[12px] text-slate-500 dark:text-slate-400">
      <span>منذ آخر مستجد بلا جديدٍ بعده:</span>
      {items.map(([tone, text]) => (
        <span key={tone} className={cx("rounded-full px-2 py-0.5 font-medium", STALENESS_CLASS[tone])}>
          {text}
        </span>
      ))}
    </p>
  );
}

function AddDialog({ target, today, onClose }: { target: CellRef; today: string; onClose: () => void }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [eventDate, setEventDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      title="إضافة مستجد"
      description={`${target.charity.name} — ${target.serviceName}`}
      icon={<Plus className="size-4" />}
      onClose={onClose}
      busy={pending}
      closeOnBackdrop={false}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await addLatestUpdate({
            charityId: target.charity.id,
            serviceName: target.serviceName,
            content,
            eventDate,
          });
          if (!res.success) {
            setError(res.error);
            return;
          }
          notify("ok", "أُضيف المستجد");
          onClose();
          router.refresh();
        });
      }}
      footer={
        <>
          {error && <p className="me-auto text-[12.5px] text-red-600 dark:text-red-400">{error}</p>}
          <button type="button" onClick={onClose} disabled={pending} className={btn.secondary}>
            إلغاء
          </button>
          <button type="submit" disabled={pending || !content.trim()} className={btn.primary}>
            {pending && <Spinner />}
            إضافة
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field id="lu-content" label="المستجد">
          <textarea
            id="lu-content"
            autoFocus
            rows={5}
            maxLength={2000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={cx(field, "h-auto resize-y py-2 leading-6")}
            placeholder="ما آخر ما استجدّ في هذه الخدمة لهذه الجمعية؟"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="lu-event" label="تاريخ الحدث" hint="افتراضيّه اليوم، ويُعدَّل إن وقع الحدث قبله.">
            <input
              id="lu-event"
              type="date"
              required
              max={today}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={cx(field, MONO)}
            />
          </Field>
          <Field id="lu-created" label="تاريخ الإضافة" hint="يُسجَّل تلقائياً ولا يُعدَّل.">
            <input id="lu-created" type="date" value={today} disabled readOnly className={cx(field, MONO)} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}

function HistoryDialog({
  target,
  today,
  canAdd,
  canManage,
  onAdd,
  onClose,
}: {
  target: CellRef;
  today: string;
  canAdd: boolean;
  canManage: boolean;
  onAdd: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<LatestUpdateEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getCellHistory(target.charity.id, target.serviceName).then((res) => {
      if (cancelled) return;
      if (res.success) setEntries(res.data ?? []);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [target.charity.id, target.serviceName, version]);

  const reload = () => {
    setVersion((v) => v + 1);
    router.refresh();
  };

  return (
    <Dialog
      title="سجلّ المستجدات"
      description={`${target.charity.name} — ${target.serviceName}`}
      icon={<History className="size-4" />}
      size="lg"
      onClose={onClose}
      headerAction={
        canAdd ? (
          <button type="button" onClick={onAdd} className={btn.primary}>
            <Plus className="size-4" />
            إضافة
          </button>
        ) : undefined
      }
    >
      {error ? (
        <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>
      ) : entries === null ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-slate-500">لا مستجدات في هذه الخلية.</p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry, i) =>
            editingId === entry.id ? (
              <EditEntry
                key={entry.id}
                entry={entry}
                today={today}
                onCancel={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  reload();
                }}
              />
            ) : (
              <li
                key={entry.id}
                className={cx(
                  "rounded-xl border p-4",
                  i === 0
                    ? "border-primary/30 bg-primary/[0.03] dark:border-teal-400/30"
                    : "border-slate-200 dark:border-slate-800"
                )}
              >
                <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-800 dark:text-slate-200">{entry.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400">
                  <span>
                    تاريخ الحدث: <span className={MONO}>{formatDate(entry.eventDate)}</span>
                  </span>
                  <span>
                    تاريخ الإضافة: <span className={MONO}>{formatInstant(entry.createdAt)}</span>
                  </span>
                  {entry.createdByName && <span>بواسطة {entry.createdByName}</span>}
                  {entry.edited && <span>(عُدِّل{entry.updatedByName ? ` بواسطة ${entry.updatedByName}` : ""})</span>}
                  {canManage && (
                    <span className="ms-auto flex items-center gap-1">
                      <button type="button" onClick={() => setEditingId(entry.id)} className={btn.icon} aria-label="تعديل">
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        className={btn.iconDanger}
                        aria-label="حذف"
                        onClick={async () => {
                          const ok = await confirmAction({
                            title: "حذف هذا المستجد؟",
                            message: "يُحذف من السجلّ نهائياً.",
                            confirmLabel: "حذف",
                            tone: "danger",
                          });
                          if (!ok) return;
                          const res = await deleteLatestUpdate(entry.id);
                          if (!res.success) {
                            notify("error", res.error);
                            return;
                          }
                          notify("ok", "حُذف المستجد");
                          reload();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </span>
                  )}
                </div>
              </li>
            )
          )}
        </ol>
      )}
    </Dialog>
  );
}

function EditEntry({
  entry,
  today,
  onCancel,
  onSaved,
}: {
  entry: LatestUpdateEntry;
  today: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(entry.content);
  const [eventDate, setEventDate] = useState(entry.eventDate);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="space-y-3 rounded-xl border border-primary/40 p-4">
      <textarea
        aria-label="المستجد"
        rows={4}
        maxLength={2000}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className={cx(field, "h-auto resize-y py-2 leading-6")}
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-[12px] text-slate-600 dark:text-slate-400">
          <span className="block">تاريخ الحدث</span>
          <input
            type="date"
            max={today}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className={cx(field, MONO, "w-44")}
          />
        </label>
        <span className="pb-2 text-[12px] text-slate-500">
          تاريخ الإضافة: <span className={MONO}>{formatInstant(entry.createdAt)}</span>
        </span>
        <span className="ms-auto flex gap-2">
          <button type="button" onClick={onCancel} disabled={pending} className={btn.secondary}>
            إلغاء
          </button>
          <button
            type="button"
            disabled={pending || !content.trim()}
            className={btn.primary}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await updateLatestUpdate(entry.id, { content, eventDate });
                if (!res.success) {
                  setError(res.error);
                  return;
                }
                notify("ok", "عُدِّل المستجد");
                onSaved();
              });
            }}
          >
            {pending && <Spinner />}
            حفظ
          </button>
        </span>
      </div>
      {error && <p className="text-[12.5px] text-red-600 dark:text-red-400">{error}</p>}
    </li>
  );
}
