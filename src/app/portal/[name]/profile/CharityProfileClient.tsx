"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, Phone, User } from "lucide-react";
import { updateCharityCredentials } from "@/app/actions/charityProfile";

/**
 * The only screen a charity member has for their own account.
 *
 * Name, phone and permissions are deliberately shown but not editable: those
 * belong to whoever administers the charity. What is theirs alone is how they
 * sign in.
 */
export default function CharityProfileClient({
  name,
  phone,
  initialEmail,
  hasPassword,
}: {
  name: string;
  phone: string;
  initialEmail: string;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await updateCharityCredentials({
        email: email.trim() || null,
        password: password || undefined,
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      setSuccess(res.success ?? "تم الحفظ");
      setPassword("");
      // The banner upstairs asks for exactly this, so it has to notice.
      router.refresh();
    });
  };

  const readOnlyField = (label: string, value: string, Icon: typeof User, ltr = false) => (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          readOnly
          dir={ltr ? "ltr" : undefined}
          className={`w-full px-4 py-2.5 ${ltr ? "pl-11 text-left" : "pr-11"} bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-bold cursor-not-allowed`}
        />
        <Icon
          className={`absolute inset-y-0 ${ltr ? "left-0 ml-3" : "right-0 mr-3"} my-auto w-5 h-5 text-slate-400`}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <header className="flex items-center gap-4 mb-6">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                     bg-gradient-to-b from-primary/10 to-primary/[0.04]
                     dark:from-teal-400/10 dark:to-teal-400/[0.02]
                     shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.16)]
                     dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.18)]"
        >
          <KeyRound className="w-6 h-6 text-primary dark:text-teal-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-primary dark:text-teal-400 tracking-wide">حسابي</p>
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">بيانات الدخول</h1>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-5"
      >
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/25 border border-red-200 dark:border-red-800/50 flex items-start gap-2.5">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <span className="text-sm font-bold text-red-800 dark:text-red-200">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2.5">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {readOnlyField("الاسم", name, User)}
          {readOnlyField("رقم الجوال", phone, Phone, true)}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
          الاسم ورقم الجوال تعدّلهما إدارة الجمعية.
        </p>

        <hr className="border-slate-100 dark:border-slate-700/60" />

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">البريد الإلكتروني</label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              dir="ltr"
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 pl-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-800 dark:text-slate-100 font-bold text-left disabled:opacity-60"
            />
            <Mail className="absolute inset-y-0 left-0 ml-3 my-auto w-5 h-5 text-slate-400" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
            {hasPassword ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              dir="ltr"
              autoComplete="new-password"
              placeholder={hasPassword ? "اتركها فارغة إذا لم ترد التغيير" : "٨ أحرف على الأقل"}
              className="w-full px-4 py-2.5 pl-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-800 dark:text-slate-100 font-bold text-left disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Says plainly what setting these does, and what leaving them does. */}
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60 rounded-xl p-3.5">
          بعد الحفظ يمكنك الدخول بالبريد وكلمة المرور بدل رمز التحقق. والدخول برقم الجوال
          يبقى متاحًا دائمًا، فإن نسيت كلمة المرور ادخل برمز التحقق وعيّن واحدة جديدة من هنا.
        </p>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="py-2.5 px-7 bg-primary text-white rounded-xl font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20 flex items-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            حفظ
          </button>
        </div>
      </form>
    </div>
  );
}
