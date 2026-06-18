import React from "react";
import { 
  BookOpen, 
  Zap, 
  Clock, 
  ClipboardList, 
  X, 
  User, 
  Sliders, 
  Send, 
  Lightbulb, 
  Check, 
  ArrowLeft,
  ArrowRight,
  Building2,
  UserCircle,
  Award,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Key,
  Rocket as LucideRocket,
  HelpCircle,
  Phone,
  Lock,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";

// Custom SVG Icons
export const BuildingIcon = ({ className = "w-5 h-5 text-slate-400" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="16" />
    <line x1="15" y1="22" x2="15" y2="16" />
    <line x1="9" y1="16" x2="15" y2="16" />
    <path d="M8 6h2v2H8V6zm0 4h2v2H8v-2zm8-4h2v2h-2V6zm0 4h2v2h-2v-2z" />
  </svg>
);

export const CalendarIcon = ({ className = "w-5 h-5 text-slate-400" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const LicenseIcon = ({ className = "w-5 h-5 text-slate-400" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const RocketIcon = ({ className = "w-8 h-8 text-primary" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.5 16.5c-1.5 1.25-2.5 3.5-2.5 3.5s2.25-1 3.5-2.5" />
    <path d="M14 2c1.8 0 3 1.2 3 3 0 .2 0 .4-.1.6l-3.3 3.3c-.6.6-1.5.6-2.1 0L9.4 6.8c-.6-.6-.6-1.5 0-2.1L12.7 1.4c.2-.2.4-.4.6-.4h.7z" className="fill-primary/5" />
    <path d="M9 12c0-.6.4-1 1-1h1.5l1.5-3 3-1.5V11c0 .6-.4 1-1 1H7.5l-1.5 3-3 1.5V11z" />
    <path d="M12 15l-3-3" />
    <path d="M9 21v-4" />
    <path d="M14 17v4" />
  </svg>
);

export const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);

// Re-export Lucide Icons under standard or unified names to make them easily referenceable
export {
  BookOpen,
  Zap,
  Clock,
  ClipboardList,
  X,
  User,
  Sliders,
  Send,
  Lightbulb,
  Check,
  ArrowLeft,
  ArrowRight,
  Building2,
  UserCircle,
  Award,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Key,
  LucideRocket as Rocket,
  HelpCircle,
  Phone,
  Lock,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
};
