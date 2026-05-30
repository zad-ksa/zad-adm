"use client";

import { useTransition } from "react";
import { addCharity } from "@/app/actions/charity";

interface ApproveCharityButtonProps {
  name: string;
  establishmentDate?: string;
  licenseNumber?: string;
}

export default function ApproveCharityButton({
  name,
  establishmentDate,
  licenseNumber,
}: ApproveCharityButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    if (confirm(`هل أنت متأكد من تفعيل وإضافة جمعية "${name}" كجمعية متعاقد معها؟`)) {
      startTransition(async () => {
        const result = await addCharity({
          name,
          establishmentDate,
          licenseNumber,
        });
        if (!result.success) {
          alert(result.message || "حدث خطأ أثناء تفعيل الجمعية");
        }
      });
    }
  };

  return (
    <button
      onClick={handleApprove}
      disabled={isPending}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border cursor-pointer select-none
        ${
          isPending
            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            : "bg-secondary hover:bg-secondary/95 text-white border-secondary/20 shadow-none"
        }
      `}
    >
      {isPending ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          جاري التفعيل...
        </>
      ) : (
        <>
          <span>✓</span> تفعيل وإضافة
        </>
      )}
    </button>
  );
}
