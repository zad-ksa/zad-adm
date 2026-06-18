"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AddCharityModal from "@/app/dashboard/AddCharityModal";

export default function AddCharityButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-white font-bold px-5 py-3 rounded-xl shadow-sm hover:shadow transition-all text-sm cursor-pointer select-none active:scale-[0.98]"
      >
        <Plus className="w-5 h-5" />
        <span>إضافة جمعية جديدة</span>
      </button>

      {isOpen && (
        <AddCharityModal 
          onClose={() => setIsOpen(false)} 
          onSuccess={() => {
            router.refresh();
          }} 
        />
      )}
    </>
  );
}
