"use client";

import { useState, useTransition, useEffect } from "react";
import { loginWithPassword } from "@/app/actions/auth";
import { AlertCircle, Phone, Lock, Loader2, Eye, EyeOff } from "@/components/Icons";
import ZadLogo from "@/components/ZadLogo";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    document.title = "تسجيل الدخول | زاد التنموية";
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Basic validation for Saudi phone numbers
    const cleanedPhone = phone.replace(/\D/g, "");
    if (!cleanedPhone.startsWith("05") || cleanedPhone.length !== 10) {
      setError("يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05 ويتكون من 10 أرقام");
      return;
    }

    if (!password) {
      setError("يرجى إدخال كلمة المرور");
      return;
    }

    startTransition(async () => {
      const result = await loginWithPassword(phone, password);
      if (result && result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" dir="rtl">
      {/* Decorative blurred background circles for premium look */}
      <div className="absolute top-0 -left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 -right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-8 h-20 w-auto">
          <ZadLogo isOpen={true} className="h-20 w-auto" />
        </div>
        <h1 className="mt-2 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          تسجيل الدخول للنظام
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          بوابة الدخول الآمن لموظفي زاد التنموية
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start mb-6">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-red-700 font-bold">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start mb-6">
              <div className="flex-shrink-0 text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div className="mr-3">
                <p className="text-sm text-emerald-800 font-bold">{success}</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-slate-700 mb-2">
                رقم الجوال
              </label>
              <div className="mt-1 relative rounded-xl">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="appearance-none block w-full pr-11 pl-4 py-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all text-sm font-bold"
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                  disabled={isPending}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2">
                كلمة المرور
              </label>
              <div className="mt-1 relative rounded-xl">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pr-11 pl-12 py-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all text-sm font-bold"
                  placeholder="••••••••"
                  dir="ltr"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
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

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-base font-bold text-white bg-primary hover:bg-primary/95 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed select-none active:scale-[0.98] shadow-sm hover:shadow"
              >
                <span className="flex items-center gap-2">
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري التحقق وتسجيل الدخول...
                    </>
                  ) : (
                    "تسجيل الدخول"
                  )}
                </span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
