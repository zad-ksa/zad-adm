"use client";

import { Lock, Globe, Eye, LayoutTemplate, Printer, Edit2, Trash2 } from "lucide-react";
import { Meeting, Employee } from "../MeetingsClient";
import { handlePrint, handlePreview } from "../utils/meetingPrint";
import MeetingSummaryPanel from "./MeetingSummaryPanel";

type Props = {
  meeting: Meeting;
  meetingNumber: number;
  sessionId: string;
  isTier1: boolean;
  employees: Employee[];
  departments: { value: string; label: string }[];
  onView: (meeting: Meeting) => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
};

function formatDate(d: string | Date) {
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${year}-${month}-${day}`;
}

function canEditMeeting(meeting: Meeting, sessionId: string, isTier1: boolean) {
  if (meeting.creatorIsTier1 && !isTier1) return false;
  return meeting.createdById === sessionId || isTier1;
}

export default function MeetingCard({
  meeting, meetingNumber, sessionId, isTier1, employees, departments,
  onView, onEdit, onDelete, isPending
}: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-1.5 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0">
          {meeting.isPrivate ? <Lock className="w-3 h-3 text-amber-500" /> : <Globe className="w-3 h-3 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 px-1.5 py-px rounded shrink-0">
              {`ZAD_M_${String(meetingNumber).padStart(3, "0")}`}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{meeting.title}</span>
            {meeting.isPrivate && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1 py-px rounded-full font-bold">خاص</span>}
            {meeting.meetingContext && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1 py-px rounded-full">
                {departments.find(d => d.value === meeting.meetingContext)?.label ?? meeting.meetingContext}
              </span>
            )}
            {meeting.charity && <span className="text-[10px] bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground px-1 py-px rounded-full">{meeting.charity.name}</span>}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <span>{formatDate(meeting.date)}</span>
            {meeting.location && <span>· {meeting.location}</span>}
            <span>· {meeting.createdBy.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-px shrink-0">
          <button onClick={() => onView(meeting)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors" title="عرض النص">
            <Eye className="w-3 h-3" />
          </button>
          <button onClick={() => handlePreview(meeting, meetingNumber)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors" title="عرض بالكليشة">
            <LayoutTemplate className="w-3 h-3" />
          </button>
          <button onClick={() => handlePrint(meeting, meetingNumber)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors" title="طباعة">
            <Printer className="w-3 h-3" />
          </button>
          {canEditMeeting(meeting, sessionId, isTier1) && (
            <button onClick={() => onEdit(meeting)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors" title="تعديل">
              <Edit2 className="w-3 h-3" />
            </button>
          )}
          {canEditMeeting(meeting, sessionId, isTier1) && (
            <button onClick={() => onDelete(meeting.id)} disabled={isPending} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors" title="حذف">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <MeetingSummaryPanel
        meeting={meeting}
        isTier1={isTier1}
        employees={employees}
      />
    </div>
  );
}
