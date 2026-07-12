"use client";

import React, { useState, useTransition } from "react";
import { X, Plus, Trash2, Calendar, DollarSign, CheckCircle2, Loader2, Layers, Edit2, Save } from "lucide-react";
import { addInstallment, updateInstallment, deleteInstallment, toggleInstallmentPaid, batchAddInstallments } from "@/app/actions/contracts";

type Installment = {
  id: string;
  amount: number;
  dueDate: Date | null;
  isLinkedToFirstGrant: boolean;
  isPaid: boolean;
};

type Props = {
  charityId: string;
  charityName: string;
  totalValue: number;
  installments: Installment[];
  onClose: () => void;
};

export default function ManageInstallmentsModal({ charityId, charityName, totalValue, installments, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  
  // Single Add State
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState("");
  const [isLinkedToFirstGrant, setIsLinkedToFirstGrant] = useState(false);
  
  // Batch Add State
  const [batchTotalAmount, setBatchTotalAmount] = useState(totalValue > 0 ? totalValue.toString() : "");
  const [batchCount, setBatchCount] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editIsLinked, setEditIsLinked] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newAmount || (!newDate && !isLinkedToFirstGrant)) {
      setError("الرجاء إدخال المبلغ وتاريخ الاستحقاق (أو اختيار الارتباط بأول منحة)");
      return;
    }
    
    setError(null);
    startTransition(async () => {
      const res = await addInstallment({
        charityId,
        amount: parseFloat(newAmount),
        dueDate: isLinkedToFirstGrant ? undefined : new Date(newDate),
        isLinkedToFirstGrant,
      });
      if (res.error) setError(res.error);
      else {
        setNewAmount("");
        setNewDate("");
        setIsLinkedToFirstGrant(false);
      }
    });
  };

  const handleBatchAdd = () => {
    if (!batchTotalAmount || !batchCount || parseInt(batchCount) <= 0) {
      setError("الرجاء إدخال إجمالي المبلغ وعدد صحيح للأقساط");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await batchAddInstallments({
        charityId,
        totalAmount: parseFloat(batchTotalAmount),
        count: parseInt(batchCount)
      });
      if (res.error) setError(res.error);
      else {
        setBatchTotalAmount("");
        setBatchCount("");
        setActiveTab("single"); // switch back to see list
      }
    });
  };

  const confirmDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = () => {
    if (!deleteConfirmId) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteInstallment(deleteConfirmId);
      if (res.error) setError(res.error);
      setDeleteConfirmId(null);
    });
  };

  const handleTogglePaid = (id: string, currentStatus: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await toggleInstallmentPaid(id, !currentStatus);
      if (res.error) setError(res.error);
    });
  };

  const startEdit = (inst: Installment) => {
    setEditingId(inst.id);
    setEditAmount(inst.amount.toString());
    setEditIsLinked(inst.isLinkedToFirstGrant);
    if (inst.dueDate) {
      setEditDate(new Date(inst.dueDate).toISOString().split('T')[0]);
    } else {
      setEditDate("");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editAmount || (!editDate && !editIsLinked)) {
      setError("تأكد من تعبئة الحقول للتعديل");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateInstallment({
        id: editingId!,
        amount: parseFloat(editAmount),
        dueDate: editIsLinked ? undefined : new Date(editDate),
        isLinkedToFirstGrant: editIsLinked,
      });
      if (res.error) setError(res.error);
      else setEditingId(null);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 text-center mb-2">تأكيد الحذف</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
              هل أنت متأكد من حذف هذا القسط بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                disabled={isPending}
                className="flex-1 py-2 rounded-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={executeDelete}
                disabled={isPending}
                className="flex-1 py-2 rounded-lg font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                نعم، احذف القسط
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl relative z-10 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">إدارة الأقساط</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{charityName}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'single' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Plus className="w-4 h-4" />
              إضافة قسط فردي
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'batch' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Layers className="w-4 h-4" />
              تقسيم تلقائي للأقساط
            </button>
          </div>

          {/* Add Forms */}
          {activeTab === 'single' ? (
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المبلغ (ر.س)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary pr-9"
                      placeholder="مثال: 50000"
                    />
                    <DollarSign className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>تاريخ الاستحقاق</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isLinkedToFirstGrant}
                        onChange={(e) => setIsLinkedToFirstGrant(e.target.checked)}
                        className="w-3 h-3 text-primary border-slate-300 rounded focus:ring-primary"
                      />
                      <span className="text-[10px] text-primary font-bold">ربط بأول منحة</span>
                    </label>
                  </label>
                  <div className="relative">
                    <input 
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      disabled={isLinkedToFirstGrant}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary pr-9 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3" />
                  </div>
                </div>
              </div>
              <button 
                onClick={handleAdd}
                disabled={isPending}
                className="w-full bg-primary text-white text-sm font-bold py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                إضافة القسط
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">إجمالي المبلغ المراد تقسيمه (ر.س)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={batchTotalAmount}
                      onChange={(e) => setBatchTotalAmount(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary pr-9"
                      placeholder="مثال: 100000"
                    />
                    <DollarSign className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">عدد الأقساط</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={batchCount}
                      onChange={(e) => setBatchCount(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary pr-9"
                      placeholder="مثال: 4"
                    />
                    <Layers className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3" />
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-3 text-xs text-amber-600 dark:text-amber-500 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                سيتم تقسيم المبلغ بالتساوي وإنشاء الأقساط كـ "بانتظار المنحة الأولى". يمكنك تعديل تواريخها لاحقاً.
              </div>
              <button 
                onClick={handleBatchAdd}
                disabled={isPending}
                className="w-full bg-primary text-white text-sm font-bold py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                توليد الأقساط الآن
              </button>
            </div>
          )}

          {/* List Current Installments */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">الأقساط المجدولة ({installments.length})</h3>
            <div className="space-y-3">
              {installments.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500">لا توجد أقساط مسجلة بعد.</div>
              ) : (
                installments.map((inst, idx) => (
                  <div key={inst.id} className={`p-4 rounded-xl border ${inst.isPaid ? 'bg-emerald-50/30 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                    
                    {editingId === inst.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">تعديل المبلغ</label>
                            <input 
                              type="number" 
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs text-slate-500">تعديل التاريخ</label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={editIsLinked}
                                  onChange={(e) => setEditIsLinked(e.target.checked)}
                                  className="w-3 h-3 text-primary border-slate-300 rounded focus:ring-primary"
                                />
                                <span className="text-[10px] text-primary font-bold">ربط بالمنحة</span>
                              </label>
                            </div>
                            <input 
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              disabled={editIsLinked}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary disabled:opacity-50"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={cancelEdit} disabled={isPending} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-md">إلغاء</button>
                          <button onClick={saveEdit} disabled={isPending} className="px-3 py-1.5 text-xs bg-primary text-white rounded-md flex items-center gap-1 hover:bg-primary/90">
                            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            حفظ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{inst.amount.toLocaleString()} ر.س</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {inst.isLinkedToFirstGrant && !inst.dueDate 
                                ? <span className="text-amber-500 font-bold">بانتظار المنحة الأولى</span>
                                : inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-CA') : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!inst.isPaid && (
                            <button
                              onClick={() => startEdit(inst)}
                              disabled={isPending}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                              title="تعديل القسط"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleTogglePaid(inst.id, inst.isPaid)}
                            disabled={isPending}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${inst.isPaid ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}
                          >
                            {inst.isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 border-2 border-current rounded-full" />}
                            {inst.isPaid ? 'تم السداد' : 'تسجيل سداد'}
                          </button>
                          <button
                            onClick={() => confirmDelete(inst.id)}
                            disabled={isPending}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="حذف القسط"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
