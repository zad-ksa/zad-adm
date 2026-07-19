"use client";

import { useState, useTransition, useEffect } from "react";
import { useTheme } from "next-themes";
import { loginWithPassword } from "@/app/actions/auth";
import { AlertCircle, Lock, Loader2, Phone, ShieldCheck, Sun, Moon, Eye, EyeOff } from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import Link from "next/link";
import { Cairo } from "next/font/google";

const cairo = Cairo({ subsets: ["arabic"], weight: ["700", "900"] });

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    document.title = "بوابة أعضاء زاد | الدخول";
    setIsMounted(true);
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

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans transition-colors duration-300" dir="rtl">
      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="absolute top-6 left-6 p-2 rounded-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 backdrop-blur-md transition-all shadow-sm z-50"
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Premium Visual Background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05]"></div>
      
      {/* Animated Orbs */}
      <div className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] rounded-full bg-primary/10 dark:bg-primary/15 blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[0%] right-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen pointer-events-none"></div>
      <div className="absolute top-[30%] right-[20%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[80px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" style={{ animationDuration: '10s' }}></div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/70 dark:bg-white/10 backdrop-blur-2xl py-8 px-6 sm:px-10 shadow-2xl border border-slate-200 dark:border-white/20 sm:rounded-3xl relative overflow-hidden transition-colors duration-300">
          
          {/* Inner Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-white/50 dark:bg-white/10 blur-3xl pointer-events-none"></div>

          {/* Logo */}
          <div className="flex justify-center mb-8 animate-fade-in-up">
            <ZadLogo isOpen={true} className="h-16 w-auto drop-shadow-md dark:brightness-0 dark:invert transition-all" />
          </div>
          
          <div className="mb-8 text-center animate-fade-in-up" style={{ animationDuration: '0.6s' }}>
            <h1 className={`${cairo.className} text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 transition-colors`}>
              بوابة أعضاء زاد
            </h1>
            <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed transition-colors">
              بوابة الدخول الآمن لموظفي وأعضاء زاد التنموية.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-start gap-3 animate-fade-in backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
              <span className="text-sm font-bold text-red-700 dark:text-red-200">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 flex items-start gap-3 animate-fade-in backdrop-blur-sm">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-200">{success}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6 animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
            <div className="space-y-3">
              <label htmlFor="phone" className="block text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">
                رقم الجوال
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary dark:group-focus-within:text-white transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-4 pr-12 py-3.5 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-primary focus:dark:border-primary/50 focus:bg-white focus:dark:bg-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold shadow-sm dark:shadow-inner backdrop-blur-sm transition-all text-left"
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="password" className="block text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">
                كلمة المرور
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary dark:group-focus-within:text-white transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-primary focus:dark:border-primary/50 focus:bg-white focus:dark:bg-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold shadow-sm dark:shadow-inner backdrop-blur-sm transition-all text-left"
                  placeholder="••••••••"
                  dir="ltr"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors focus:outline-none"
                  disabled={isPending}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full relative group overflow-hidden bg-primary text-white rounded-xl py-4 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 mt-8 block"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex items-center justify-center gap-2">
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري التحقق وتسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <span>تسجيل الدخول</span>
                    <ShieldCheck className="w-4 h-4 opacity-70 group-hover:scale-110 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 text-center animate-fade-in-up transition-colors" style={{ animationDuration: '1s' }}>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4 transition-colors">
              هل أنت ممثل لجمعية؟
            </p>
            <Link 
              href="/charity-login"
              className="inline-flex items-center justify-center w-full py-3.5 px-4 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all shadow-sm disabled:opacity-50"
            >
              الدخول إلى بوابة الجمعيات
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
