"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpen, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState, SearchField } from "@/components/console/layout";
import { Badge, Spinner, btn, cx } from "@/components/console/ui";
import { Dialog } from "@/components/console/Dialog";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { TableViewControls, useTableView } from "@/components/console/TableViewControls";
import { notify } from "@/components/console/toastBus";
import {
  bootstrapPerspectives,
  deleteIndicator,
  deleteObjective,
  deletePerspective,
} from "@/app/actions/strategyPlanning";
import GlossarySheet from "./GlossarySheet";
import { IndicatorDialog, ObjectiveDialog, PerspectiveDialog } from "./GuideDialogs";

export type GuideIndicator = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  formula: string | null;
  frequency: string | null;
  polarity: string;
  cumulative: boolean;
  owner: string | null;
  execOwner: string | null;
  measureOwner: string | null;
  baseline: string | null;
};

export type GuideObjective = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  indicators: GuideIndicator[];
};

export type GuidePerspective = {
  id: string;
  name: string;
  prefix: string;
  objectives: GuideObjective[];
};

type Editing =
  | { kind: "perspective"; perspective?: GuidePerspective }
  | { kind: "objective"; perspectiveId: string; objective?: GuideObjective }
  | { kind: "indicator"; objectiveId: string; indicator?: GuideIndicator }
  | null;

type Removing =
  | { kind: "perspective"; row: GuidePerspective }
  | { kind: "objective"; row: GuideObjective }
  | { kind: "indicator"; row: GuideIndicator }
  | null;

/** أعمدةُ المؤشر — تُستعمل في الترويسة وفي مدى الصفوف الفارغة معاً. */
const INDICATOR_COLUMNS = [
  { label: "رمز المؤشر", width: "w-[90px]" },
  { label: "المؤشر", width: "min-w-[260px]" },
  { label: "شرح المؤشر", width: "min-w-[240px]" },
  { label: "خط الأساس", width: "w-[80px]" },
  { label: "وحدة القياس", width: "w-[110px]" },
  { label: "معادلة القياس", width: "min-w-[220px]" },
  { label: "دورية القياس", width: "w-[110px]" },
  { label: "القطبية", width: "w-[80px]" },
  { label: "التراكمية", width: "w-[100px]" },
  { label: "مسؤول التنفيذ", width: "w-[130px]" },
  { label: "مسؤول القياس", width: "w-[130px]" },
];

const cell = "border-l border-slate-200 p-2 align-top transition-colors dark:border-slate-800";
const headCell = "h-10 border-l border-slate-200 px-3 transition-colors dark:border-slate-800";

/**
 * دليل الأهداف والمؤشرات.
 *
 * بتنسيق متابعة الأداء نفسه: عمودُ البعد شريطٌ ملوّنٌ بنصٍّ رأسي، ومجموعاتُ
 * الأهداف تتناوب تظليلاً فيُعرف أين ينتهي هدفٌ ويبدأ آخر، والخلايا محدودةٌ
 * بحدودٍ رقيقة. وخلايا البعد والهدف مدموجةٌ رأسياً على مؤشراتها كما في الوثيقة
 * المطبوعة، فلا يتكرّر نصُّ الهدف في كل صف.
 *
 * ومعه ملء الشاشة والتكبير من العدّة نفسها — أربعة عشر عموداً لا تُقرأ في عرض
 * الصفحة.
 *
 * والشروح الطويلة بسطرين يفتحها النقر: في الوثيقة فقراتٌ من أربعين كلمة.
 */
export default function GuideClient({
  charityId,
  perspectives,
  canEdit,
}: {
  charityId: string | null;
  perspectives: GuidePerspective[];
  canEdit: boolean;
}) {
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<string>("all");
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<Removing>(null);
  const [reading, setReading] = useState<{ title: string; body: string } | null>(null);
  const [busy, startBusy] = useTransition();
  const view = useTableView();

  const filtered = useMemo(() => filterGuide(perspectives, query, focus), [perspectives, query, focus]);

  const totals = useMemo(() => {
    const objectives = perspectives.reduce((n, p) => n + p.objectives.length, 0);
    const indicators = perspectives.reduce(
      (n, p) => n + p.objectives.reduce((m, o) => m + o.indicators.length, 0),
      0
    );
    return { objectives, indicators };
  }, [perspectives]);

  const run = (fn: () => Promise<{ error?: string }>, done?: () => void) =>
    startBusy(async () => {
      const res = await fn();
      if (res.error) return notify("error", res.error);
      done?.();
    });

  if (!charityId) {
    return (
      <EmptyState
        icon={<BookOpen className="size-6" />}
        title="لا صفَّ لهذه الجمعية بعد"
        description="يُنشأ صفُّ الجمعية عند أول استبيانٍ تُعبّئه، ثم يُبنى دليلها."
      />
    );
  }

  if (perspectives.length === 0) {
    return (
      <EmptyState
        icon={<Layers className="size-6" />}
        title="لم يُبنَ دليل هذه الجمعية بعد"
        description="يبدأ الدليل بأبعاد بطاقة الأداء المتوازن الخمسة، ثم تُضاف تحتها الأهداف ومؤشراتها."
        action={
          canEdit ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                startBusy(async () => {
                  const res = await bootstrapPerspectives(charityId);
                  if (res.error) return notify("error", res.error);
                  notify("ok", `أُنشئت ${res.created} أبعاد`);
                })
              }
              className={btn.primary}
            >
              {busy ? <Spinner size={16} tone="onPrimary" /> : <Plus className="size-4" />}
              إنشاء الأبعاد الخمسة
            </button>
          ) : undefined
        }
      />
    );
  }

  const columnCount = 4 + INDICATOR_COLUMNS.length + (canEdit ? 1 : 0);

  return (
    <div className={cx("space-y-4", view.shellClass)}>
      <div className="flex shrink-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-900">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="ابحث في الأهداف والمؤشرات…"
          label="بحث في الدليل"
          className="min-w-[220px] flex-1"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <FocusChip label="كل الأبعاد" active={focus === "all"} onClick={() => setFocus("all")} />
          {perspectives.map((p) => (
            <FocusChip key={p.id} label={p.name} active={focus === p.id} onClick={() => setFocus(p.id)} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-caption font-semibold text-slate-500 tabular-nums dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            {totals.objectives} هدفاً · {totals.indicators} مؤشراً
          </span>
          <GlossarySheet />
          {canEdit && (
            <button type="button" onClick={() => setEditing({ kind: "perspective" })} className={btn.secondary}>
              <Plus className="size-4" />
              بعد
            </button>
          )}
          <TableViewControls
            zoom={view.zoom}
            setZoom={view.setZoom}
            isFullScreen={view.isFullScreen}
            setFullScreen={view.setFullScreen}
          />
        </div>
      </div>

      <div
        className={cx(
          "w-full rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900",
          view.frameClass
        )}
      >
        <table
          style={{ zoom: `${view.zoom}%` }}
          className="w-full border-collapse text-center text-caption"
        >
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-500 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <th className={cx(headCell, "w-12")}>البعد</th>
              <th className={cx(headCell, "w-[80px]")}>رمز الهدف</th>
              <th className={cx(headCell, "min-w-[220px]")}>الهدف</th>
              <th className={cx(headCell, "min-w-[240px]")}>شرح الهدف</th>
              {INDICATOR_COLUMNS.map((c) => (
                <th key={c.label} className={cx(headCell, c.width)}>
                  {c.label}
                </th>
              ))}
              {canEdit && <th className="h-10 px-3">إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="p-10 text-body text-slate-400 dark:text-slate-500">
                  لا نتائج لهذا البحث.
                </td>
              </tr>
            ) : (
              filtered.map((perspective) => {
                const rows = buildRows(perspective);
                let groupIndex = -1;
                let lastObjectiveId: string | null = null;

                return rows.map((row, index) => {
                  if (row.objectiveId !== lastObjectiveId) {
                    groupIndex++;
                    lastObjectiveId = row.objectiveId ?? null;
                  }
                  // تظليلٌ متناوب بالهدف لا بالصف: فيُعرف أين ينتهي هدفٌ ويبدأ آخر.
                  const striped = groupIndex % 2 === 1;

                  return (
                    <tr
                      key={row.key}
                      className={cx(
                        "border-b border-slate-200 transition-colors dark:border-slate-800",
                        row.objectiveStart && index > 0 && "border-t-2 border-t-slate-200 dark:border-t-slate-600",
                        striped
                          ? "bg-slate-100/70 hover:bg-slate-200/50 dark:bg-slate-800/80 dark:hover:bg-slate-700/50"
                          : "bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800/50"
                      )}
                    >
                      {index === 0 && (
                        <td
                          className="border-l border-slate-200 bg-primary p-2 align-middle font-semibold text-white dark:border-slate-800"
                          rowSpan={rows.length}
                        >
                          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 py-4">
                            <span
                              className="text-center font-semibold leading-loose tracking-wider"
                              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                            >
                              {perspective.name}
                            </span>
                            <span className="mt-1 rounded-md bg-white/20 px-2 py-0.5 text-caption font-semibold text-white/90 shadow-sm">
                              الرمز: {perspective.prefix}
                            </span>
                            {canEdit && (
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditing({ kind: "objective", perspectiveId: perspective.id })}
                                  title="إضافة هدف"
                                  aria-label={`إضافة هدف إلى ${perspective.name}`}
                                  className={whiteIconButton}
                                >
                                  <Plus className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditing({ kind: "perspective", perspective })}
                                  title="تعديل البعد"
                                  aria-label={`تعديل ${perspective.name}`}
                                  className={whiteIconButton}
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRemoving({ kind: "perspective", row: perspective })}
                                  title="حذف البعد"
                                  aria-label={`حذف ${perspective.name}`}
                                  className={whiteIconButton}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {row.objectiveStart && row.objective && (
                        <>
                          <td className={cx(cell, "align-middle font-semibold text-slate-500 dark:text-slate-400")} rowSpan={row.objectiveSpan}>
                            <span className="inline-block rounded border border-slate-200 bg-white px-2 py-1 shadow-sm dark:border-slate-600 dark:bg-slate-900">
                              {row.objective.code}
                            </span>
                          </td>
                          <td className={cx(cell, "text-right")} rowSpan={row.objectiveSpan}>
                            <span className="font-medium text-slate-800 dark:text-slate-100">{row.objective.name}</span>
                            {canEdit && (
                              <div className="mt-2 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditing({ kind: "indicator", objectiveId: row.objective!.id })}
                                  title="إضافة مؤشر"
                                  aria-label={`إضافة مؤشر إلى ${row.objective.code}`}
                                  className={btn.icon}
                                >
                                  <Plus className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditing({ kind: "objective", perspectiveId: perspective.id, objective: row.objective! })
                                  }
                                  aria-label={`تعديل ${row.objective.code}`}
                                  className={btn.icon}
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRemoving({ kind: "objective", row: row.objective! })}
                                  aria-label={`حذف ${row.objective.code}`}
                                  className={btn.iconDanger}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className={cx(cell, "text-right")} rowSpan={row.objectiveSpan}>
                            <Clamped
                              text={row.objective.description}
                              onOpen={() =>
                                setReading({ title: `شرح الهدف ${row.objective!.code}`, body: row.objective!.description! })
                              }
                            />
                          </td>
                        </>
                      )}

                      {row.indicator ? (
                        <>
                          <td className={cx(cell, "align-middle font-semibold text-slate-500 tabular-nums dark:text-slate-400")}>
                            {row.indicator.code}
                          </td>
                          <td className={cx(cell, "text-right font-medium text-slate-800 dark:text-slate-100")}>
                            {row.indicator.name}
                          </td>
                          <td className={cx(cell, "text-right")}>
                            <Clamped
                              text={row.indicator.description}
                              onOpen={() =>
                                setReading({ title: `شرح المؤشر ${row.indicator!.code}`, body: row.indicator!.description! })
                              }
                            />
                          </td>
                          <td className={cx(cell, "align-middle tabular-nums")}>{row.indicator.baseline ?? dash}</td>
                          <td className={cx(cell, "align-middle")}>{row.indicator.unit || dash}</td>
                          <td className={cx(cell, "text-right")}>
                            <Clamped
                              text={row.indicator.formula}
                              onOpen={() => setReading({ title: `معادلة ${row.indicator!.code}`, body: row.indicator!.formula! })}
                            />
                          </td>
                          <td className={cx(cell, "align-middle")}>{row.indicator.frequency || dash}</td>
                          <td className={cx(cell, "align-middle")}>
                            {row.indicator.polarity === "DOWN" ? "نقص" : "زيادة"}
                          </td>
                          <td className={cx(cell, "align-middle")}>
                            {row.indicator.cumulative ? (
                              <Badge tone="brand">تراكمي</Badge>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400">غير تراكمي</span>
                            )}
                          </td>
                          <td className={cx(cell, "align-middle")}>{row.indicator.execOwner || dash}</td>
                          <td className={cx(cell, "align-middle")}>{row.indicator.measureOwner || dash}</td>
                          {canEdit && (
                            <td className="p-2 align-middle">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditing({ kind: "indicator", objectiveId: row.objectiveId!, indicator: row.indicator! })
                                  }
                                  aria-label={`تعديل ${row.indicator.code}`}
                                  className={btn.icon}
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRemoving({ kind: "indicator", row: row.indicator! })}
                                  aria-label={`حذف ${row.indicator.code}`}
                                  className={btn.iconDanger}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </>
                      ) : (
                        <td
                          className="p-4 text-body text-slate-400 dark:text-slate-500"
                          colSpan={INDICATOR_COLUMNS.length + (canEdit ? 1 : 0) + (row.objective ? 0 : 3)}
                        >
                          {row.objective ? "لا مؤشرات لهذا الهدف بعد." : "لا أهداف في هذا البعد بعد."}
                        </td>
                      )}
                    </tr>
                  );
                });
              })
            )}
          </tbody>
        </table>
      </div>

      {editing?.kind === "perspective" && (
        <PerspectiveDialog charityId={charityId} perspective={editing.perspective} onClose={() => setEditing(null)} />
      )}
      {editing?.kind === "objective" && (
        <ObjectiveDialog
          perspectiveId={editing.perspectiveId}
          objective={editing.objective}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "indicator" && (
        <IndicatorDialog objectiveId={editing.objectiveId} indicator={editing.indicator} onClose={() => setEditing(null)} />
      )}

      {reading && <ReadDialog title={reading.title} body={reading.body} onClose={() => setReading(null)} />}

      {removing && (
        <ConfirmDialog
          variant="console"
          title={removeTitle(removing)}
          message={removeMessage(removing)}
          confirmLabel="حذف"
          isPending={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() =>
            run(
              () =>
                removing.kind === "perspective"
                  ? deletePerspective(removing.row.id)
                  : removing.kind === "objective"
                    ? deleteObjective(removing.row.id)
                    : deleteIndicator(removing.row.id),
              () => setRemoving(null)
            )
          }
        />
      )}
    </div>
  );
}

const dash = <span className="text-slate-300 dark:text-slate-600">—</span>;

const whiteIconButton =
  "grid size-8 place-items-center rounded-lg bg-white/20 text-white transition-colors outline-none hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white/60";

function FocusChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "h-8 rounded-lg border px-2.5 text-caption font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "border-primary/30 bg-primary/[0.08] text-primary dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300"
          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      )}
    >
      {label}
    </button>
  );
}

/** نصٌّ طويل بسطرين، يفتحه النقر كاملاً. */
function Clamped({ text, onOpen }: { text: string | null; onOpen: () => void }) {
  if (!text) return dash;
  return (
    <button
      type="button"
      onClick={onOpen}
      title="عرض النصّ كاملاً"
      className="line-clamp-2 whitespace-normal text-right text-body leading-5 text-slate-600 transition-colors outline-none hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:text-slate-100"
    >
      {text}
    </button>
  );
}

function ReadDialog({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  return (
    <Dialog title={title} size="md" onClose={onClose}>
      <p className="whitespace-pre-line text-body leading-7 text-slate-700 dark:text-slate-200">{body}</p>
    </Dialog>
  );
}

function removeTitle(removing: NonNullable<Removing>) {
  if (removing.kind === "perspective") return `حذف بعد «${removing.row.name}»؟`;
  if (removing.kind === "objective") return `حذف الهدف ${removing.row.code}؟`;
  return `حذف المؤشر ${removing.row.code}؟`;
}

function removeMessage(removing: NonNullable<Removing>) {
  if (removing.kind === "perspective") {
    const objectives = removing.row.objectives.length;
    const indicators = removing.row.objectives.reduce((n, o) => n + o.indicators.length, 0);
    return objectives === 0
      ? "البعد فارغ، فلا يُحذف معه شيء."
      : `سيُحذف معه ${objectives} هدفاً و${indicators} مؤشراً، ونتائجها المسجّلة.`;
  }
  if (removing.kind === "objective") {
    const n = removing.row.indicators.length;
    return n === 0 ? "الهدف بلا مؤشرات." : `سيُحذف معه ${n} مؤشراً ونتائجها المسجّلة.`;
  }
  return "ستُحذف معه نتائجه المسجّلة في كل السنوات.";
}

type Row = {
  key: string;
  objective?: GuideObjective;
  objectiveId?: string;
  objectiveStart: boolean;
  objectiveSpan: number;
  indicator?: GuideIndicator;
};

/**
 * صفوف بعدٍ واحد: صفٌّ لكل مؤشر، وأبوه يمتدّ عليها بـ`rowSpan`. وهدفٌ بلا
 * مؤشرات يأخذ صفاً واحداً، وبعدٌ بلا أهداف كذلك — فلا يختفي ما هو فارغ.
 */
function buildRows(perspective: GuidePerspective): Row[] {
  if (perspective.objectives.length === 0) {
    return [{ key: `${perspective.id}-empty`, objectiveStart: false, objectiveSpan: 1 }];
  }

  const rows: Row[] = [];
  for (const objective of perspective.objectives) {
    const span = Math.max(objective.indicators.length, 1);
    if (objective.indicators.length === 0) {
      rows.push({
        key: `${objective.id}-empty`,
        objective,
        objectiveId: objective.id,
        objectiveStart: true,
        objectiveSpan: 1,
      });
      continue;
    }
    objective.indicators.forEach((indicator, i) => {
      rows.push({
        key: indicator.id,
        objective,
        objectiveId: objective.id,
        objectiveStart: i === 0,
        objectiveSpan: span,
        indicator,
      });
    });
  }
  return rows;
}

/** البحث يمسّ الرمز والنصّ والشرح، ويُبقي الأب إن طابق ابنه. */
function filterGuide(perspectives: GuidePerspective[], query: string, focus: string): GuidePerspective[] {
  const q = query.trim();
  const scoped = focus === "all" ? perspectives : perspectives.filter((p) => p.id === focus);
  if (!q) return scoped;

  const needle = q.toLowerCase();
  const match = (...values: Array<string | null>) =>
    values.some((v) => v && v.toLowerCase().includes(needle));

  return scoped
    .map((p) => {
      if (match(p.name, p.prefix)) return p;
      const objectives = p.objectives
        .map((o) => {
          if (match(o.code, o.name, o.description)) return o;
          const indicators = o.indicators.filter((i) =>
            match(i.code, i.name, i.description, i.unit, i.formula, i.execOwner, i.measureOwner)
          );
          return indicators.length > 0 ? { ...o, indicators } : null;
        })
        .filter((o): o is GuideObjective => o !== null);
      return objectives.length > 0 ? { ...p, objectives } : null;
    })
    .filter((p): p is GuidePerspective => p !== null);
}
