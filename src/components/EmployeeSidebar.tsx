"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { User, ShieldAlert, Users, X, LogOut, LayoutDashboard, Building2, ClipboardList, ChevronRight, Edit, Eye, EyeOff, Camera, Loader2, AlertCircle, CheckCircle2, Newspaper, CheckSquare, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { logout } from "@/app/actions/auth";
import { updateProfile } from "@/app/actions/profile";
import { usePathname } from "next/navigation";
import ZadLogo from "@/components/ZadLogo";

export default function EmployeeSidebar({ 
  session, 
  isOpen, 
  setIsOpen 
}: { 
  session: any; 
  isOpen: boolean; 
  setIsOpen: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const [userState, setUserState] = useState(session);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUserState(session);
  }, [session]);

  let navItems = [];

  if (userState?.role === "ADMINISTRATIVE_SECRETARIAT") {
    navItems = [
      { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
      { label: "المهام والمنجزات", href: "/dashboard/tasks", icon: CheckSquare },
      { label: "الأخبار والإنجازات", href: "/dashboard/news", icon: Newspaper },
      { label: "الجمعيات", href: "/dashboard/charities", icon: Building2 },
      { label: "إدارة الموظفين", href: "/dashboard/employees", icon: Users },
    ];
  } else {
    navItems = [
      { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
      { label: "الجمعيات", href: "/dashboard/charities", icon: Building2 },
      { label: "الاستبيانات", href: "/dashboard/surveys", icon: ClipboardList },
      { label: "الأخبار والإنجازات", href: "/dashboard/news", icon: Newspaper },
    ];

    if (userState?.role !== "GENERAL_MANAGER") {
      navItems.push({ label: "المهام والمنجزات", href: "/dashboard/tasks", icon: CheckSquare });
    }

    if (userState?.role === "ADMIN" || userState?.role === "EXECUTIVE_DIRECTOR" || userState?.role === "GENERAL_MANAGER") {
      navItems.push({ label: "إدارة الموظفين", href: "/dashboard/employees", icon: Users });
    }
  }

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
          setIsEditModalOpen(false);
          setModalSuccess(null);
          setPassword("");
        }, 1500);
      }
    });
  };

  const sidebarContent = (
    <div className="bg-white dark:bg-slate-800 dark:bg-slate-900 flex flex-col h-full border-l border-slate-200 dark:border-slate-700/80 dark:border-slate-800/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative transition-all duration-300">
      
      {/* Desktop Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="hidden lg:flex absolute top-8 -left-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary/30 rounded-full w-6 h-6 items-center justify-center z-50 transition-all shadow-sm cursor-pointer"
      >
        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${!isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Header / Logo */}
      <div className={`flex items-center ${isOpen ? "justify-start px-6" : "justify-center px-0"} h-24 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800 shrink-0 transition-all`}>
        {isOpen ? (
          <div className="w-full h-full flex items-center py-4 relative pr-2">
            <ZadLogo isOpen={true} className="h-12 w-auto" />
          </div>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center">
            <ZadLogo isOpen={false} className="h-10 w-auto" />
          </div>
        )}
      </div>

      {/* Mobile Close Button */}
      <div className="lg:hidden absolute top-6 left-6 z-50">
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:bg-slate-800 p-2 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User Profile - Fixed at top */}
      <div className={`flex flex-col ${isOpen ? "items-start px-6" : "items-center px-2"} mb-8 pb-6 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800 transition-all overflow-hidden shrink-0`}>
        <div className="w-full flex items-center justify-between">
          <button 
            type="button"
          onClick={() => {
            setName(userState?.name || "");
            setPhone(userState?.phone || "");
            setPassword("");
            setNewAvatar(userState?.avatarUrl || null);
            setModalError(null);
            setModalSuccess(null);
            setIsEditModalOpen(true);
          }}
          className="group/avatar flex flex-col items-center justify-center focus:outline-none cursor-pointer"
          title="تعديل الملف الشخصي"
        >
          <div className={`relative overflow-hidden bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shrink-0 transition-all ${isOpen ? "w-14 h-14" : "w-10 h-10"} group-hover/avatar:ring-2 group-hover/avatar:ring-primary/40`}>
            {userState?.avatarUrl ? (
              <img src={userState.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className={isOpen ? "w-7 h-7" : "w-5 h-5"} />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Edit className="w-4.5 h-4.5" />
            </div>
          </div>
        </button>

        {/* Theme Toggle Button */}
        {mounted && isOpen && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer ml-auto mb-3"
            title="تبديل الوضع الداكن/الفاتح"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
        </div>
        
        {isOpen && (
          <div className="overflow-hidden whitespace-nowrap fade-in w-full">
            <div className="flex items-center justify-between gap-2 w-full">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate" title={userState?.name}>{userState?.name}</h2>
              <button 
                type="button"
                onClick={() => {
                  setName(userState?.name || "");
                  setPhone(userState?.phone || "");
                  setPassword("");
                  setNewAvatar(userState?.avatarUrl || null);
                  setModalError(null);
                  setModalSuccess(null);
                  setIsEditModalOpen(true);
                }}
                className="text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                title="تعديل الملف الشخصي"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 dark:border-slate-700 rounded-full text-[11px] text-slate-600 dark:text-slate-300 font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
              {userState?.role === "ADMIN" ? "مدير النظام" :
               userState?.role === "EXECUTIVE_DIRECTOR" ? "مدير تنفيذي" :
               userState?.role === "GENERAL_MANAGER" ? "مدير عام" :
               userState?.role === "ADMINISTRATIVE_SECRETARIAT" ? "مساعد مدير" :
               userState?.role === "STRATEGY" ? "الاستراتيجية" :
               userState?.role === "FINANCE" ? "المالية" : "موظف"}
            </div>
          </div>
        )}
      </div>

      {/* Navigation - Scrollable if items exceed height */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1.5 pb-6">
        {isOpen && <div className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">القائمة الرئيسية</div>}
        
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!isOpen ? item.label : undefined}
              className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} py-3 rounded-xl font-bold transition-all group relative overflow-hidden ${
                isActive 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary dark:hover:text-primary"
              }`}
            >
              {isActive && isOpen && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white dark:bg-slate-800/20 rounded-l-full"></div>}
              <item.icon className={`w-5 h-5 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"}`} />
              {isOpen && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          )
        })}
      </div>

      {/* Logout - Fixed at bottom */}
      <div className="shrink-0 px-3 py-6 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800">
        <form action={logout}>
          <button 
            type="submit" 
            title={!isOpen ? "تسجيل الخروج" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} w-full py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded-xl font-bold transition-colors group`}
          >
            <LogOut className={`w-5 h-5 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} text-red-400 group-hover:text-red-600`} />
            {isOpen && <span className="whitespace-nowrap">تسجيل الخروج</span>}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out h-screen z-20 ${isOpen ? "w-72" : "w-20"}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${isOpen ? "visible" : "invisible pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setIsOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white dark:bg-slate-800 shadow-2xl ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
          {sidebarContent}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
            onClick={() => { if (!isPending) setIsEditModalOpen(false); }}
          />
          
          {/* Modal Container */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-2xl w-full max-w-md overflow-hidden relative z-10 transform transition-all duration-300 scale-100 max-h-[90vh] flex flex-col font-sans" dir="rtl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">تعديل الملف الشخصي</h3>
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)} 
                disabled={isPending}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 p-2 rounded-lg transition-colors cursor-pointer"
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
                </div>
                
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={isPending}
                />
                <p className="text-[10px] text-slate-400 font-medium">الحد الأقصى: 1 ميجابايت (PNG, JPG)</p>
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="profile-name" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                    الاسم بالكامل
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isPending}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 dark:bg-slate-800 dark:focus:bg-slate-800 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-bold"
                    placeholder="أدخل اسمك بالكامل"
                  />
                </div>

                <div>
                  <label htmlFor="profile-phone" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                    رقم الجوال
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isPending}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 dark:bg-slate-800 dark:focus:bg-slate-800 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-bold"
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label htmlFor="profile-password" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                    كلمة المرور الجديدة (اختياري)
                  </label>
                  <div className="relative rounded-xl">
                    <input
                      id="profile-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isPending}
                      className="w-full pr-4 pl-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 dark:bg-slate-800 dark:focus:bg-slate-800 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-bold"
                      placeholder="اتركها فارغة إذا لم ترغب في التغيير"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors focus:outline-none"
                      disabled={isPending}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isPending}
                  className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 hover:text-slate-700 dark:text-slate-200 font-bold transition-all text-sm cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
                
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary/95 font-bold transition-all text-sm flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>حفظ التغييرات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
