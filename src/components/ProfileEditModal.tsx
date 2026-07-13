"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { User, X, Camera, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { updateProfile } from "@/app/actions/profile";

export default function ProfileEditModal({
  isOpen,
  onClose,
  userState,
  setUserState,
}: {
  isOpen: boolean;
  onClose: () => void;
  userState: any;
  setUserState: (user: any) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && userState) {
      setName(userState.name || "");
      setPhone(userState.phone || "");
      setPassword("");
      setNewAvatar(userState.avatarUrl || null);
      setModalError(null);
      setModalSuccess(null);
    }
  }, [isOpen, userState]);

  if (!isOpen) return null;

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
          const uploadData = new FormData();
          uploadData.append("file", selectedAvatarFile);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: uploadData,
          });
          if (!uploadRes.ok) throw new Error("Upload failed");
          const data = await uploadRes.json();
          uploadedAvatarUrl = data.url;
        } catch (err) {
          setModalError("فشل رفع الصورة الشخصية، يرجى المحاولة مرة أخرى");
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
        if (res.user) {
          setUserState(res.user);
        }
        setTimeout(() => {
          onClose();
          setModalSuccess(null);
          setPassword("");
        }, 1500);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
        onClick={() => { if (!isPending) onClose(); }}
      />
      
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-2xl w-full max-w-md overflow-hidden relative z-10 transform transition-all duration-300 scale-100 max-h-[90vh] flex flex-col font-sans" dir="rtl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">تعديل الملف الشخصي</h3>
          <button 
            type="button"
            onClick={onClose} 
            disabled={isPending}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-6">
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
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center relative shadow-inner group-hover:border-primary/40 transition-colors">
                {newAvatar ? (
                  <img src={newAvatar} alt="صورة الموظف" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-300" />
                )}
              </div>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="absolute -bottom-2 -left-2 bg-primary text-white p-2 rounded-xl shadow hover:bg-primary/95 transition-all text-xs font-bold cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center"
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
            <span className="text-xs text-slate-500 font-bold">الحد الأقصى 1MB</span>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
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

          {/* Footer / Actions */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20 flex items-center justify-center cursor-pointer active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
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
    </div>
  );
}
