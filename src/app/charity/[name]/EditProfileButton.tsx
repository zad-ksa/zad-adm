"use client";

import { useState } from "react";
import EditCharityModal from "./EditCharityModal";

interface EditProfileButtonProps {
  charity: {
    name: string;
    licenseNumber: string | null;
    establishmentDate: string | null;
    logoUrl: string | null;
  };
}

export default function EditProfileButton({ charity }: EditProfileButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="mr-auto bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center gap-2 cursor-pointer select-none active:scale-[0.98] text-sm shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        تعديل ملف الجمعية
      </button>

      {isOpen && (
        <EditCharityModal
          charity={charity}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
