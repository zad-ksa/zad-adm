"use client";

import React from "react";
import ZadLogo from "./ZadLogo";

export default function CircularLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] w-full py-16 px-4" dir="rtl">
      {/* CSS Keyframes moved to globals.css for security and CSP compliance */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Glow effect background */}
        <div className="absolute w-28 h-28 rounded-full bg-primary blur-2xl animate-glow-pulse pointer-events-none" />

        {/* Outer glowing border ring */}
        <div className="absolute inset-0 rounded-full border-[4px] border-slate-100 border-t-primary border-b-primary/30 animate-spin" />

        {/* Inner reverse rotating ring */}
        <div className="absolute inset-2.5 rounded-full border-[3px] border-transparent border-r-primary border-l-primary/20 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />

        {/* Center Logo with pulsing scale */}
        <div className="absolute w-14 h-14 flex items-center justify-center animate-pulse-scale text-primary">
          <ZadLogo isOpen={false} className="w-full h-full" />
        </div>
      </div>

      {/* Loading message */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="text-slate-600 font-bold text-base tracking-wide animate-pulse">
          جاري التحميل...
        </p>
        <p className="text-slate-400 font-medium text-xs">
          يرجى الانتظار لحظات
        </p>
      </div>
    </div>
  );
}
