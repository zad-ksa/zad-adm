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
} from "lucide-react";

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
          <strong className="text-primary font-bold">زاد التنموية</strong>.
          يهدف هذا المقياس لمساعدتكم في تقييم مدى جاهزية جمعيتكم الموقرة للانطلاق في صياغة خطتكم الاستراتيجية.
        </p>

        {/* Action Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setShowGuide(true)}
            className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-primary/30 rounded-2xl transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800 mb-1">دليل الاستخدام</span>
            <span className="text-xs text-slate-500 text-center">
              اطّلع على المحاور، معايير التقييم ونصائح التعبئة
            </span>
          </button>

          <button
            onClick={onStart}
            className="flex flex-col items-center justify-center p-6 bg-primary hover:bg-primary/95 text-white rounded-2xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 group cursor-pointer"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white mb-3 animate-pulse">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <span className="font-bold mb-1 text-lg">البدء بالاستبيان</span>
            <span className="text-xs text-white/80 text-center">
              الانتقال مباشرة لتعبئة بيانات الجمعية وبدء التقييم
            </span>
          </button>
        </div>

        <div className="text-slate-500 text-xs sm:text-sm flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-w-lg mx-auto">
          <span className="flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-primary shrink-0" />
            <span>يستغرق التقييم حوالي 20-30 دقيقة</span>
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="flex items-center gap-2">
            <ClipboardList className="w-4.5 h-4.5 text-primary shrink-0" />
            <span>يتكون من 64 بنداً موزعة على 10 محاور</span>
          </span>
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
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50" dir="rtl">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span>دليل استخدام مقياس الجاهزية</span>
              </h2>
              <button
                onClick={() => setShowGuide(false)}
                className="w-10 h-10 rounded-full bg-slate-200/50 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-right" dir="rtl">
              <div className="max-w-3xl mx-auto">
                {/* Title Section */}
                <div className="bg-gradient-to-r from-primary to-teal-800 text-white p-8 rounded-2xl mb-8 text-center relative overflow-hidden shadow-md">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full -ml-10 -mb-10 blur-xl pointer-events-none" />

                  <span className="inline-block bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                    دليل الاستخدام
                  </span>
                  <h3 className="text-2xl md:text-3xl font-extrabold mb-2 leading-tight">
                    مقياس جاهزية الجمعيات للتخطيط الاستراتيجي
                  </h3>
                  <p className="text-teal-100 text-sm md:text-base max-w-xl mx-auto font-medium">
                    خاص بالجمعيات الناشئة | حديثة التأسيس
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/10 text-teal-50 text-sm max-w-lg mx-auto leading-relaxed">
                    هذا الدليل يساعدك على فهم المقياس وكيفية تعبئة استبانته بكل سهولة ويُسر.
                    نتائجه ستحدد مستوى جاهزية جمعيتك وتوجهها نحو الخطوات الصحيحة.
                  </div>
                </div>

                {/* Section 1: ما هذا المقياس؟ */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                      ١
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-lg">أولاً: ما هذا المقياس؟</h4>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                    مقياس جاهزية الجمعيات للتخطيط الاستراتيجي هو أداة تقييم مُصمَّمة خصيصاً للجمعيات الأهلية حديثة التأسيس، يهدف إلى الإجابة عن سؤال واحد مهم: <strong className="text-primary font-bold">هل جمعيتنا جاهزة الآن للدخول في مشروع التخطيط الاستراتيجي؟</strong>
                  </p>
                  <p className="text-slate-600 leading-relaxed text-sm md:text-base mt-3">
                    يقيس المقياس <strong className="text-slate-800 font-semibold">عشرة محاور جوهرية</strong> تشمل: الوضع القانوني، الحوكمة، فريق العمل، الوضع المالي، البرامج، المرافق، الشراكات، الثقافة المؤسسية، إدارة المعلومات، والجاهزية المباشرة للتخطيط.
                  </p>
                </div>

                {/* Section 2: لماذا هو مهم لجمعيتك؟ */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                      ٢
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-lg">ثانياً: لماذا هو مهم لجمعيتك؟</h4>
                  </div>
                  <ul className="space-y-3">
                    {[
                      "يحميك من الخوض في تخطيط استراتيجي قبل اكتمال أسسك المؤسسية",
                      "يكشف الثغرات المخفية التي قد لا تلاحظها في خضم العمل اليومي",
                      "يعطيك خارطة طريق واضحة: هل تبدأ التخطيط الآن أم تطور أولاً؟",
                      "يبني ثقافة التقييم والمساءلة المؤسسية من مرحلة مبكرة",
                      "نتائجه تساعد الجهات الداعمة على تقديم الدعم المناسب لكم"
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-slate-600 text-sm md:text-base leading-relaxed">
                        <Check className="text-secondary w-4.5 h-4.5 shrink-0 mt-1" strokeWidth={3} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 3: محاور المقياس العشرة */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                      ٣
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-lg">ثالثاً: محاور المقياس العشرة</h4>
                  </div>
                  <p className="text-slate-600 text-sm md:text-base mb-4">
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
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 text-slate-500 text-center font-medium">{row.id}</td>
                            <td className="p-3 text-slate-800 font-medium">{row.name}</td>
                            <td className="p-3 text-slate-600 text-center">{row.items}</td>
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
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                      ٤
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-lg">رابعاً: مقياس التقييم الخماسي</h4>
                  </div>
                  <p className="text-slate-600 text-sm md:text-base mb-6">
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
                      <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between text-center transition-all hover:scale-[1.02] ${item.bg}`}>
                        <div className="w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-sm font-bold mx-auto mb-2 border border-current/10 shrink-0">
                          {item.score}
                        </div>
                        <div className="font-bold text-xs md:text-sm mb-1">{item.label}</div>
                        <div className="text-[11px] opacity-80 leading-snug">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 5: كيف تُعبِّئ الاستبانة خطوة بخطوة؟ */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                      ٥
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-lg">خامساً: كيف تُعبِّئ الاستبانة خطوة بخطوة؟</h4>
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
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-sm relative">
                            <IconComponent className="w-5 h-5" />
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-secondary text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                              {item.step}
                            </span>
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-800 text-base mb-1">{item.title}</h5>
                            <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tips Section */}
                <div className="bg-amber-50/60 rounded-2xl p-6 border border-amber-100 shadow-sm">
                  <h4 className="font-extrabold text-amber-950 text-lg mb-4 flex items-center gap-2">
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
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button
                onClick={() => {
                  setShowGuide(false);
                  onStart();
                }}
                className="px-6 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 group cursor-pointer"
              >
                <span>البدء بالاستبيان الآن</span>
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              </button>
              <button
                onClick={() => setShowGuide(false)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors cursor-pointer"
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
