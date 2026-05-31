"use client";

import { useActionState } from "react";
import Image from "next/image";
import { loginUser } from "./actions";
import { AlertCircle, Phone, Lock, Loader2 } from "@/components/Icons";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginUser, null);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-8">
          <Image 
            src="/assets/logos/لوجو زاد-02.png" 
            alt="شعار زاد التنموية" 
            width={280} 
            height={280} 
            className="object-contain"
            priority
          />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          تسجيل الدخول للنظام
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          أدخل بياناتك للوصول إلى لوحة التحكم
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" action={formAction}>
            {state?.error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="mr-3">
                  <p className="text-sm text-red-700 font-medium">{state.error}</p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                رقم الجوال
              </label>
              <div className="mt-1 relative rounded-xl">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  required
                  className="appearance-none block w-full pr-10 pl-3 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors sm:text-sm"
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                كلمة المرور
              </label>
              <div className="mt-1 relative rounded-xl">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none block w-full pr-10 pl-3 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors sm:text-sm"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span className="flex items-center">
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      جاري الدخول...
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
