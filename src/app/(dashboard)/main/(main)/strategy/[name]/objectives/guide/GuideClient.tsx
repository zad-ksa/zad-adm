"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpen, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import {
  EmptyState,
  SearchField,
  TableShell,
  Th,
  tbodyClass,
  tdClass,
  theadRowClass,
} from "@/components/console/layout";
import { Badge, Spinner, btn, cx } from "@/components/console/ui";
import { Dialog } from "@/components/console/Dialog";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
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

/** الأعمدة الأربعة عشر بترتيب الوثيقة المعتمدة. */
const COLUMNS = [
  "البعد",
  "رمز الهدف",
  "الهدف",
  "شرح الهدف",
  "رمز المؤشر",
  "المؤشر",
  "شرح المؤشر",
  "وحدة القياس",
  "معادلة القياس",
  "دورية القياس",
  "القطبية",
  "التراكمية",
  "مسؤول التنفيذ",
  "مسؤول القياس",
];

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

/**
 * دليل الأهداف والمؤشرات.
 *
 * جدولٌ واحدٌ بأربعة عشر عموداً، وخلايا البعد والهدف مدموجةٌ رأسياً على مؤشراتها
 * (`rowSpan`) كما في الوثيقة المطبوعة — فالقراءة تنزل من البعد إلى مؤشراته بلا
 * تكرارِ نصٍّ في كل صف.
 *
 * والشروح الطويلة مقصوصةٌ بسطرين يفتحها النقر: الوثيقة فيها فقراتٌ من أربعين
 * كلمة، ولو عُرضت كاملةً صار الصف الواحد شاشةً.
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="ابحث في الأهداف والمؤشرات…"
          label="بحث في الدليل"
          className="min-w-[240px] flex-1"
        />
        <GlossarySheet />
        {canEdit && (
          <button type="button" onClick={() => setEditing({ kind: "perspective" })} className={btn.secondary}>
            <Plus className="size-4" />
            بعد جديد
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FocusChip label="كل الأبعاد" active={focus === "all"} onClick={() => setFocus("all")} />
        {perspectives.map((p) => (
          <FocusChip key={p.id} label={p.name} active={focus === p.id} onClick={() => setFocus(p.id)} />
        ))}
        <span className="mr-auto text-meta text-slate-500 dark:text-slate-400">
          {totals.objectives} هدفاً · {totals.indicators} مؤشراً
        </span>
      </div>

      <TableShell
        empty={
          filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-body text-slate-500 dark:text-slate-400">
              لا نتائج لهذا البحث.
            </div>
          ) : undefined
        }
      >
        <thead>
          <tr className={theadRowClass}>
            {COLUMNS.map((c) => (
              <Th key={c}>{c}</Th>
            ))}
            {canEdit && <Th className="w-px">إجراءات</Th>}
          </tr>
        </thead>
        <tbody className={tbodyClass}>
          {filtered.map((perspective) => {
            const rows = buildRows(perspective);
            return rows.map((row, index) => (
              <tr key={row.key} className="align-top">
                {index === 0 && (
                  <td className={cx(tdClass, "border-l border-slate-100 dark:border-slate-800")} rowSpan={rows.length}>
                    <div className="flex items-start gap-2">
                      <Badge tone="brand">{perspective.prefix}</Badge>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{perspective.name}</span>
                    </div>
                    {canEdit && (
                      <div className="mt-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing({ kind: "perspective", perspective })}
                          aria-label={`تعديل ${perspective.name}`}
                          className={btn.icon}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoving({ kind: "perspective", row: perspective })}
                          aria-label={`حذف ${perspective.name}`}
                          className={btn.iconDanger}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing({ kind: "objective", perspectiveId: perspective.id })}
                          className={cx(btn.ghost, "h-7 px-2 text-caption")}
                        >
                          <Plus className="size-3.5" />
                          هدف
                        </button>
                      </div>
                    )}
                  </td>
                )}

                {row.objectiveStart && row.objective && (
                  <>
                    <td className={cx(tdClass, "whitespace-nowrap tabular-nums")} rowSpan={row.objectiveSpan}>
                      {row.objective.code}
                    </td>
                    <td className={cx(tdClass, "min-w-[200px]")} rowSpan={row.objectiveSpan}>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{row.objective.name}</span>
                      {canEdit && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditing({
                                kind: "objective",
                                perspectiveId: perspective.id,
                                objective: row.objective!,
                              })
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
                          <button
                            type="button"
                            onClick={() => setEditing({ kind: "indicator", objectiveId: row.objective!.id })}
                            className={cx(btn.ghost, "h-7 px-2 text-caption")}
                          >
                            <Plus className="size-3.5" />
                            مؤشر
                          </button>
                        </div>
                      )}
                    </td>
                    <td className={cx(tdClass, "min-w-[220px]")} rowSpan={row.objectiveSpan}>
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
                    <td className={cx(tdClass, "whitespace-nowrap tabular-nums")}>{row.indicator.code}</td>
                    <td className={cx(tdClass, "min-w-[240px]")}>
                      <span className="text-slate-800 dark:text-slate-100">{row.indicator.name}</span>
                    </td>
                    <td className={cx(tdClass, "min-w-[220px]")}>
                      <Clamped
                        text={row.indicator.description}
                        onOpen={() =>
                          setReading({
                            title: `شرح المؤشر ${row.indicator!.code}`,
                            body: row.indicator!.description!,
                          })
                        }
                      />
                    </td>
                    <td className={cx(tdClass, "whitespace-nowrap")}>{row.indicator.unit || dash}</td>
                    <td className={cx(tdClass, "min-w-[200px]")}>
                      <Clamped
                        text={row.indicator.formula}
                        onOpen={() =>
                          setReading({ title: `معادلة ${row.indicator!.code}`, body: row.indicator!.formula! })
                        }
                      />
                    </td>
                    <td className={cx(tdClass, "whitespace-nowrap")}>{row.indicator.frequency || dash}</td>
                    <td className={cx(tdClass, "whitespace-nowrap")}>
                      {row.indicator.polarity === "DOWN" ? "نقص" : "زيادة"}
                    </td>
                    <td className={cx(tdClass, "whitespace-nowrap")}>
                      {row.indicator.cumulative ? (
                        <Badge tone="brand">تراكمي</Badge>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">غير تراكمي</span>
                      )}
                    </td>
                    <td className={cx(tdClass, "whitespace-nowrap")}>{row.indicator.execOwner || dash}</td>
                    <td className={cx(tdClass, "whitespace-nowrap")}>{row.indicator.measureOwner || dash}</td>
                    {canEdit && (
                      <td className={cx(tdClass, "whitespace-nowrap")}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditing({
                                kind: "indicator",
                                objectiveId: row.objectiveId!,
                                indicator: row.indicator!,
                              })
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
                    className={cx(tdClass, "text-body text-slate-400 dark:text-slate-500")}
                    colSpan={canEdit ? 11 : 10}
                  >
                    {row.objective ? "لا مؤشرات لهذا الهدف بعد." : "لا أهداف في هذا البعد بعد."}
                  </td>
                )}
              </tr>
            ));
          })}
        </tbody>
      </TableShell>

      {editing?.kind === "perspective" && (
        <PerspectiveDialog
          charityId={charityId}
          perspective={editing.perspective}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "objective" && (
        <ObjectiveDialog
          perspectiveId={editing.perspectiveId}
          objective={editing.objective}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "indicator" && (
        <IndicatorDialog
          objectiveId={editing.objectiveId}
          indicator={editing.indicator}
          onClose={() => setEditing(null)}
        />
      )}

      {reading && (
        <ReadDialog title={reading.title} body={reading.body} onClose={() => setReading(null)} />
      )}

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

function FocusChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "h-7 rounded-lg border px-2.5 text-meta font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
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
      className="line-clamp-2 text-right text-body leading-5 text-slate-600 transition-colors outline-none hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:text-slate-100"
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
      rows.push({ key: `${objective.id}-empty`, objective, objectiveId: objective.id, objectiveStart: true, objectiveSpan: 1 });
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

  const match = (...values: Array<string | null>) =>
    values.some((v) => v && v.toLowerCase().includes(q.toLowerCase()));

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
