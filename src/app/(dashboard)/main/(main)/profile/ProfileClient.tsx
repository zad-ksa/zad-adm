"use client";

import { uploadFile } from "@/lib/clientUpload";
import { useState, useRef, useTransition, useEffect } from "react";
import { User, Camera, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, UserCircle } from "lucide-react";
import { updateProfile } from "@/app/actions/profile";
import { useRouter } from "next/navigation";

export default function ProfileClient({ session }: { session: any }) {
  const [name, setName] = useState(session?.name || "");
  const [phone, setPhone] = useState(session?.phone || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newAvatar, setNewAvatar] = useState<string | null>(session?.avatarUrl || null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setModalError("حجم الصورة يجب أن يكون أقل من 1 ميجابايت");
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setNewAvatar(objectUrl);
      setSelectedAvatarFile(file);
      setModalError(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    if (!name.trim()) {
      setModalError("الاسم مطلوب");
      return;
    }

    if (!phone.trim()) {
      setModalError("رقم الجوال مطلوب");
      return;
    }

    startTransition(async () => {
      let uploadedAvatarUrl = newAvatar;
      if (selectedAvatarFile) {
        try {
          const data = await uploadFile(selectedAvatarFile, "avatar");
          uploadedAvatarUrl = data.url;
        } catch (err) {
          // The real reason — wrong type, too large — instead of one generic
          // sentence for every possible failure.
          setModalError(err instanceof Error ? err.message : "فشل رفع الصورة الشخصية");
          return;
        }
      }

      const res = await updateProfile({
        name,
        phone,
        password: password || undefined,
        avatarUrl: uploadedAvatarUrl,
      });

      if (res.error) {
        setModalError(res.error);
      } else if (res.success) {
        setModalSuccess(res.success);
        setPassword("");
        router.refresh();
      }
    });
  };

  return (
    <main className="flex-1 min-w-0 py-4 relative" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-primary shrink-0" />
          الملف الشخصي
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm w-full max-w-2xl mx-auto overflow-hidden font-sans mt-8">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">المعلومات الشخصية</h3>
          <p className="text-xs text-slate-500 mt-1">يمكنك تحديث بياناتك الشخصية وتغيير كلمة المرور من هنا</p>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
          {modalError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 p-4 rounded-xl flex items-start text-sm text-red-700 dark:text-red-400 font-bold">
              <AlertCircle className="w-5 h-5 ml-2 text-red-500 shrink-0 mt-0.5" />
              <span>{modalError}</span>
            </div>
          )}

          {modalSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 p-4 rounded-xl flex items-start text-sm text-emerald-800 dark:text-emerald-300 font-bold">
              <CheckCircle2 className="w-5 h-5 ml-2 text-emerald-500 shrink-0 mt-0.5" />
              <span>{modalSuccess}</span>
            </div>
          )}

          {/* Avatar Uploader */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative group">
              <div className="w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center relative shadow-inner group-hover:border-primary/40 transition-colors">
                {newAvatar ? (
                  <img src={newAvatar} alt="صورة الموظف" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-300" />
                )}
              </div>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="absolute -bottom-2 -left-2 bg-primary text-white p-2.5 rounded-xl shadow hover:bg-primary/95 transition-all text-xs font-bold cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center"
                title="تغيير الصورة"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <span className="text-xs text-slate-500 font-bold mt-1">الحد الأقصى لحجم الصورة 1 ميجابايت</span>
          </div>

          <hr className="border-slate-100 dark:border-slate-700/50" />

          {/* Inputs */}
          <div className="space-y-4 max-w-md mx-auto">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">الاسم</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-800 dark:text-slate-100 font-bold disabled:opacity-60"
                placeholder="اسم الموظف"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">رقم الجوال</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isPending}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-800 dark:text-slate-100 font-bold text-left disabled:opacity-60"
                placeholder="05XXXXXXXX"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">كلمة المرور (اختياري)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-800 dark:text-slate-100 font-bold text-left disabled:opacity-60"
                  placeholder="اتركها فارغة إذا لم ترد التغيير"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center justify-center text-slate-400 hover:text-primary transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 mt-8 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="py-3 px-8 bg-primary text-white rounded-xl font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20 flex items-center justify-center cursor-pointer active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ التعديلات"
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
