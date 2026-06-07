import { Lock, Phone, ArrowRight } from "@/components/Icons";

interface LinkClosedScreenProps {
  onBackToHome?: () => void;
}

export default function LinkClosedScreen({ onBackToHome }: LinkClosedScreenProps) {
  return (
    <div className="glassmorphism rounded-3xl p-8 sm:p-12 w-full animate-in fade-in zoom-in-95 duration-500 max-w-xl mx-auto shadow-2xl bg-white border border-rose-100/50 relative overflow-hidden" dir="rtl">
      {/* Top decorative gradient bar */}
      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

      {/* Decorative blurred background circles */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-rose-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="text-center relative z-10 py-4">
        {/* Animated warning lock badge */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-rose-500/10 rounded-full animate-ping duration-1000 opacity-75" />
          <div className="relative w-24 h-24 bg-gradient-to-tr from-rose-50 to-rose-100/50 rounded-full flex items-center justify-center border border-rose-200/50 shadow-inner text-rose-500">
            <Lock className="w-10 h-10 animate-bounce duration-700" />
          </div>
        </div>

        {/* Text Details */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">
          الرابط غير متاح حالياً
        </h2>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-8 font-medium">
          عذراً، هذا الرابط المخصص قد تم إغلاقه أو انتهت صلاحيته من قبل إدارة الشركة. يرجى التواصل مع الإدارة للحصول على رابط تفعيل جديد.
        </p>

        {/* Contact/Support Info Box */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8 flex flex-col items-center gap-3 max-w-md mx-auto">
          <div className="w-10 h-10 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-500 shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div className="text-center">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">بحاجة للمساعدة؟</span>
            <span className="text-sm font-semibold text-slate-700">تواصل مع الدعم الفني لجمعية زاد التنموية أو إدارة جمعيتك</span>
          </div>
        </div>

        {/* Buttons / Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={() => window.location.href = "https://zad.org.sa"}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <span>زيارة موقع زاد التنموية</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>

          <button
            onClick={() => window.location.href = "/"}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer text-sm"
          >
            <span>العودة للرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
}
