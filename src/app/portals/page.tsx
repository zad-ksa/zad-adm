"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { Building2, Users, Sun, Moon, ArrowRight, ShieldCheck } from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import IosInstallHint from "@/components/IosInstallHint";
import { Cairo } from "next/font/google";
import { useEffect, useSyncExternalStore } from "react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["700", "900"] });

// "Has this rendered in the browser yet?" — read as a store rather than set from
// an effect, which keeps the server and client markup identical without tripping
// the set-state-in-effect rule.
const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

export default function PortalsSelectionPage() {
  const { theme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(noopSubscribe, onClient, onServer);

  useEffect(() => {
    document.title = "بوابة الدخول | زاد التنموية";
  }, []);

  // No `if (!isMounted) return null` here. This route is the installed app's
  // start_url, so returning null would make every launch open on a blank screen
  // until hydration finished. Only the theme icon actually needs to wait for
  // mount — `theme` is unknown on the server — so that is all that waits.

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans transition-colors duration-300" dir="rtl">
      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="absolute top-6 left-6 p-2 rounded-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 backdrop-blur-md transition-all shadow-sm z-50"
        aria-label="Toggle Theme"
      >
        {!isMounted ? (
          <Moon className="w-5 h-5 opacity-0" />
        ) : theme === 'dark' ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>

      {/* Back to Home */}
      <Link
        href="/"
        className="absolute top-6 right-6 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 backdrop-blur-md transition-all shadow-sm z-50 font-bold text-sm"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للرئيسية
      </Link>

      {/* Premium Visual Background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05]"></div>

      {/* Animated Orbs */}
      <div className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] rounded-full bg-primary/10 dark:bg-primary/15 blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[0%] right-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 w-full">
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="flex justify-center mb-8">
            <div className="w-60 md:w-72 block">
              <ZadLogo isOpen={true} className="drop-shadow-md dark:brightness-0 dark:invert transition-all" />
            </div>
          </div>
          <h1 className={`${cairo.className} text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4 transition-colors`}>
            بوابة تسجيل الدخول
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-lg mx-auto leading-relaxed transition-colors">
            اختر البوابة المناسبة للوصول إلى لوحة التحكم الخاصة بك والمصممة خصيصاً لتلبية احتياجاتك.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDuration: '0.8s' }}>

          {/* Charity Portal Card */}
          <Link href="/charity-login" className="group relative bg-white/70 dark:bg-white/10 backdrop-blur-2xl p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-white/20 hover:border-emerald-500/30 dark:hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/5 transition-all duration-300 overflow-hidden text-center flex flex-col items-center">
            {/* Hover Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-500/5 dark:to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-300 relative z-10">
              <Building2 className="w-10 h-10" />
            </div>

            <h2 className={`${cairo.className} text-2xl font-bold text-slate-900 dark:text-white mb-3 relative z-10`}>
              بوابة الجمعيات
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 relative z-10">
              خاصة بالجمعيات الأهلية المتعاقدة والمسجلة لإدارة ومتابعة المشاريع والمهام التنموية.
            </p>

            <div className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-5 py-2.5 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors relative z-10">
              تسجيل الدخول
              <ShieldCheck className="w-4 h-4" />
            </div>
          </Link>

          {/* Zad Members Portal Card */}
          <Link href="/login" className="group relative bg-white/70 dark:bg-white/10 backdrop-blur-2xl p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-white/20 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 dark:hover:shadow-primary/5 transition-all duration-300 overflow-hidden text-center flex flex-col items-center">
            {/* Hover Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 dark:to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="w-20 h-20 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-300 relative z-10">
              <Users className="w-10 h-10" />
            </div>

            <h2 className={`${cairo.className} text-2xl font-bold text-slate-900 dark:text-white mb-3 relative z-10`}>
              بوابة أعضاء زاد
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 relative z-10">
              مخصصة لموظفي ومستشاري شركة زاد الإدارة لإدارة العمليات ومتابعة الأداء التشغيلي.
            </p>

            <div className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-primary dark:text-primary bg-primary/5 dark:bg-primary/10 px-5 py-2.5 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors relative z-10">
              تسجيل الدخول
              <ShieldCheck className="w-4 h-4" />
            </div>
          </Link>

        </div>

        <IosInstallHint />
      </div>
    </div>
  );
}
