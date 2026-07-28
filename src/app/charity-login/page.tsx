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

  const [validityTime, setValidityTime] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [resendCount, setResendCount] = useState(0);

  useEffect(() => {
    document.title = "بوابة الجمعيات";
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2) {
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
      interval = setInterval(() => {
        setValidityTime((prev) => {
          if (prev <= 1) {
            setStep(1);
            setOtpDigits(Array(4).fill(""));
            setError("انتهت صلاحية الرمز، يرجى طلب رمز جديد");
            return 300;
          }
          return prev - 1;
        });
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0 || isPending) return;

    setError(null);
    setSuccess(null);
    setOtpDigits(Array(4).fill(""));

    const processedPhone = "0" + phone;

    startTransition(async () => {
      const result = await requestCharityOTP(processedPhone);
      if (result && result.error) {
        setError(result.error);
      } else {
        setSuccess("تم إعادة إرسال رمز التحقق إلى جوالك");
        setValidityTime(300);
        setResendCooldown(120);
        setResendCount(prev => prev + 1);
        otpRefs.current[0]?.focus();
      }
    });
  };

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

    const enteredOtp = newOtpDigits.join("");
    if (enteredOtp.length === 4) {
      submitOTP(enteredOtp);
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
        setValidityTime(300);
        setResendCooldown(30);
        setResendCount(0);
        setStep(2);
      }
    });
  };

  const submitOTP = (enteredOtp: string) => {
    if (enteredOtp.length !== 4) {
      setError("يرجى إدخال رمز التحقق كاملاً");
      return;
    }

    setError(null);
    setSuccess(null);

    const processedPhone = "0" + phone;

    startTransition(async () => {
      const result = await verifyCharityOTP(processedPhone, enteredOtp);
      if (result && result.error) {
        setError(result.error);
        setOtpDigits(Array(4).fill(""));
        otpRefs.current[0]?.focus();
      }
    });
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    submitOTP(otpDigits.join(""));
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
      <div className="absolute bottom-[25%] right-[25%] w-24 h-24 bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-full backdrop-blur-md transform rotate-45 animate-pulse shadow-primary/10 dark:shadow-primary/20 shadow-xl dark:shadow-2xl" style={{ animationDuration: '7s' }}></div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm relative z-10 px-4 sm:px-0">
        <div className="bg-white/70 dark:bg-white/10 backdrop-blur-2xl py-8 px-6 sm:px-8 shadow-2xl border border-slate-200 dark:border-white/20 sm:rounded-3xl relative overflow-hidden transition-colors duration-300">

          {/* Inner Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-white/50 dark:bg-white/10 blur-3xl pointer-events-none"></div>

          {/* Logo */}
          <div className="flex justify-center mb-6 animate-fade-in-up">
            <ZadLogo isOpen={true} className="h-12 w-auto drop-shadow-md dark:brightness-0 dark:invert transition-all" />
          </div>

          <div className="mb-6 text-center animate-fade-in-up" style={{ animationDuration: '0.6s' }}>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 mb-3 shadow-sm dark:shadow-inner">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              <span className="text-primary dark:text-white text-[9px] font-bold tracking-widest uppercase">تمكين نحو الأثر المستدام للجمعيات الأهلية</span>
            </div>
            <h1 className={`${cairo.className} text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1.5 transition-colors`}>
              بوابة الجمعيات
            </h1>
            <p className="text-slate-600 dark:text-slate-300 font-medium text-[11px] leading-relaxed transition-colors">
              أهلاً بك في مساحتك المخصصة لإدارة الخدمات المقدمة من زاد التنموية.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800/50 flex items-start gap-3 animate-fade-in backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-bold text-red-800 dark:text-red-100">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3 animate-fade-in backdrop-blur-sm">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-100">{success}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOTP} className="space-y-5 animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 text-center transition-colors">
                  رقم الجوال
                </label>
                <div className="flex items-center justify-center gap-2 max-w-[320px] mx-auto" dir="ltr">
                  <div className="flex items-center justify-center px-3 h-12 bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded-xl text-slate-800 dark:text-white font-bold text-base shadow-sm dark:shadow-inner backdrop-blur-sm shrink-0 transition-colors">
                    +966
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={9}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 h-12 text-left pl-3 pr-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-primary focus:dark:border-primary/50 focus:bg-white focus:dark:bg-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg font-bold shadow-sm dark:shadow-inner backdrop-blur-sm transition-all tracking-[0.2em]"
                    placeholder="5XXXXXXXX"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full relative group overflow-hidden bg-primary text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 mt-6 max-w-[320px] mx-auto block"
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
            <form onSubmit={handleVerifyOTP} className="space-y-5 animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 text-center transition-colors">
                  رمز التحقق (OTP)
                </label>
                <div className="flex items-center justify-center gap-2.5" dir="ltr">
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
                      className="w-14 h-14 text-center bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-primary focus:dark:border-primary/50 focus:bg-white focus:dark:bg-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-2xl font-bold shadow-sm dark:shadow-inner backdrop-blur-sm transition-all"
                    />
                  ))}
                </div>

                <div className="mt-5 flex flex-col items-center justify-center gap-2 animate-fade-in">
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-wider font-mono bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-xl shadow-inner border border-slate-200 dark:border-white/10">
                    {formatTime(validityTime)}
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 transition-colors mb-1.5">لم يصل الرمز؟</p>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendCooldown > 0 || isPending}
                      className="text-xs font-bold text-primary hover:text-primary/80 dark:text-primary/90 dark:hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 mx-auto"
                    >
                      أعد إرسال الرمز {resendCooldown > 0 && <span className="font-mono text-[10px] bg-primary/10 dark:bg-primary/20 text-primary dark:text-white px-1.5 py-0.5 rounded-md">{formatTime(resendCooldown)}</span>}
                    </button>
                  </div>
                </div>

              </div>

              <div className="flex gap-2.5 mt-6 max-w-[320px] mx-auto">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => { setStep(1); setOtpDigits(Array(4).fill("")); setSuccess(null); setError(null); }}
                  className="w-1/3 flex items-center justify-center py-3 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 font-bold text-sm transition-all disabled:opacity-50"
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-2/3 relative group overflow-hidden bg-primary text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
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

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 text-center animate-fade-in-up transition-colors" style={{ animationDuration: '1s' }}>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 transition-colors mb-6">
              <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              تم تطوير البوابة بأعلى معايير الأمان
            </p>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4 transition-colors">
              هل أنت من موظفي زاد؟
            </p>
            <Link 
              href="/"
              className="inline-flex items-center justify-center w-full py-3.5 px-4 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all shadow-sm disabled:opacity-50"
            >
              الانتقال الى بوابة دخول إدارة زاد
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
