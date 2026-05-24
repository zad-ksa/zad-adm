"use client";

import Link from "next/link";
import { useState } from "react";
import AddCharityModal from "./AddCharityModal";

export default function CompanySidebar({ charities }: { charities: { id: string; name: string }[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCharities = charities.filter(c => c.name.includes(search));

  return (
    <>
      <aside className="w-72 shrink-0 hidden lg:block">
        <div className="bg-[#212529] rounded-3xl p-6 shadow-sm border border-[#32383e] sticky top-8 flex flex-col h-[calc(100vh-4rem)]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">
              ز
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">زاد التنموية</h2>
              <p className="text-xs text-slate-400">لوحة تحكم الشركة</p>
            </div>
          </div>

          <div className="mb-6">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-primary/20 hover:bg-primary/30 text-primary-300 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-primary/20"
            >
              <span className="text-xl">+</span> إضافة جمعية جديدة
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="البحث عن جمعية..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1d21] border border-[#32383e] text-slate-200 placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-1 custom-scrollbar">
            <div className="text-xs font-bold text-slate-500 mb-2 px-2 uppercase tracking-wider">الجمعيات المتعاقد معها</div>
            {filteredCharities.length > 0 ? (
              filteredCharities.map((charity) => (
                <Link
                  key={charity.id}
                  href={`/dashboard/charity/${encodeURIComponent(charity.name)}`}
                  className="block px-4 py-3 rounded-xl text-slate-400 hover:bg-[#1a1d21] hover:text-primary-300 font-semibold transition-colors truncate"
                  title={charity.name}
                >
                  {charity.name}
                </Link>
              ))
            ) : (
              <div className="text-sm text-slate-500 text-center py-4">
                لا توجد نتائج
              </div>
            )}
          </div>
        </div>
      </aside>

      {isModalOpen && (
        <AddCharityModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
}
