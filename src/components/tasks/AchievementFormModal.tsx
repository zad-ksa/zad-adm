"use client";

import { useState } from "react";
import { X, Sparkles, FolderPlus, Folder, Calendar, UploadCloud, FileImage, Camera } from "lucide-react";
import { Charity } from "@/types";

interface AchievementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; charityId: string; category: string; date: string; proofFile: File }) => void;
  isDirectorOrAdmin: boolean;
  charities: Charity[];
  isUploading: boolean;
}

export default function AchievementFormModal({
  isOpen,
  onClose,
  onSubmit,
  isDirectorOrAdmin,
  charities,
  isUploading,
}: AchievementFormModalProps) {
  const defaultCategory = isDirectorOrAdmin ? "الاستراتيجية" : "إنجاز شخصي";
  const [title, setTitle] = useState("");
  const [charityId, setCharityId] = useState("internal");
  const [category, setCategory] = useState(defaultCategory);
  const [date, setDate] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !proofFile) return;
    onSubmit({ title, charityId, category, date, proofFile });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 shadow-2xl w-full max-w-md overflow-hidden relative z-10 transform transition-all duration-300 scale-100 p-6 md:p-8 space-y-6" dir="rtl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 pb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-500" />
              تسجيل إنجاز مباشر
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5">
              سجل منجزاً عملياً مباشراً ليظهر فوراً في ملفك المهني.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">ماذا أنجزت؟</label>
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
            <select
              value={charityId}
              onChange={(e) => setCharityId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 text-slate-800 dark:text-slate-100 transition-all font-bold cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:text-slate-700 [&>option]:dark:text-slate-200"
            >
              <option value="internal">إنجاز داخلي لشركة زاد</option>
              {charities.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>

          {isDirectorOrAdmin && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-slate-400" />
                القسم المعني
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 text-slate-800 dark:text-slate-100 transition-all font-bold cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:text-slate-700 [&>option]:dark:text-slate-200"
              >
                <option value="الاستراتيجية">الاستراتيجية</option>
                <option value="التقنية">التقنية</option>
                <option value="تنمية الموارد">تنمية الموارد</option>
                <option value="الإعلامية">الإعلامية</option>
                <option value="تكليف">تكليف</option>
                <option value="استقطاب">استقطاب</option>
              </select>
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
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">أرفق شاهد الإنجاز كإثبات</span>
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
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:text-slate-200 font-bold transition-all text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isUploading || !title.trim() || !proofFile}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
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
      </div>
    </div>
  );
}
