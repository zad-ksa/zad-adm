"use client";

import { useEffect, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, ChevronLeft, History, Pencil, Plus, Rss, Trash2 } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { EmptyState } from "@/components/console/layout";
import { btn, cx, field, Field, MONO, Spinner } from "@/components/console/ui";
import { confirmAction } from "@/components/console/confirmBus";
import { promptAction } from "@/components/console/promptBus";
import { notify } from "@/components/console/toastBus";
import {
  addCustomColumn,
  addLatestUpdate,
  addSubColumn,
  deleteCustomColumn,
  deleteLatestUpdate,
  deleteSubColumn,
  getCellHistory,
  renameCustomColumn,
  renameSubColumn,
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
  /** في الجدول العام: اسم الخدمة الفرعية إن كان آخر حدثٍ عليها. */
  subColumnName: string | null;
};

export type GridColumn = {
  /** في الجدول العام: مفتاح العمود. وفي الفرعي: معرّف الخدمة الفرعية. */
  id: string;
  name: string;
  /** يُعدَّل ويُحذف: عمودٌ خاصّ أو خدمةٌ فرعية — لا خدمةٌ أصلية أبداً. */
  editable: boolean;
  /** الضغط على العنوان يفتح الجدول الفرعي (في الجدول العام وحده). */
  href?: string;
};

type Charity = { id: string; name: string };

/**
 * `main`: الجدول العام، أعمدته الخدمات والأعمدة الخاصة.
 * `sub`: جدول خدمةٍ واحدة، أعمدته خدماتها الفرعية، وأحداثه تُحفظ على العمود الأب.
 */
export type GridMode = { kind: "main" } | { kind: "sub"; parentKey: string; parentName: string };

type CellRef = { charity: Charity; column: GridColumn };

const key = (charityId: string, columnId: string) => `${charityId}::${columnId}`;

/** اللون دلالة: كم مضى على آخر حدثٍ في الخانة بلا جديدٍ بعده. */
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

/** أين يُحفظ حدث خانة: العمود الأب، ومعه الخدمة الفرعية في الجدول الفرعي. */
function target(mode: GridMode, column: GridColumn) {
  return mode.kind === "main"
    ? { columnKey: column.id, subColumnId: undefined }
    : { columnKey: mode.parentKey, subColumnId: column.id };
}

// ── اتجاه العرض ───────────────────────────────────────────────────────────
// يُحفظ في المتصفح لكل جدول: من قلبه مرةً يجده مقلوباً حين يعود.

const transposeListeners = new Set<() => void>();

function useTransposed(storageKey: string): [boolean, () => void] {
  const value = useSyncExternalStore(
    (cb) => {
      transposeListeners.add(cb);
      return () => transposeListeners.delete(cb);
    },
    () => localStorage.getItem(storageKey) === "1",
    () => false
  );
  const toggle = () => {
    localStorage.setItem(storageKey, value ? "0" : "1");
    for (const cb of transposeListeners) cb();
  };
  return [value, toggle];
}

export default function LatestUpdatesClient({
  mode,
  charities,
  columns,
  visible,
  latest,
  canAdd,
  canManage,
  today,
}: {
  mode: GridMode;
  charities: Charity[];
  columns: GridColumn[];
  /** الخانات القائمة: key(charityId, column.id). وما سواها «غير مفعّلة». */
  visible: string[];
  latest: Record<string, LatestCell>;
  canAdd: boolean;
  canManage: boolean;
  today: string;
}) {
  const router = useRouter();
  const visibleSet = new Set(visible);
  const [transposed, toggleTransposed] = useTransposed(
    mode.kind === "main" ? "latest-updates:transposed" : "latest-updates:sub-transposed"
  );
  const [adding, setAdding] = useState<CellRef | null>(null);
  const [viewing, setViewing] = useState<CellRef | null>(null);
  const [pending, startTransition] = useTransition();

  const columnNoun = mode.kind === "main" ? "عمود" : "خدمة فرعية";

  const run = (action: () => Promise<{ success: boolean; error?: string }>, ok: string) =>
    startTransition(async () => {
      const res = await action();
      if (!res.success) {
        notify("error", res.error || "تعذّر الحفظ");
        return;
      }
      notify("ok", ok);
      router.refresh();
    });

  const addColumn = async () => {
    const name = await promptAction({
      title: mode.kind === "main" ? "إضافة عمود" : `إضافة خدمة فرعية تحت «${mode.parentName}»`,
      message:
        mode.kind === "main"
          ? "عمودٌ خاصٌّ بهذا الجدول: لا يظهر في «إدارة الخدمات» ولا في أي مكانٍ آخر من الموقع."
          : undefined,
      label: "الاسم",
      confirmLabel: "إضافة",
    });
    if (!name?.trim()) return;
    run(() => (mode.kind === "main" ? addCustomColumn(name) : addSubColumn(mode.parentKey, name)), `أُضيفت «${name.trim()}»`);
  };

  const renameColumn = async (column: GridColumn) => {
    const name = await promptAction({ title: `تعديل اسم ${columnNoun}`, label: "الاسم", defaultValue: column.name, confirmLabel: "حفظ" });
    if (!name?.trim() || name.trim() === column.name) return;
    run(() => (mode.kind === "main" ? renameCustomColumn(column.id, name) : renameSubColumn(column.id, name)), "عُدِّل الاسم");
  };

  const deleteColumn = async (column: GridColumn) => {
    const ok = await confirmAction({
      title: `حذف «${column.name}»؟`,
      message:
        mode.kind === "main"
          ? "يُحذف العمود ومستجداته كلها وخدماته الفرعية نهائياً."
          : "تُحذف الخدمة الفرعية ومستجداتها نهائياً، وتختفي من الجدول العام.",
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    run(() => (mode.kind === "main" ? deleteCustomColumn(column.id) : deleteSubColumn(column.id)), "حُذف");
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {canManage && (
        <button type="button" onClick={addColumn} disabled={pending} className={btn.primary}>
          {pending ? <Spinner /> : <Plus className="size-4" />}
          {mode.kind === "main" ? "إضافة عمود" : "إضافة خدمة فرعية"}
        </button>
      )}
      <button type="button" onClick={toggleTransposed} className={btn.secondary} aria-pressed={transposed}>
        <ArrowLeftRight className="size-4" />
        {transposed ? "الجمعيات صفوفاً" : "الجمعيات أعمدةً"}
      </button>
    </div>
  );

  if (charities.length === 0 || columns.length === 0) {
    return (
      <div className="space-y-3">
        {toolbar}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <EmptyState
            icon={<Rss className="w-5 h-5" />}
            title={
              charities.length === 0
                ? "لا جمعيات مسنَدة إليك"
                : mode.kind === "main"
                  ? "لا خدمات مرتبطة بك"
                  : "لا خدمات فرعية بعد"
            }
            description={
              charities.length === 0
                ? "يظهر الجدول بالجمعيات المسنَدة إليك."
                : mode.kind === "main"
                  ? "يظهر الجدول بالخدمات الممنوحة لك."
                  : canManage
                    ? "أضف أول خدمةٍ فرعية من الزر أعلاه."
                    : "تظهر هنا حين تُضاف خدماتٌ فرعية."
            }
          />
        </div>
      </div>
    );
  }

  const columnHeader = (column: GridColumn) => (
    <ColumnHeader column={column} canManage={canManage} busy={pending} onRename={renameColumn} onDelete={deleteColumn} />
  );
  const charityHeader = (c: Charity) => c.name;
  const cellFor = (c: Charity, column: GridColumn) => {
    const k = key(c.id, column.id);
    return (
      <Cell
        exists={visibleSet.has(k)}
        canAdd={canAdd}
        cell={latest[k]}
        label={`${c.name} — ${column.name}`}
        onAdd={() => setAdding({ charity: c, column })}
        onOpen={() => setViewing({ charity: c, column })}
      />
    );
  };

  return (
    <div className="space-y-3">
      {toolbar}
      {transposed ? (
        <Grid
          corner={mode.kind === "main" ? "الخدمة" : "الخدمة الفرعية"}
          top={charities}
          side={columns}
          topHeader={charityHeader}
          sideHeader={columnHeader}
          cell={(column, c) => cellFor(c, column)}
          id={(x) => x.id}
        />
      ) : (
        <Grid
          corner="الجمعية"
          top={columns}
          side={charities}
          topHeader={columnHeader}
          sideHeader={charityHeader}
          cell={(c, column) => cellFor(c, column)}
          id={(x) => x.id}
        />
      )}

      <Legend />

      {adding && <AddDialog mode={mode} target={adding} today={today} onClose={() => setAdding(null)} />}
      {viewing && (
        <HistoryDialog
          mode={mode}
          target={viewing}
          today={today}
          canAdd={canAdd}
          canManage={canManage}
          onAdd={() => {
            setAdding(viewing);
            setViewing(null);
          }}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

/**
 * الجدول بتثبيت Excel: الصفّ الأول والعمود الأول (الأيمن) يبقيان مع التمرير.
 * واحدٌ للاتجاهين — القلب يبادل ما في الأعلى بما على الجانب، لا جدولٌ ثانٍ.
 */
function Grid<T, S>({
  corner,
  top,
  side,
  topHeader,
  sideHeader,
  cell,
  id,
}: {
  corner: string;
  top: T[];
  side: S[];
  topHeader: (t: T) => ReactNode;
  sideHeader: (s: S) => ReactNode;
  cell: (s: S, t: T) => ReactNode;
  id: (x: T | S) => string;
}) {
  return (
    <div className="relative max-h-[calc(100dvh-14rem)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:border-slate-800 dark:bg-slate-900">
      <table className="border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky start-0 top-0 z-30 min-w-44 border-b border-e border-slate-200 bg-slate-100 px-4 py-3 text-start text-[12.5px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {corner}
            </th>
            {top.map((t) => (
              <th
                key={id(t)}
                scope="col"
                className="sticky top-0 z-20 w-64 min-w-64 max-w-64 border-b border-e border-slate-200 bg-slate-50 px-4 py-3 text-start align-top text-[12.5px] font-semibold text-slate-700 last:border-e-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {topHeader(t)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {side.map((s) => (
            <tr key={id(s)}>
              <th
                scope="row"
                className="sticky start-0 z-10 min-w-44 max-w-56 border-b border-e border-slate-200 bg-slate-50 px-4 py-3 text-start align-top font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {sideHeader(s)}
              </th>
              {top.map((t) => (
                <td
                  key={id(t)}
                  className="group relative w-64 min-w-64 max-w-64 border-b border-e border-slate-100 p-0 align-top last:border-e-0 dark:border-slate-800"
                >
                  {cell(s, t)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ColumnHeader({
  column,
  canManage,
  busy,
  onRename,
  onDelete,
}: {
  column: GridColumn;
  canManage: boolean;
  busy: boolean;
  onRename: (c: GridColumn) => void;
  onDelete: (c: GridColumn) => void;
}) {
  return (
    <div className="flex items-start gap-1">
      {column.href ? (
        <Link
          href={column.href}
          title="فتح الخدمات الفرعية"
          className="inline-flex min-w-0 flex-1 items-center gap-1 rounded hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:text-teal-300"
        >
          <span className="break-words">{column.name}</span>
          <ChevronLeft className="size-3.5 shrink-0 opacity-60" />
        </Link>
      ) : (
        <span className="min-w-0 flex-1 break-words">{column.name}</span>
      )}
      {column.editable && canManage && (
        <span className="-my-1 flex shrink-0">
          <button type="button" disabled={busy} onClick={() => onRename(column)} className={cx(btn.icon, "size-7")} aria-label={`تعديل اسم ${column.name}`}>
            <Pencil className="size-3.5" />
          </button>
          <button type="button" disabled={busy} onClick={() => onDelete(column)} className={cx(btn.iconDanger, "size-7")} aria-label={`حذف ${column.name}`}>
            <Trash2 className="size-3.5" />
          </button>
        </span>
      )}
    </div>
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
      <div className="h-full bg-slate-50/60 px-4 py-3 text-[12px] text-slate-400 dark:bg-slate-950/40 dark:text-slate-600">
        الخدمة غير مفعّلة
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
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
          {cell.subColumnName && (
            <span className="mb-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[11.5px] font-medium text-primary dark:bg-teal-400/10 dark:text-teal-300">
              {cell.subColumnName}
            </span>
          )}
          {/* النصّ كاملاً يُقرأ في مكانه؛ وما زاد عن ارتفاع الخانة يُمرَّر داخلها. */}
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
    </div>
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

function AddDialog({ mode, target: ref, today, onClose }: { mode: GridMode; target: CellRef; today: string; onClose: () => void }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [eventDate, setEventDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const where = mode.kind === "main" ? ref.column.name : `${mode.parentName} ‹ ${ref.column.name}`;

  return (
    <Dialog
      title="إضافة مستجد"
      description={`${ref.charity.name} — ${where}`}
      icon={<Plus className="size-4" />}
      onClose={onClose}
      busy={pending}
      closeOnBackdrop={false}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await addLatestUpdate({ charityId: ref.charity.id, ...target(mode, ref.column), content, eventDate });
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
            placeholder="ما آخر ما استجدّ هنا؟"
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
  mode,
  target: ref,
  today,
  canAdd,
  canManage,
  onAdd,
  onClose,
}: {
  mode: GridMode;
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
  const { columnKey, subColumnId } = target(mode, ref.column);
  const where = mode.kind === "main" ? ref.column.name : `${mode.parentName} ‹ ${ref.column.name}`;

  useEffect(() => {
    let cancelled = false;
    getCellHistory(ref.charity.id, columnKey, subColumnId).then((res) => {
      if (cancelled) return;
      if (res.success) setEntries(res.data ?? []);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [ref.charity.id, columnKey, subColumnId, version]);

  const reload = () => {
    setVersion((v) => v + 1);
    router.refresh();
  };

  return (
    <Dialog
      title="سجلّ المستجدات"
      description={`${ref.charity.name} — ${where}`}
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
        <p className="py-8 text-center text-[13px] text-slate-500">لا مستجدات في هذه الخانة.</p>
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
                {mode.kind === "main" && entry.subColumnName && (
                  <span className="mb-1.5 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[11.5px] font-medium text-primary dark:bg-teal-400/10 dark:text-teal-300">
                    {entry.subColumnName}
                  </span>
                )}
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
