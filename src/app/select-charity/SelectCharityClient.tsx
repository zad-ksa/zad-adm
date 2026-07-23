"use client";

import { useState, useTransition, useEffect } from "react";
import { useTheme } from "next-themes";
import { selectCharitySession } from "@/app/actions/authCharity";
import { Building2, ArrowLeft, Loader2, Sun, Moon } from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import { Cairo } from "next/font/google";

const cairo = Cairo({ subsets: ["arabic"], weight: ["700", "900"] });

type CharityOption = {
  id: string;
  name: string;
  assignedAt: string;
};

export default function SelectCharityClient({
  charities,
  userName
}: {
  charities: CharityOption[];
  userName: string;
}) {
  const [selectedCharity, setSelectedCharity] = useState<string>(charities[0]?.id || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSelect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharity) return;
    
    setError(null);
    startTransition(async () => {
      const res = await selectCharitySession(selectedCharity);
      if (res && res.error) {
        setError(res.error);
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm relative z-10 px-4 sm:px-0">
        <div className="bg-white/70 dark:bg-white/10 backdrop-blur-2xl py-8 px-6 sm:px-8 shadow-2xl border border-slate-200 dark:border-white/20 sm:rounded-3xl relative overflow-hidden transition-colors duration-300">
          
          {/* Inner Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-white/50 dark:bg-white/10 blur-3xl pointer-events-none"></div>

          {/* Logo */}
          <div className="flex justify-center mb-6 animate-fade-in-up">
            <ZadLogo isOpen={true} className="h-12 w-auto drop-shadow-md dark:brightness-0 dark:invert transition-all" />
          </div>
          
          <div className="text-center mb-8 animate-fade-in-up" style={{ animationDuration: '0.6s' }}>
            <h1 className={`${cairo.className} text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 transition-colors`}>
              أهلاً بك، {userName}
            </h1>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed transition-colors">
              أنت مسجل في أكثر من جمعية. يرجى اختيار الجمعية التي تود الدخول لبوابتها.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-200 text-sm font-bold flex items-start gap-3 animate-fade-in backdrop-blur-sm">
               {error}
            </div>
          )}

          <form onSubmit={handleSelect} className="space-y-6 animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
            <div className="space-y-3">
              {charities.map(charity => (
                <label 
                  key={charity.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedCharity === charity.id 
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' 
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    selectedCharity === charity.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-300'
                  }`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className={`font-bold transition-colors ${selectedCharity === charity.id ? 'text-primary dark:text-primary' : 'text-slate-700 dark:text-slate-200'}`}>
                      {charity.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                      انضممت في {new Date(charity.assignedAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <input 
                    type="radio" 
                    name="charity" 
                    value={charity.id}
                    checked={selectedCharity === charity.id}
                    onChange={() => setSelectedCharity(charity.id)}
                    className="hidden"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedCharity === charity.id ? 'border-primary' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {selectedCharity === charity.id && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                  </div>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={isPending || !selectedCharity}
              className="w-full relative group overflow-hidden bg-primary text-white rounded-xl py-4 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 mt-8 block"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex items-center justify-center gap-2">
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري الدخول...</span>
                  </>
                ) : (
                  <>
                    <span>متابعة الدخول</span>
                    <ArrowLeft className="w-4 h-4 opacity-70 group-hover:-translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
