"use client";

import { useState, useTransition, useEffect } from "react";
import { requestCharityOTP, verifyCharityOTP } from "@/app/actions/authCharity";
import { AlertCircle, Lock, Loader2, Phone, ArrowLeft, ShieldCheck, KeyRound, Building2 } from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import Link from "next/link";
import { Cairo } from "next/font/google";

const cairo = Cairo({ subsets: ["arabic"], weight: ["700", "900"] });

export default function CharityLoginPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    document.title = "بوابة شركاء زاد | الدخول";
    setIsMounted(true);
  }, []);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!phone) {
      setError("يرجى إدخال رقم الجوال");
      return;
    }

    startTransition(async () => {
      const result = await requestCharityOTP(phone);
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

    if (!otp) {
      setError("يرجى إدخال رمز التحقق");
      return;
    }

    startTransition(async () => {
      const result = await verifyCharityOTP(phone, otp);
      if (result && result.error) {
        setError(result.error);
      }
    });
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans" dir="rtl">
      {/* Right Side: Login Form (In RTL, this is the main interaction area) */}
      <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white relative z-10 shadow-2xl shadow-slate-200/50">
        
        {/* Removed top bar */}

        <div className="w-full max-w-sm mx-auto mt-12">
          <div className="flex justify-center mb-10 animate-fade-in-up">
            <ZadLogo isOpen={true} className="h-20 w-auto" />
          </div>
          <div className="mb-10 animate-fade-in-up" style={{ animationDuration: '0.6s' }}>
            <h1 className={`${cairo.className} text-4xl font-black text-slate-900 tracking-tight mb-2`}>
              بوابة الشركاء
            </h1>
            <p className="text-slate-500 font-medium text-sm">
              أهلاً بك في مساحتك المخصصة كشريك لزاد التنموية.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-start gap-3 animate-fade-in">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm font-bold">{success}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOTP} className="space-y-5 animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-sm font-bold text-slate-700">
                  رقم الجوال
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 sm:text-sm font-bold transition-all text-left shadow-sm hover:bg-slate-100"
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full relative group overflow-hidden bg-slate-900 text-white rounded-2xl py-4 text-sm font-bold shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 mt-8 border border-slate-800"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white/80" />
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
              <div className="space-y-1.5">
                <label htmlFor="otp" className="block text-sm font-bold text-slate-700">
                  رمز التحقق (OTP)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    id="otp"
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 sm:text-sm font-bold transition-all text-center tracking-widest shadow-sm hover:bg-slate-100 text-2xl"
                    placeholder="----"
                    dir="ltr"
                    maxLength={4}
                  />
                </div>
                <p className="text-xs text-slate-500 text-center mt-2">مؤقتاً للبرمجة، استخدم الرمز 0000</p>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => { setStep(1); setOtp(""); setSuccess(null); setError(null); }}
                  className="w-1/3 flex items-center justify-center py-4 rounded-2xl text-slate-600 bg-slate-100 font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-2/3 relative group overflow-hidden bg-slate-900 text-white rounded-2xl py-4 text-sm font-bold shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 border border-slate-800"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    {isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white/80" />
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

          <div className="mt-12 text-center animate-fade-in-up" style={{ animationDuration: '1s' }}>
            <p className="text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              تم تطوير البوابة بأعلى معايير الأمان
            </p>
          </div>
        </div>
      </div>

      {/* Left Side: Premium Visual Area */}
      <div className="hidden md:flex flex-1 relative bg-slate-900 overflow-hidden items-center justify-center p-12 border-r border-slate-800">
        {/* Abstract shapes / Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[0%] right-[10%] w-[60%] h-[60%] rounded-full bg-primary/30 blur-[100px] mix-blend-screen pointer-events-none"></div>
        <div className="absolute top-[40%] right-[30%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[80px] mix-blend-screen pointer-events-none"></div>

        {/* Content Box */}
        <div className="relative z-10 max-w-xl text-center md:text-right rtl:md:text-right">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md mb-8 shadow-2xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="text-primary-foreground text-xs font-bold tracking-widest uppercase text-white">شراكة نحو التميز المؤسسي</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6">
            منظومة متكاملة لتمكين <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">القطاع غير الربحي</span>
          </h2>
          
          <p className="text-lg text-slate-300 font-medium leading-relaxed mb-12 max-w-lg">
            من خلال بوابة الشركاء، نتيح لك الوصول إلى جميع أدوات الحوكمة، إدارة الاستراتيجية، ومتابعة الأداء المالي والبشري لجمعيتك بكل احترافية وسهولة.
          </p>

          <div className="grid grid-cols-2 gap-6 max-w-lg">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-white font-bold text-sm">بيئة مركزية</h3>
              <p className="text-slate-400 text-xs leading-relaxed">إدارة شاملة لجميع أقسام الجمعية من مكان واحد.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-white font-bold text-sm">مؤشرات موثوقة</h3>
              <p className="text-slate-400 text-xs leading-relaxed">تتبع لحظي لمستوى التقدم والجاهزية بشفافية.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
