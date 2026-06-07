import { useState } from "react";
import Image from "next/image";
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
  ArrowLeft 
} from "@/components/Icons";

interface WelcomeScreenProps {
  onStart: () => void;
  prefilledCharityName?: string;
  prefilledCharityLogo?: string;
}

export default function WelcomeScreen({ onStart, prefilledCharityName, prefilledCharityLogo }: WelcomeScreenProps) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 max-w-5xl mx-auto shadow-sm" dir="rtl">
      {/* Right Side: Branding & Logos (5 columns on md) */}
      <div className="md:col-span-5 bg-slate-50 border-l border-slate-200 p-8 sm:p-12 flex flex-col justify-center items-center text-center">
        {/* Prominent logos display */}
        {prefilledCharityLogo ? (
          <div className="flex items-center justify-center gap-5 mb-8">
            <div className="w-32 h-16 flex items-center justify-center transition-transform duration-200 hover:scale-105 select-none">
              <img 
                src="/assets/logos/لوجو زاد-cropped.svg" 
                alt="زاد التنموية" 
                className="w-full h-full object-contain filter drop-shadow-sm"
              />
            </div>
            <div className="h-8 w-[1px] bg-slate-300 shrink-0" />
            <div className="h-16 flex items-center justify-center transition-transform duration-200 hover:scale-105 select-none shrink-0">
              <img 
                src={prefilledCharityLogo} 
                alt={prefilledCharityName || "شعار الجمعية"} 
                className="h-full w-auto max-w-[120px] object-contain filter drop-shadow-sm"
              />
            </div>
          </div>
        ) : (
          <div className="w-40 h-20 flex items-center justify-center mb-8 transition-transform duration-200 hover:scale-105 select-none">
            <img 
              src="/assets/logos/لوجو زاد-cropped.svg" 
              alt="زاد التنموية" 
              className="w-full h-full object-contain filter drop-shadow-sm"
            />
          </div>
        )}

        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 mb-3 leading-tight">
          مقياس جاهزية الجمعيات للتخطيط الاستراتيجي
        </h2>

        {prefilledCharityName ? (
          <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 bg-primary/5 border border-primary/10 rounded-full text-xs text-primary font-bold">
            مخصص لـ {prefilledCharityName}
          </div>
        ) : (
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
            تقييم متكامل لمساعدة الجمعيات الأهلية في تحديد مدى استعدادها للانطلاق في صياغة خطتها الاستراتيجية.
          </p>
        )}
      </div>

      {/* Left Side: Interactive options & start button (7 columns on md) */}
      <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
        <div className="max-w-xl mx-auto w-full">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">أهلاً بكم في مقياس الجاهزية</h3>
            <p className="text-sm text-slate-650 leading-relaxed">
              يهدف هذا المقياس لمساعدتكم في تقييم مدى جاهزية جمعيتكم الموقرة للانطلاق في صياغة خطتكم الاستراتيجية بكل يسر وسهولة.
            </p>
          </div>

          {/* Action Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setShowGuide(true)}
              className="flex flex-col items-center justify-center p-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 bg-primary/5 text-primary border border-primary/10 rounded-lg flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 text-sm mb-1">دليل الاستخدام</span>
              <span className="text-[11px] text-slate-500 text-center leading-snug">
                شرح المحاور، معايير التقييم والنصائح
              </span>
            </button>

            <button
              onClick={onStart}
              className="flex flex-col items-center justify-center p-5 bg-primary hover:bg-primary/95 text-white rounded-xl transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 bg-white/10 text-white rounded-lg flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <span className="font-bold text-sm mb-1">البدء بالاستبيان</span>
              <span className="text-[11px] text-white/80 text-center leading-snug">
                تعبئة بيانات الجمعية وبدء التقييم
              </span>
            </button>
          </div>

          <div className="text-slate-600 text-xs flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-primary shrink-0" />
              <span>يستغرق حوالي 20-30 دقيقة</span>
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-primary shrink-0" />
              <span>يتكون من 64 بنداً (10 محاور)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setShowGuide(false)}
          />

          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col relative z-10 border border-slate-200 animate-in fade-in zoom-in-95 duration-205">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50" dir="rtl">
              <h2 className="font-extrabold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span>دليل استخدام مقياس الجاهزية</span>
              </h2>
              <button
                onClick={() => setShowGuide(false)}
                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer font-bold"
                title="إغلاق"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-right" dir="rtl">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Title Section */}
                <div className="bg-primary text-white p-8 rounded-xl text-center relative overflow-hidden">
                  <span className="inline-block bg-secondary text-white text-xs font-bold px-3 py-1 rounded-md mb-3 uppercase tracking-wider">
                    دليل الاستخدام
                  </span>
                  <h3 className="text-xl md:text-2xl font-extrabold mb-2 leading-tight">
                    مقياس جاهزية الجمعيات للتخطيط الاستراتيجي
                  </h3>
                  <p className="text-slate-100 text-xs md:text-sm max-w-xl mx-auto font-medium">
                    خاص بالجمعيات الناشئة | حديثة التأسيس
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/10 text-white/90 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                    هذا الدليل يساعدك على فهم المقياس وكيفية تعبئة استبانته بكل سهولة ويُسر.
                    نتائجه ستحدد مستوى جاهزية جمعيتك وتوجهها نحو الخطوات الصحيحة.
                  </div>
                </div>

                {/* Section 1: ما هذا المقياس؟ */}
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
                      ١
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-base sm:text-lg">أولاً: ما هذا المقياس؟</h4>
                  </div>
                  <p className="text-slate-650 leading-relaxed text-sm md:text-base">
                    مقياس جاهزية الجمعيات للتخطيط الاستراتيجي هو أداة تقييم مُصمَّمة خصيصاً للجمعيات الأهلية حديثة التأسيس، يهدف إلى الإجابة عن سؤال واحد مهم: <strong className="text-primary font-bold">هل جمعيتنا جاهزة الآن للدخول في مشروع التخطيط الاستراتيجي؟</strong>
                  </p>
                  <p className="text-slate-650 leading-relaxed text-sm md:text-base mt-3">
                    يقيس المقياس <strong className="text-slate-800 font-semibold">عشرة محاور جوهرية</strong> تشمل: الوضع القانوني، الحوكمة، فريق العمل، الوضع المالي، البرامج، المرافق، الشراكات، الثقافة المؤسسية، إدارة المعلومات، والجاهزية المباشرة للتخطيط.
                  </p>
                </div>

                {/* Section 2: لماذا هو مهم لجمعيتك؟ */}
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
                      ٢
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-base sm:text-lg">ثانياً: لماذا هو مهم لجمعيتك؟</h4>
                  </div>
                  <ul className="space-y-3">
                    {[
                      "يحميك من الخوض في تخطيط استراتيجي قبل اكتمال أسسك المؤسسية",
                      "يكشف الثغرات المخفية التي قد لا تلاحظها في خضم العمل اليومي",
                      "يعطيك خارطة طريق واضحة: هل تبدأ التخطيط الآن أم تطور أولاً؟",
                      "يبني ثقافة التقييم والمساءلة المؤسسية من مرحلة مبكرة",
                      "نتائجه تساعد الجهات الداعمة على تقديم الدعم المناسب لكم"
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-slate-650 text-sm md:text-base leading-relaxed">
                        <Check className="text-secondary w-4.5 h-4.5 shrink-0 mt-1" strokeWidth={3} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 3: محاور المقياس العشرة */}
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
                      ٣
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-base sm:text-lg">ثالثاً: محاور المقياس العشرة</h4>
                  </div>
                  <p className="text-slate-650 text-sm md:text-base mb-4">
                    يشتمل المقياس على 10 محاور رئيسية تغطي جوانب العمل المؤسسي كافة:
                  </p>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-3 font-bold text-slate-700 w-12 text-center">#</th>
                          <th className="p-3 font-bold text-slate-700">المحور</th>
                          <th className="p-3 font-bold text-slate-700 w-20 text-center">البنود</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { id: "١", name: "الامتثال القانوني والتنظيمي", items: 6 },
                          { id: "٢", name: "الحوكمة والممارسات القيادية", items: 7 },
                          { id: "٣", name: "البناء التنظيمي ورأس المال البشري", items: 7 },
                          { id: "٤", name: "السلامة المالية والاستدامة", items: 8 },
                          { id: "٥", name: "البرامج التنموية والتحول نحو الأثر", items: 7 },
                          { id: "٦", name: "الموارد العينية والبنية الرقمية", items: 6 },
                          { id: "٧", name: "الشراكات الاستراتيجية والاتصال المؤسسي", items: 5 },
                          { id: "٨", name: "الجاهزية المؤسسية والثقافة التنظيمية", items: 6 },
                          { id: "٩", name: "الشفافية والإفصاح وإدارة البيانات", items: 5 },
                          { id: "١٠", name: "الجاهزية التنفيذية للتخطيط الاستراتيجي", items: 7 },
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-500 text-center font-medium">{row.id}</td>
                            <td className="p-3 text-slate-800 font-medium">{row.name}</td>
                            <td className="p-3 text-slate-650 text-center">{row.items}</td>
                          </tr>
                        ))}
                        <tr className="bg-primary/5 font-bold border-t border-slate-200">
                          <td className="p-3 text-primary text-center"></td>
                          <td className="p-3 text-primary">الإجمالي الكلي</td>
                          <td className="p-3 text-primary text-center">64</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 4: مقياس التقييم الخماسي */}
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
                      ٤
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-base sm:text-lg">رابعاً: مقياس التقييم الخماسي</h4>
                  </div>
                  <p className="text-slate-650 text-sm md:text-base mb-6">
                    لكل بند من البنود الـ 64، اختر درجة واحدة فقط من القائمة التالية تعبّر عن الواقع الفعلي في جمعيتك:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {[
                      { score: 5, label: "متوفر بشكل كامل وممنهج", desc: "الجمعية تطبق هذا الجانب بصورة واضحة ومستمرة", bg: "bg-teal-50 border-teal-200 text-teal-800" },
                      { score: 4, label: "متوفر بشكل جيد", desc: "مع بعض الثغرات الصغيرة", bg: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                      { score: 3, label: "متوفر جزئياً", desc: "موجود لكن يحتاج تطوير", bg: "bg-amber-50 border-amber-200 text-amber-800" },
                      { score: 2, label: "في طور البداية", desc: "موجود بشكل مبدئي أو ضعيف", bg: "bg-orange-50 border-orange-200 text-orange-800" },
                      { score: 1, label: "غير متوفر حتى الآن", desc: "غير متوفر بالجمعية", bg: "bg-rose-50 border-rose-200 text-rose-800" },
                    ].map((item, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between text-center transition-colors ${item.bg}`}>
                        <div className="w-8 h-8 rounded-md bg-white shadow-sm flex items-center justify-center text-sm font-bold mx-auto mb-2 border border-current/10 shrink-0">
                          {item.score}
                        </div>
                        <div className="font-bold text-xs md:text-sm mb-1">{item.label}</div>
                        <div className="text-[11px] opacity-80 leading-snug">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 5: كيف تُعبِّئ الاستبانة خطوة بخطوة؟ */}
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
                      ٥
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-base sm:text-lg">خامساً: كيف تُعبِّئ الاستبانة خطوة بخطوة؟</h4>
                  </div>

                  <div className="space-y-6">
                    {[
                      { step: "١", icon: User, title: "أجب بشكل فردي ومستقل", desc: "يُعبَّأ النموذج بشكل فردي — لا تتشاور مع الآخرين أثناء التعبئة" },
                      { step: "٢", icon: Sliders, title: "اختر درجة لكل بند", desc: "لكل بند، اختر رقماً من 1 إلى 5 يعبّر عن الواقع الفعلي في جمعيتك" },
                      { step: "٣", icon: Send, title: "أرسل النموذج", desc: "بعد الانتهاء، اضغط (إرسال) — ستصلك رسالة تأكيد باستلام إجابتك" },
                    ].map((item, idx) => {
                      const IconComponent = item.icon;
                      return (
                        <div key={idx} className="flex gap-4 items-start">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-700 border border-slate-250 flex items-center justify-center shrink-0 mt-0.5 relative">
                            <IconComponent className="w-5 h-5" />
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-secondary text-white text-[10px] font-bold rounded-md flex items-center justify-center border border-white">
                              {item.step}
                            </span>
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-800 text-base mb-1">{item.title}</h5>
                            <p className="text-slate-650 text-sm leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tips Section */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <h4 className="font-extrabold text-amber-950 text-base sm:text-lg mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-secondary shrink-0" />
                    <span>نصائح للحصول على نتائج دقيقة:</span>
                  </h4>
                  <ul className="space-y-3">
                    {[
                      "كن صادقاً في إجاباتك — النموذج ليس اختباراً بل أداة مساعدة للجمعية",
                      "اعتمد على الواقع الفعلي الذي تعرفه أنت، لا على ما تتمنى أن يكون",
                      "تعبئة النموذج فردية — تنوّع الآراء بين أعضاء الفريق مهم ومقصود",
                      "إذا لم تعرف الإجابة عن بند ما، اختر (1) وهذا يساعد الجهة المحللة",
                      "خصص 20 إلى 30 دقيقة هادئة للتعبئة دون انقطاع"
                    ].map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-amber-950 text-sm md:text-base leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-2.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button
                onClick={() => {
                  setShowGuide(false);
                  onStart();
                }}
                className="px-6 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl transition-colors flex items-center gap-2 group cursor-pointer text-sm"
              >
                <span>البدء بالاستبيان الآن</span>
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              </button>
              <button
                onClick={() => setShowGuide(false)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer text-sm"
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
