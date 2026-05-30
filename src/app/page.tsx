"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "حدث خطأ ما");
      }
    } catch (err) {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-2xl border border-slate-100 w-full max-w-md shadow-sm">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">تسجيل الدخول للإدارة</h1>
            <p className="text-slate-500 font-medium">خاص بفريق زاد التنموية لأثر مستدام</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-left bg-slate-50 focus:bg-white text-slate-800 font-medium"
                dir="ltr"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center border border-red-100 font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-3 text-lg ${
                isLoading
                  ? "bg-slate-300 cursor-not-allowed text-slate-500"
                  : "bg-primary hover:bg-primary/90 active:scale-[0.98] shadow-sm hover:shadow"
              }`}
            >
              {isLoading && <div className="w-5 h-5 border-2 border-slate-500/30 border-t-slate-600 rounded-full animate-spin" />}
              {isLoading ? "جاري التحقق..." : "تسجيل الدخول"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
