"use client";

import { useState, useTransition } from "react";
import { selectCharitySession } from "@/app/actions/authCharity";
import { Building2, ArrowLeft, Loader2 } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-12 animate-fade-in-up">
        <div className="flex justify-center mb-8">
          <ZadLogo isOpen={true} className="h-16 w-auto" />
        </div>
        
        <div className="text-center mb-8">
          <h1 className={`${cairo.className} text-2xl font-black text-slate-900 mb-2`}>
            أهلاً بك، {userName}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            أنت مسجل في أكثر من جمعية. يرجى اختيار الجمعية التي تود الدخول لبوابتها.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSelect} className="space-y-6">
          <div className="space-y-3">
            {charities.map(charity => (
              <label 
                key={charity.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedCharity === charity.id 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  selectedCharity === charity.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex-1 text-right">
                  <h3 className={`font-bold ${selectedCharity === charity.id ? 'text-primary' : 'text-slate-700'}`}>
                    {charity.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
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
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedCharity === charity.id ? 'border-primary' : 'border-slate-300'
                }`}>
                  {selectedCharity === charity.id && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                </div>
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={isPending || !selectedCharity}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white rounded-2xl py-4 font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>متابعة</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
