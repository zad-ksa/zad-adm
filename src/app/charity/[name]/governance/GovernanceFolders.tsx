"use client";

import { useState } from "react";
import { ArrowRight, Folder as FolderIcon } from "lucide-react";
import GovernanceRegulationsManager from "./GovernanceRegulationsManager";

export default function GovernanceFolders({ charityId, regulations, isAdmin }: any) {
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const folders = [
    { id: "services", title: "خدمات المركز الوطني" },
    { id: "policies", title: "السياسات المعتمدة" },
    { id: "meetings", title: "سجلات اجتماعات مجلس الادارة والجمعية العمومية" },
  ];

  const FolderGraphic = ({ title }: { title: string }) => (
    <div className="relative group flex flex-col items-center justify-center w-full h-full cursor-pointer hover:scale-105 transition-transform duration-300">
      <div dir="ltr" className="file relative w-60 h-40 origin-bottom [perspective:1500px] z-50">
        <div className="work-5 bg-amber-600 w-full h-full origin-top rounded-2xl rounded-tl-none group-hover:shadow-[0_20px_40px_rgba(0,0,0,.2)] transition-all ease duration-300 relative after:absolute after:content-[''] after:bottom-[99%] after:left-0 after:w-20 after:h-4 after:bg-amber-600 after:rounded-t-2xl before:absolute before:content-[''] before:-top-[15px] before:left-[75.5px] before:w-4 before:h-4 before:bg-amber-600 before:[clip-path:polygon(0_35%,0%_100%,50%_100%);]"></div>
        <div className="work-4 absolute inset-1 bg-zinc-400 rounded-2xl transition-all ease duration-300 origin-bottom select-none group-hover:[transform:rotateX(-20deg)]"></div>
        <div className="work-3 absolute inset-1 bg-zinc-300 rounded-2xl transition-all ease duration-300 origin-bottom group-hover:[transform:rotateX(-30deg)]"></div>
        <div className="work-2 absolute inset-1 bg-zinc-200 rounded-2xl transition-all ease duration-300 origin-bottom group-hover:[transform:rotateX(-38deg)]"></div>
        <div className="work-1 absolute bottom-0 bg-gradient-to-t from-amber-500 to-amber-400 w-full h-[156px] rounded-2xl rounded-tr-none after:absolute after:content-[''] after:bottom-[99%] after:right-0 after:w-[146px] after:h-[16px] after:bg-amber-400 after:rounded-t-2xl before:absolute before:content-[''] before:-top-[10px] before:right-[142px] before:size-3 before:bg-amber-400 before:[clip-path:polygon(100%_14%,50%_100%,100%_100%);] transition-all ease duration-300 origin-bottom flex items-end group-hover:shadow-[inset_0_20px_40px_#fbbf24,_inset_0_-20px_40px_#d97706] group-hover:[transform:rotateX(-46deg)_translateY(1px)]"></div>
      </div>
      <p className="text-xl font-bold text-slate-800 dark:text-slate-100 pt-8 transition-colors group-hover:text-amber-600 text-center max-w-[250px] leading-snug">{title}</p>
    </div>
  );

  if (activeFolder === "services") {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button 
          onClick={() => setActiveFolder(null)}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 w-fit hover:shadow-md"
        >
          <ArrowRight className="w-5 h-5" />
          العودة للمجلدات
        </button>
        <GovernanceRegulationsManager charityId={charityId} regulations={regulations} isAdmin={isAdmin} />
      </div>
    );
  }

  if (activeFolder === "policies" || activeFolder === "meetings") {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button 
          onClick={() => setActiveFolder(null)}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 w-fit hover:shadow-md"
        >
          <ArrowRight className="w-5 h-5" />
          العودة للمجلدات
        </button>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-16 border border-slate-100 dark:border-slate-700 shadow-sm text-center">
          <FolderIcon className="w-20 h-20 mx-auto text-amber-500/50 mb-6" />
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">قريباً</h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto">سيتم تفعيل قسم {folders.find(f => f.id === activeFolder)?.title} والمحتويات الخاصة به قريباً.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 pt-8 pb-4">
        {folders.map(folder => (
          <div key={folder.id} onClick={() => setActiveFolder(folder.id)}>
            <FolderGraphic title={folder.title} />
          </div>
        ))}
      </div>
    </div>
  );
}
