"use client";

import { AlertCircle } from "lucide-react";
import CurrentServicesCards from "./CurrentServicesCards";

interface Step {
  id: string;
  name: string;
  isDone: boolean;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  order: number;
}

interface Stage {
  id: string;
  name: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  duration?: string | null;
  order: number;
  isCurrent: boolean;
  isContinuous: boolean;
  isActive: boolean;
  isDone: boolean;
  steps: Step[];
}

interface Service {
  id: string;
  name: string;
  department: string | null;
  stages: Stage[];
}

export default function ServicesTimelineViewer({
  services,
  charityName
}: {
  services: Service[];
  charityName: string;
}) {
  if (services.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0A0A0A] rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm transition-colors animate-in fade-in duration-300">
        <AlertCircle className="w-12 h-12 text-slate-350 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">لا توجد خدمات متاحة</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">لم يتم إسناد أي خدمات أو مراحل زمنية لهذه الجمعية بعد.</p>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-500">
      <CurrentServicesCards services={services as any} />
    </div>
  );
}
