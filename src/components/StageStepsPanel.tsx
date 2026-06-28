"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Trash2, ChevronDown, ChevronUp, X, GripVertical } from "lucide-react";

export type StageStep = {
  id: string;
  name: string;
  isDone: boolean;
  order: number;
};

interface StageStepsPanelProps {
  steps: StageStep[];
  canEdit: boolean;
  onAdd: (name: string) => Promise<any>;
  onToggle: (id: string, isDone: boolean) => Promise<any>;
  onRename: (id: string, name: string) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

export default function StageStepsPanel({ steps, canEdit, onAdd, onToggle, onRename, onDelete }: StageStepsPanelProps) {
  const [open, setOpen] = useState(false);
  const [localSteps, setLocalSteps] = useState<StageStep[]>(() => [...steps].sort((a, b) => a.order - b.order));
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isPending, startTransition] = useTransition();

  const sorted = [...localSteps].sort((a, b) => a.order - b.order);
  const doneCount = sorted.filter(s => s.isDone).length;
  const total = sorted.length;

  function handleToggle(step: StageStep) {
    const updated = localSteps.map(s => s.id === step.id ? { ...s, isDone: !s.isDone } : s);
    setLocalSteps(updated);
    startTransition(() => onToggle(step.id, !step.isDone));
  }

  function handleAdd() {
    if (!newName.trim()) return;
    const optimistic: StageStep = { id: Math.random().toString(), name: newName, isDone: false, order: localSteps.length };
    setLocalSteps(prev => [...prev, optimistic]);
    setNewName(""); setAdding(false);
    startTransition(() => onAdd(optimistic.name));
  }

  function handleRename(id: string) {
    if (!editName.trim()) { setEditingId(null); return; }
    setLocalSteps(prev => prev.map(s => s.id === id ? { ...s, name: editName } : s));
    setEditingId(null);
    startTransition(() => onRename(id, editName));
  }

  function handleDelete(id: string) {
    setLocalSteps(prev => prev.filter(s => s.id !== id));
    startTransition(() => onDelete(id));
  }

  if (total === 0 && !canEdit) return null;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        <span>الخطوات</span>
        {total > 0 && (
          <>
            <span className="text-slate-400">({doneCount}/{total})</span>
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mx-1">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: total > 0 ? `${Math.round((doneCount / total) * 100)}%` : "0%" }}
              />
            </div>
          </>
        )}
      </button>

      {open && (
        <div className="mt-1.5 space-y-1">
          {sorted.map(step => (
            <div key={step.id} className="flex items-center gap-1.5 group">
              <button
                onClick={() => canEdit && handleToggle(step)}
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  step.isDone
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-300 dark:border-slate-600 hover:border-emerald-400"
                } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
              >
                {step.isDone && <Check className="w-2.5 h-2.5" />}
              </button>

              {editingId === step.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => handleRename(step.id)}
                  onKeyDown={e => { if (e.key === "Enter") handleRename(step.id); if (e.key === "Escape") setEditingId(null); }}
                  className="flex-1 text-[10px] bg-white dark:bg-slate-800 border border-primary/50 rounded px-1 py-0.5 outline-none"
                />
              ) : (
                <span
                  onClick={() => { if (canEdit) { setEditingId(step.id); setEditName(step.name); } }}
                  className={`flex-1 text-[10px] leading-relaxed ${
                    step.isDone ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"
                  } ${canEdit ? "cursor-text hover:text-primary transition-colors" : ""}`}
                >
                  {step.name}
                </span>
              )}

              {canEdit && (
                <button
                  onClick={() => handleDelete(step.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {canEdit && (
            adding ? (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-4 h-4 rounded border border-dashed border-slate-300 dark:border-slate-600 shrink-0" />
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
                  placeholder="اسم الخطوة..."
                  className="flex-1 text-[10px] bg-white dark:bg-slate-800 border border-primary/50 rounded px-1 py-0.5 outline-none"
                />
                <button onClick={handleAdd} className="text-emerald-600 hover:text-emerald-700"><Check className="w-3 h-3" /></button>
                <button onClick={() => { setAdding(false); setNewName(""); }} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-primary transition-colors mt-1"
              >
                <Plus className="w-3 h-3" /> إضافة خطوة
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
