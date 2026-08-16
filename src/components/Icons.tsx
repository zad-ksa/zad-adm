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
