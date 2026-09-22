"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import Select from "@/components/console/Select";
import { Sparkles, FolderPlus, Folder, Calendar, UploadCloud, FileImage, Camera, Plus, Trash2, Loader2, ClipboardPaste } from "lucide-react";
import { Charity } from "@/types";
import { addCategory, deleteCategory } from "@/app/actions/categories";
import { useImagePaste } from "@/hooks/useImagePaste";
import { Dialog } from "@/components/console/Dialog";
import { btn } from "@/components/console/ui";

interface AchievementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; charityId: string; category: string; date: string; proofFile: File | null }) => void;
  isDirectorOrAdmin: boolean;
  charities: Charity[];
  isUploading: boolean;
  categories: string[];
  onCategoriesChange: (cats: string[]) => void;
}

export default function AchievementFormModal({
  isOpen,
  onClose,
  onSubmit,
  isDirectorOrAdmin,
  charities,
  isUploading,
  categories,
  onCategoriesChange,
}: AchievementFormModalProps) {
  const defaultCategory = categories[0] || "الاستراتيجية";
  const [title, setTitle] = useState("");
  const [charityId, setCharityId] = useState("internal");
  const [category, setCategory] = useState(defaultCategory);
  const [date, setDate] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePastedImage = useCallback((file: File) => {
    setProofFile(file);
  }, []);
  useImagePaste(handlePastedImage, isOpen);

  // النافذة تبقى مثبَّتة دائماً في الشجرة (isOpen يتحكم بالعرض فقط لا بالتركيب)،
  // فحقولها لا تُصفَّر تلقائياً بين فتحة وأخرى كما يحدث مع مكوّن يُفكَّك ويُعاد
  // تركيبه. من هنا كان مَن ينشر إنجازاً ثم يفتح النافذة لإنجاز آخر يجد نفس ما
  // كتبه سابقاً — تُصفَّر الحقول صراحةً كل مرة تُفتح فيها.
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setCharityId("internal");
      setCategory(categories[0] || "الاستراتيجية");
      setDate("");
      setProofFile(null);
      setShowAddCat(false);
      setNewCatName("");
      setCatError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    // كان المتصفّح يمنع الإرسال بلا قسمٍ عبر required على القائمة الأصلية.
    if (!category) return;
    onSubmit({ title, charityId, category, date, proofFile });
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    setCatError(null);
    startTransition(async () => {
      const res = await addCategory(newCatName.trim());
      if (res.error) {
        setCatError(res.error);
      } else if (res.categories) {
        onCategoriesChange(res.categories);
        setCategory(newCatName.trim());
        setNewCatName("");
        setShowAddCat(false);
      }
    });
  };

  const handleDeleteCategory = (name: string) => {
    startTransition(async () => {
      const res = await deleteCategory(name);
      if (res.categories) {
        onCategoriesChange(res.categories);
        if (category === name) setCategory(res.categories[0] || "");
      }
    });
  };

  return (
    <Dialog
title="تسجيل إنجاز مباشر"
description="سجل منجزاً عملياً مباشراً ليظهر فوراً في ملفك المهني."
onClose={onClose}
>
<form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">وصف الإنجاز</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تقديم ورشة الحوكمة أو صياغة عقد..."
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 text-slate-800 dark:text-slate-100 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
              <FolderPlus className="w-3.5 h-3.5 text-slate-400" />
              الجهة التابعة لها الإنجاز
            </label>
            <Select
              variant="soft"
              value={charityId}
              onSelect={setCharityId}
              placeholder="الجهة"
              options={[
                { value: "internal", label: "إنجاز داخلي لشركة زاد" },
                ...charities.map((ch) => ({ value: ch.id, label: ch.name })),
              ]}
              className="w-full [&>button]:w-full [&>button]:justify-between"
            />
          </div>

          {isDirectorOrAdmin && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-slate-400" />
                القسم المعني
              </label>

              {/* Select + Add button row */}
              <div className="flex gap-2">
                <Select
                  variant="soft"
                  value={category}
                  onSelect={setCategory}
                  placeholder="اختر القسم"
                  options={categories.map((cat: string) => ({ value: cat, label: cat }))}
                  className="flex-1 [&>button]:w-full [&>button]:justify-between"
                />
                <button
                  type="button"
                  onClick={() => { setShowAddCat(v => !v); setCatError(null); setNewCatName(""); }}
                  className="shrink-0 w-10 h-10 mt-0.5 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 transition-colors"
                  title="إضافة قسم جديد"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add new category inline */}
              {showAddCat && (
                <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">إضافة قسم جديد</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                      placeholder="اسم القسم..."
                      className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={isPending || !newCatName.trim()}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
                    </button>
                  </div>
                  {catError && <p className="text-xs text-red-500 font-medium">{catError}</p>}

                  {/* List existing categories with delete */}
                  <div className="pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5">الأقسام الحالية (اضغط للحذف)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={isPending}
                          className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:border-red-300 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          title={`حذف "${cat}"`}
                        >
                          {cat}
                          <Trash2 className="w-3 h-3 opacity-50" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              تاريخ الإنجاز (اختياري)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 text-slate-800 dark:text-slate-100 transition-all font-medium cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 mt-1.5 font-bold">في حال تركه فارغاً، سيتم اعتماد تاريخ اليوم كافتراضي.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
              <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
              شاهد الإنجاز (صورة)
              <span className="font-medium text-slate-400">— اختياري</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-900/50 relative hover:border-emerald-500/50 transition-colors">
              {proofFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileImage className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">
                    {proofFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setProofFile(null)}
                    className="text-xs text-red-500 hover:text-red-600 font-bold cursor-pointer mr-2"
                  >
                    تغيير
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <FileImage className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">أرفق شاهدًا إن أردت</span>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-[11px] font-bold rounded-lg cursor-pointer hover:bg-emerald-700 transition-all shadow-sm">
                      <Camera className="w-3.5 h-3.5" />
                      كاميرا الجوال
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700">
                      <UploadCloud className="w-3.5 h-3.5" />
                      المعرض
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    <ClipboardPaste className="w-3 h-3" />
                    أو الصق صورة منسوخة (Ctrl+V)
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className={btn.secondary}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isUploading || !title.trim()}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm"
            >
              {isUploading ? "جاري الرفع والحفظ..." : (
                <>
                  <Sparkles className="w-4 h-4" />
                  حفظ الإنجاز
                </>
              )}
            </button>
          </div>
        </form>
</Dialog>
  );
}
