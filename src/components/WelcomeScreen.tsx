import { useState } from "react";
import Image from "next/image";

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-12 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full -ml-16 -mt-16 blur-2xl pointer-events-none" />

      <div className="text-center relative z-10 max-w-2xl mx-auto">
        <div className="relative w-28 h-28 mx-auto mb-6">
          <Image
            src="/assets/logos/لوجو زاد-09.png"
            alt="زاد التنموية"
            fill
            className="object-contain"
            priority
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-4 leading-tight">
          مقياس جاهزية الجمعيات للتخطيط الاستراتيجي
        </h1>
        
        <p className="text-lg text-slate-600 leading-relaxed mb-8">
          أهلاً بكم في مقياس الجاهزية للتخطيط الاستراتيجي المقدّم من{" "}
          <strong className="text-primary font-bold">زاد التنموية لأثر مستدام</strong>. 
          يهدف هذا المقياس لمساعدتكم في تقييم مدى جاهزية جمعيتكم الموقرة للانطلاق في صياغة خطتكم الاستراتيجية.
        </p>

        {/* Action Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setShowGuide(true)}
            className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-primary/30 rounded-2xl transition-all group"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl mb-3 group-hover:scale-110 transition-transform">
              📄
            </div>
            <span className="font-bold text-slate-800 mb-1">دليل الاستخدام</span>
            <span className="text-xs text-slate-500 text-center">
              اطّلع على المحاور، معايير التقييم ونصائح التعبئة
            </span>
          </button>

          <button
            onClick={onStart}
            className="flex flex-col items-center justify-center p-6 bg-primary hover:bg-primary/95 text-white rounded-2xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white text-xl mb-3 animate-pulse">
              ⚡
            </div>
            <span className="font-bold mb-1 text-lg">البدء بالاستبيان</span>
            <span className="text-xs text-white/80 text-center">
              الانتقال مباشرة لتعبئة بيانات الجمعية وبدء التقييم
            </span>
          </button>
        </div>

        <div className="text-slate-400 text-xs flex justify-center items-center gap-2">
          <span>🕒 يستغرق التقييم حوالي 20-30 دقيقة</span>
          <span>•</span>
          <span>📝 يتكون من 64 بنداً موزعة على 10 محاور</span>
        </div>
      </div>

      {/* Guide Image Lightbox/Modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setShowGuide(false)} 
          />
          
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col relative z-10 border border-slate-100 animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <span>📋 دليل استخدام مقياس الجاهزية</span>
              </h2>
              <button
                onClick={() => setShowGuide(false)}
                className="w-10 h-10 rounded-full bg-slate-200/50 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors flex items-center justify-center text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100/50">
              <div className="relative w-full aspect-[2/3] max-w-3xl mx-auto rounded-xl overflow-hidden shadow-md">
                <Image
                  src="/assets/guide.png"
                  alt="دليل مقياس جاهزية الجمعيات للتخطيط الاستراتيجي"
                  fill
                  className="object-contain"
                  sizes="(max-w-768px) 100vw, 800px"
                  priority
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button
                onClick={() => {
                  setShowGuide(false);
                  onStart();
                }}
                className="px-6 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                البدء بالاستبيان الآن ←
              </button>
              <button
                onClick={() => setShowGuide(false)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                إغلاق الدليل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
