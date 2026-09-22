"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AddCharityModal from "@/app/(dashboard)/main/AddCharityModal";
import { btn } from "@/components/console/ui";

export default function AddCharityButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={btn.primary}
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
