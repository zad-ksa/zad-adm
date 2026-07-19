"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { requestCharityOTP, verifyCharityOTP } from "@/app/actions/authCharity";
import { AlertCircle, Lock, Loader2, Phone, ArrowLeft, ShieldCheck, KeyRound, Building2, Sun, Moon } from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import Link from "next/link";
import { Cairo } from "next/font/google";

const cairo = Cairo({ subsets: ["arabic"], weight: ["700", "900"] });

export default function CharityLoginPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(4).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  const phoneRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    document.title = "بوابة شركاء زاد | الدخول";
    setIsMounted(true);
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    if (value.length > 1) {
      const pastedDigits = value.slice(0, 4 - index).split("");
      const newOtpDigits = [...otpDigits];
      pastedDigits.forEach((digit, i) => {
        newOtpDigits[index + i] = digit;
      });
      setOtpDigits(newOtpDigits);
      
      const nextIndex = Math.min(index + pastedDigits.length, 3);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value;
    setOtpDigits(newOtpDigits);

    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (phone.length !== 9) {
      setError("يرجى إدخال رقم الجوال كاملاً (9 أرقام)");
      return;
    }

    // Process the phone number to start with "0"
    const processedPhone = "0" + phone;

    startTransition(async () => {
      const result = await requestCharityOTP(processedPhone);
      if (result && result.error) {
        setError(result.error);
      } else {
        setSuccess("تم إرسال رمز التحقق إلى جوالك");
        setStep(2);
      }
    });
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const enteredOtp = otpDigits.join("");
    if (enteredOtp.length !== 4) {
      setError("يرجى إدخال رمز التحقق كاملاً");
      return;
    }

    const processedPhone = "0" + phone;

    startTransition(async () => {
      const result = await verifyCharityOTP(processedPhone, enteredOtp);
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

      {/* Floating Glass Panels in Background */}
      <div className="absolute top-[20%] left-[15%] w-32 h-32 bg-white/80 dark:bg-white border border-slate-200 dark:border-white/20 rounded-2xl backdrop-blur-md transform -rotate-12 animate-bounce shadow-xl dark:shadow-2xl flex items-center justify-center p-3" style={{ animationDuration: '12s' }}>
        <img 
          src="/assets/logos/شعار المركز الوطني.svg" 
          alt="المركز الوطني لتنمية القطاع غير الربحي" 
          className="w-full h-full object-contain"
        />
      </div>
      <div className="absolute bottom-[25%] right-[25%] w-24 h-24 bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-full backdrop-blur-md transform rotate-45 animate-pulse shadow-primary/10 dark:shadow-primary/20 shadow-xl dark:shadow-2xl" style={{ animationDuration: '7s' }}></div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/70 dark:bg-white/10 backdrop-blur-2xl py-8 px-6 sm:px-10 shadow-2xl border border-slate-200 dark:border-white/20 sm:rounded-3xl relative overflow-hidden transition-colors duration-300">
          
          {/* Inner Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-white/50 dark:bg-white/10 blur-3xl pointer-events-none"></div>

          {/* Logos inside the floating box */}
          <div className="flex items-center justify-center gap-5 mb-8 animate-fade-in-up">
            <ZadLogo isOpen={true} className="h-14 w-auto drop-shadow-md dark:brightness-0 dark:invert transition-all" />
            <div className="h-10 w-[1px] bg-slate-300 dark:bg-white/20"></div>
            <div className="bg-white p-2 rounded-xl shadow-sm dark:shadow-none">
              <img 
                src="/assets/logos/شعار المركز الوطني.svg" 
                alt="المركز الوطني لتنمية القطاع غير الربحي" 
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>
          
          <div className="mb-8 text-center animate-fade-in-up" style={{ animationDuration: '0.6s' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 mb-3 shadow-sm dark:shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-primary dark:text-white text-[10px] font-bold tracking-widest uppercase">شراكة نحو التميز المؤسسي</span>
            </div>
            <h1 className={`${cairo.className} text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 transition-colors`}>
              بوابة الشركاء
            </h1>
            <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed transition-colors">
              أهلاً بك في مساحتك المخصصة كشريك لزاد التنموية.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-start gap-3 animate-fade-in backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 flex items-start gap-3 animate-fade-in backdrop-blur-sm">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <span className="text-sm font-bold">{success}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOTP} className="space-y-6 animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 text-center transition-colors">
                  رقم الجوال
                </label>
                <div className="flex items-center justify-center gap-2 max-w-[360px] mx-auto" dir="ltr">
                  <div className="flex items-center justify-center px-4 h-14 bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded-xl text-slate-800 dark:text-white font-bold text-lg shadow-sm dark:shadow-inner backdrop-blur-sm shrink-0 transition-colors">
                    +966
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={9}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 h-14 text-left pl-4 pr-4 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-primary focus:dark:border-primary/50 focus:bg-white focus:dark:bg-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-xl font-bold shadow-sm dark:shadow-inner backdrop-blur-sm transition-all tracking-[0.2em]"
                    placeholder="5XXXXXXXX"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full relative group overflow-hidden bg-primary text-white rounded-xl py-4 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 mt-8 max-w-[360px] mx-auto block"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <span>طلب الرمز</span>
                      <ArrowLeft className="w-4 h-4 opacity-70 group-hover:-translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6 animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 text-center transition-colors">
                  رمز التحقق (OTP)
                </label>
                <div className="flex items-center justify-center gap-3" dir="ltr">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-16 h-16 text-center bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-primary focus:dark:border-primary/50 focus:bg-white focus:dark:bg-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-3xl font-bold shadow-sm dark:shadow-inner backdrop-blur-sm transition-all"
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3 transition-colors">مؤقتاً للبرمجة، استخدم الرمز 0000</p>
              </div>

              <div className="flex gap-3 mt-8 max-w-[360px] mx-auto">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => { setStep(1); setOtpDigits(Array(4).fill("")); setSuccess(null); setError(null); }}
                  className="w-1/3 flex items-center justify-center py-4 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 font-bold transition-all disabled:opacity-50"
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-2/3 relative group overflow-hidden bg-primary text-white rounded-xl py-4 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  <div className="absolute inset-0 w-full h-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    {isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري التحقق...</span>
                      </>
                    ) : (
                      <>
                        <span>تأكيد الدخول</span>
                        <ShieldCheck className="w-4 h-4 opacity-70 group-hover:scale-110 transition-transform" />
                      </>
                    )}
                  </div>
                </button>
              </div>
            </form>
          )}

          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10 text-center animate-fade-in-up transition-colors" style={{ animationDuration: '1s' }}>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 transition-colors">
              <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              تم تطوير البوابة بأعلى معايير الأمان
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
