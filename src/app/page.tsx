"use client";

import { useState, useEffect, useTransition } from "react";
import { sendOTP, verifyOTP } from "@/app/actions/auth";
import { AlertCircle, Phone, Lock, Loader2, ArrowRight } from "@/components/Icons";
import ZadLogo from "@/components/ZadLogo";

export default function LoginPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Basic validation for Saudi phone numbers
    const cleanedPhone = phone.replace(/\D/g, "");
    if (!cleanedPhone.startsWith("05") || cleanedPhone.length !== 10) {
      setError("يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05 ويتكون من 10 أرقام");
      return;
    }

    startTransition(async () => {
      const result = await sendOTP(phone);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(
          result.isSimulated 
            ? "تم إرسال الرمز 123456 (وضع التجربة محلياً)" 
            : "تم إرسال رمز التحقق بنجاح إلى رقم جوالك"
        );
        setStep(2);
        setTimer(60);
      }
    });
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length < 4) {
      setError("يرجى إدخال رمز التحقق كاملاً");
      return;
    }

    startTransition(async () => {
      const result = await verifyOTP(phone, otp);
      if (result && result.error) {
        setError(result.error);
      }
    });
  };

  const handleResendOTP = async () => {
    if (timer > 0 || isPending) return;
    setError(null);
    setSuccess(null);
    setOtp("");

    startTransition(async () => {
      const result = await sendOTP(phone);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(
          result.isSimulated 
            ? "تم إرسال الرمز 123456 (وضع التجربة محلياً)" 
            : "تم إعادة إرسال الرمز بنجاح"
        );
        setTimer(60);
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
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          تسجيل الدخول للنظام
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          بوابة التحقق الآمن لموظفي زاد التنموية
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

          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleSendOTP}>
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
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-base font-bold text-white bg-primary hover:bg-primary/95 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed select-none active:scale-[0.98] shadow-sm hover:shadow"
                >
                  <span className="flex items-center gap-2">
                    {isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        جاري التحقق وإرسال الرمز...
                      </>
                    ) : (
                      "إرسال رمز التحقق"
                    )}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOTP}>
              <div className="text-center mb-4">
                <p className="text-xs text-slate-400 font-bold">رقم الجوال: <span className="text-slate-700 font-mono">{phone}</span></p>
              </div>
              
              <div>
                <label htmlFor="otp" className="block text-sm font-bold text-slate-700 mb-2">
                  رمز التحقق (OTP)
                </label>
                <div className="mt-1 relative rounded-xl">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="appearance-none block w-full pr-11 pl-4 py-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all text-center tracking-[0.5em] text-lg font-extrabold"
                    placeholder="••••••"
                    dir="ltr"
                    disabled={isPending}
                  />
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
                        جاري التحقق من الرمز...
                      </>
                    ) : (
                      "تسجيل الدخول"
                    )}
                  </span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (isPending) return;
                    setStep(1);
                    setOtp("");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-slate-500 hover:text-primary font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  disabled={isPending}
                >
                  <ArrowRight className="w-4 h-4" />
                  تعديل رقم الجوال
                </button>

                {timer > 0 ? (
                  <span className="text-slate-400 font-bold">
                    إعادة إرسال الرمز خلال {timer} ثانية
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isPending}
                    className="text-primary hover:text-primary/80 font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    إعادة إرسال رمز التحقق
                  </button>
                )}
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
