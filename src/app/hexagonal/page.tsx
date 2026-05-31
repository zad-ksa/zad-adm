"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
import ProgressBar from "@/components/ProgressBar";
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
  Rocket,
  HelpCircle
} from "@/components/Icons";

interface RegistrationData {
  charityName: string;
  authorizedTitle: string;
}

interface QuestionConfig {
  id: string;
  title: string;
  description: string;
  placeholder: string;
  icon: string;
}

const QUESTIONS: QuestionConfig[] = [
  {
    id: "q1",
    title: "١. نقاط القوة التي تمتلكها الجمعية",
    description: "جوانب التميز والميزات الداخلية المتاحة حالياً بالجمعية (مثل الكفاءات البشرية، الموارد المالية المستقرة، الحوكمة). اذكر حتى 5 نقاط قوة.",
    placeholder: "مثال: وجود فريق عمل مؤهل ذو خبرة عالية",
    icon: "💪",
  },
  {
    id: "q2",
    title: "٢. نقاط الضعف لدى الجمعية",
    description: "العوامل الداخلية التي تحد من فاعلية الجمعية أو تحتاج لتطوير (مثل نقص الكوادر المتخصصة، ضعف الأنظمة الرقمية، تقلب التدفقات النقدية). اذكر حتى 5 نقاط ضعف.",
    placeholder: "مثال: ضعف الحضور الرقمي وشبكات التواصل الاجتماعي",
    icon: "⚠️",
  },
  {
    id: "q3",
    title: "٣. الفرص التي يمكن ان تستثمرها الجمعية",
    description: "الظروف الخارجية المحيطة التي يمكن استغلالها لنمو الجمعية وتطويرها (مثل إتاحة مبادرات تمويل حكومية جديدة، عقد شراكات جديدة). اذكر حتى 5 فرص.",
    placeholder: "مثال: إتاحة شراكة استراتيجية مع جهة مانحة كبرى بالمنطقة",
    icon: "🌟",
  },
  {
    id: "q4",
    title: "٤. المخاطر التي يمكن ان تشكل خطرا على الجمعية",
    description: "التحديات أو التهديدات الخارجية التي قد تؤثر سلباً على أداء الجمعية (مثل التغيرات التنظيمية، تقلب مصادر التمويل، زيادة المنافسة). اذكر حتى 5 مخاطر.",
    placeholder: "مثال: عدم استقرار الدعم المالي من الجهات المانحة",
    icon: "🛑",
  },
  {
    id: "q5",
    title: "٥. عوامل النجاح التي لابد من توفرها في الجمعية",
    description: "المتطلبات الأساسية والمحورية لضمان نجاح واستدامة أعمال الجمعية في المستقبل. اذكر حتى 5 عوامل نجاح.",
    placeholder: "مثال: الاستقرار المالي وتنويع مصادر الدخل",
    icon: "🔑",
  },
  {
    id: "q6",
    title: "٦. الميزة التنافسية للجمعية",
    description: "الشيء الفريد الذي تقدمه الجمعية أو تمتلكه ولا يتوفر بسهولة لدى الجمعيات المماثلة الأخرى. اذكر حتى 5 نقاط تميز تنافسي.",
    placeholder: "مثال: تفرّد الجمعية في تقديم رعاية نوعية تخصصية بالمنطقة",
    icon: "🏆",
  },
];

const QUESTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  q1: Award,          // Strengths
  q2: AlertTriangle,  // Weaknesses
  q3: Sparkles,       // Opportunities
  q4: ShieldAlert,    // Threats
  q5: Key,            // Critical Success Factors
  q6: Rocket,         // Competitive Advantage
};

export default function HexagonalSurvey() {
  const router = useRouter();
  const [step, setStep] = useState<"welcome" | "register" | "survey">("welcome");
  const [showGuide, setShowGuide] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    charityName: "",
    authorizedTitle: "",
  });

  useEffect(() => {
    document.title = "التحليل السداسي | زاد التنموية";
  }, []);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({
    q1: ["", "", "", "", ""],
    q2: ["", "", "", "", ""],
    q3: ["", "", "", "", ""],
    q4: ["", "", "", "", ""],
    q5: ["", "", "", "", ""],
    q6: ["", "", "", "", ""],
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const currentAnswers = answers[currentQuestion.id];
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;

  const QuestionIcon = QUESTION_ICONS[currentQuestion.id] || Sparkles;

  // Validate that at least the first item is filled for the current question
  const isCurrentQuestionValid = currentAnswers[0].trim().length > 0;

  const handleInputChange = (index: number, value: string) => {
    setAnswers((prev) => {
      const updatedList = [...prev[currentQuestion.id]];
      updatedList[index] = value;
      return {
        ...prev,
        [currentQuestion.id]: updatedList,
      };
    });
  };

  const handleNext = async () => {
    if (!isCurrentQuestionValid) return;

    if (isLastQuestion) {
      setIsSubmitting(true);

      // Clean answers: remove trailing whitespace and empty strings from the lists
      const cleanedAnswers: Record<string, string[]> = {};
      Object.keys(answers).forEach((key) => {
        cleanedAnswers[key] = answers[key]
          .map((ans) => ans.trim())
          .filter((ans) => ans.length > 0);
      });

      try {
        const res = await fetch("/api/submit-hexagonal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            charityName: registrationData.charityName,
            authorizedTitle: registrationData.authorizedTitle,
            answers: cleanedAnswers,
          }),
        });

        if (res.ok) {
          router.push("/results?type=hexagonal");
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(`حدث خطأ أثناء إرسال البيانات:\n${errData.details || errData.error || "خطأ غير معروف"}`);
          setIsSubmitting(false);
        }
      } catch (err: any) {
        console.error(err);
        alert(`حدث خطأ في الاتصال:\n${err.message || String(err)}`);
        setIsSubmitting(false);
      }
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev + 1);
        setIsTransitioning(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 500);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev - 1);
        setIsTransitioning(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 400);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-50 text-right" dir="rtl">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />

      <Header disableLink title="التحليل السداسي" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 z-10 relative">
        {step === "welcome" && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-12 relative overflow-hidden">
            {/* Decorative blobs */}
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
                التحليل السداسي للجمعيات الخيرية
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                أهلاً بكم في استبيان التحليل السداسي المقدّم من{" "}
                <strong className="text-primary font-bold">زاد التنموية</strong>.
                يساعد هذا الاستبيان في رسم صورة تحليلية متكاملة لجمعيتكم من خلال رصد ستة أبعاد جوهرية تشمل نقاط القوة والضعف والفرص والمخاطر، بالإضافة لعوامل النجاح والميزة التنافسية.
              </p>

              {/* Action Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button
                  onClick={() => setShowGuide(true)}
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-secondary/30 rounded-2xl transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mb-3 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-slate-800 mb-1">دليل الاستخدام</span>
                  <span className="text-xs text-slate-500 text-center">
                    اطّلع على مفهوم التحليل السداسي وأبعاد التقييم بالتفصيل
                  </span>
                </button>

                <button
                  onClick={() => setStep("register")}
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
                  <span>يستغرق التقييم حوالي 15-20 دقيقة</span>
                </span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="flex items-center gap-2">
                  <ClipboardList className="w-4.5 h-4.5 text-primary shrink-0" />
                  <span>يتكون من 6 أسئلة تحليلية رئيسية</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Guide Modal */}
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
                  <span>دليل التحليل السداسي للجمعيات الخيرية</span>
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
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-right font-sans" dir="rtl">
                <div className="max-w-3xl mx-auto space-y-8">
                  {/* Title banner */}
                  <div className="bg-gradient-to-r from-primary to-teal-800 text-white p-8 rounded-2xl text-center relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full -ml-10 -mb-10 blur-xl pointer-events-none" />

                    <span className="inline-block bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                      الدليل التعريفي للتحليل السداسي
                    </span>
                    <h3 className="text-2xl md:text-3xl font-extrabold mb-2 leading-tight">
                      التحليل السداسي للجمعيات الخيرية
                    </h3>
                    <p className="text-teal-100 text-sm md:text-base max-w-xl mx-auto font-medium">
                      الجمعيات الخيرية والمنظمات غير الربحية
                    </p>
                  </div>

                  {/* Intro text */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h4 className="font-extrabold text-slate-800 text-lg mb-3 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-primary" />
                      <span>ما هو التحليل السداسي؟</span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                      التحليل السداسي هو أداة تخطيط استراتيجي متكاملة تُوظَّف لفهم الوضع الراهن للجمعية الخيرية من ست زوايا مختلفة ومتكاملة. يجمع this التحليل بين البُعدين الداخلي والخارجي لرسم صورة شاملة تُساعد القيادة في اتخاذ قرارات مدروسة وصياغة خطط واقعية.
                    </p>
                    <p className="text-slate-600 leading-relaxed text-sm md:text-base mt-3">
                      يشمل هذا التحليل ستة محاور أساسية: نقاط القوة، نقاط الضعف، الفرص، المخاطر، عوامل النجاح الحاسمة، والميزة التنافسية. وفيما يلي شرح موسّع لكل محور مع أمثلة تطبيقية من واقع العمل الخيري.
                    </p>
                  </div>

                  {/* 1. Strengths */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                      <Award className="w-6 h-6 text-emerald-600" />
                      <div>
                        <h4 className="font-extrabold text-emerald-800 text-lg">أولاً: نقاط القوة (Strengths)</h4>
                        <span className="text-xs text-emerald-600 font-semibold">عوامل داخلية إيجابية</span>
                      </div>
                    </div>
                    <div className="bg-emerald-50/30 p-4 rounded-xl mb-4 text-emerald-950 text-sm leading-relaxed border border-emerald-50">
                      <strong>التعريف:</strong> هي العوامل الداخلية الإيجابية التي تتميز بها الجمعية الخيرية وتجعلها قادرة على تحقيق أهدافها بكفاءة. هذه العوامل تمثّل ما تتفوق فيه الجمعية مقارنةً بغيرها، وهي موجودة ومتاحة حالياً ويمكن الاستفادة منها مباشرةً في تنفيذ البرامج والخدمات.
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-bold text-slate-700 text-sm">💡 الأمثلة التطبيقية:</h5>
                      <div className="space-y-3 pr-2">
                        <div className="text-sm">
                          <strong className="text-slate-800 block mb-1">1. شبكة متطوعين متفانين وذوي خبرة</strong>
                          <p className="text-slate-600 leading-relaxed">تمتلك الجمعية أكثر من 200 متطوع نشط يعملون باحترافية في مجالات الصحة والتعليم والإغاثة، مما يخفّض التكاليف التشغيلية ويرفع جودة الخدمات المقدمة للمستفيدين.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">2. ثقة مجتمعية وسمعة راسخة</strong>
                          <p className="text-slate-600 leading-relaxed">تأسست الجمعية منذ أكثر من 15 عاماً وحققت سمعة طيبة لدى المستفيدين والجهات المانحة، مما يسهّل استقطاب الدعم المادي والشراكات الاستراتيجية.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">3. بنية إدارية منظمة وحوكمة شفافة</strong>
                          <p className="text-slate-600 leading-relaxed">تعمل الجمعية وفق هيكل تنظيمي واضح مع لجان رقابية فاعلة وتقارير مالية شفافة، مما يعزز ثقة الممولين والمستفيدين ويضمن الاستدامة.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Weaknesses */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                      <AlertTriangle className="w-6 h-6 text-rose-600" />
                      <div>
                        <h4 className="font-extrabold text-rose-800 text-lg">ثانياً: نقاط الضعف (Weaknesses)</h4>
                        <span className="text-xs text-rose-600 font-semibold">عوامل داخلية سلبية</span>
                      </div>
                    </div>
                    <div className="bg-rose-50/30 p-4 rounded-xl mb-4 text-rose-950 text-sm leading-relaxed border border-rose-50">
                      <strong>التعريف:</strong> هي العوامل الداخلية السلبية التي تُقيّد قدرة الجمعية على تحقيق أهدافها أو توسيع نطاق خدماتها. تنبع هذه النقاط من داخل المنظمة ذاتها، وتمثّل مجالات تحتاج إلى تطوير أو معالجة للارتقاء بمستوى الأداء المؤسسي.
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-bold text-slate-700 text-sm">💡 الأمثلة التطبيقية:</h5>
                      <div className="space-y-3 pr-2">
                        <div className="text-sm">
                          <strong className="text-slate-800 block mb-1">1. الاعتماد المفرط على مصادر تمويل محدودة</strong>
                          <p className="text-slate-600 leading-relaxed">تعتمد الجمعية على عدد قليل من المانحين الرئيسيين، مما يُعرّضها لخطر الانقطاع المالي المفاجئ في حال توقف أحدهم عن الدعم، ويضعف استدامتها على المدى البعيد.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">2. محدودية القدرات التكنولوجية</strong>
                          <p className="text-slate-600 leading-relaxed">تفتقر الجمعية إلى منظومة رقمية متكاملة لإدارة قواعد بيانات المستفيدين والمتطوعين والمتبرعين، مما يُبطئ العمليات ويزيد من احتمالية الأخطاء الإدارية.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">3. ضعف الكوادر المتخصصة في جمع التبرعات</strong>
                          <p className="text-slate-600 leading-relaxed">يغيب التخصص المهني في إدارة حملات التبرعات والتواصل مع الممولين المؤسسيين، مما يُقيّد قدرة الجمعية على تنويع مصادرها المالية وتوسيع قاعدة داعميها.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Opportunities */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                      <Sparkles className="w-6 h-6 text-sky-600" />
                      <div>
                        <h4 className="font-extrabold text-sky-800 text-lg">ثالثاً: الفرص (Opportunities)</h4>
                        <span className="text-xs text-sky-600 font-semibold">عوامل خارجية إيجابية</span>
                      </div>
                    </div>
                    <div className="bg-sky-50/30 p-4 rounded-xl mb-4 text-sky-950 text-sm leading-relaxed border border-sky-50">
                      <strong>التعريف:</strong> هي العوامل الخارجية الإيجابية في البيئة المحيطة التي يمكن للجمعية توظيفها لصالحها لتحقيق النمو والتوسع. لا تنشأ الفرص من داخل المنظمة بل من المحيط الخارجي، والجمعية التي تتمتع بوعي استراتيجي هي التي تتلقّفها وتستثمرها قبل غيرها.
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-bold text-slate-700 text-sm">💡 الأمثلة التطبيقية:</h5>
                      <div className="space-y-3 pr-2">
                        <div className="text-sm">
                          <strong className="text-slate-800 block mb-1">1. التحول الرقمي ومنصات التبرع الإلكتروني</strong>
                          <p className="text-slate-600 leading-relaxed">يتيح انتشار منصات التبرع الرقمي والدفع الإلكتروني الوصول إلى شريحة واسعة من المتبرعين المحليين والدوليين بتكلفة منخفضة، خاصةً جيل الشباب التقني.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">2. التوجهات الحكومية لدعم العمل الأهلي</strong>
                          <p className="text-slate-600 leading-relaxed">تتجه كثير من الحكومات والمؤسسات الدولية نحو تعزيز الشراكة مع منظمات المجتمع المدني وتوفير تمويل مخصص لبرامج التنمية الاجتماعية، مما يفتح آفاقاً تمويلية جديدة.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">3. الاهتمام المتزايد بالمسؤولية الاجتماعية للشركات</strong>
                          <p className="text-slate-600 leading-relaxed">تلتزم الشركات المتوسطة والكبرى بتخصيص ميزانيات للمسؤولية الاجتماعية، مما يُتيح للجمعية بناء شراكات مؤسسية مستدامة توفر دعماً مالياً وعيناً وتقنياً.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Threats */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                      <ShieldAlert className="w-6 h-6 text-amber-600" />
                      <div>
                        <h4 className="font-extrabold text-amber-800 text-lg">رابعاً: المخاطر (Threats)</h4>
                        <span className="text-xs text-amber-600 font-semibold">عوامل خارجية سلبية</span>
                      </div>
                    </div>
                    <div className="bg-amber-50/30 p-4 rounded-xl mb-4 text-amber-950 text-sm leading-relaxed border border-amber-50">
                      <strong>التعريف:</strong> هي العوامل الخارجية السلبية القادمة من البيئة المحيطة والتي قد تُعيق عمل الجمعية أو تُهدد استمراريتها. لا تملك الجمعية سيطرة مباشرة على هذه التهديدات، لكنها تستطيع التخطيط المسبق للحدّ من آثارها وتجاوزها باستراتيجيات مدروسة.
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-bold text-slate-700 text-sm">💡 الأمثلة التطبيقية:</h5>
                      <div className="space-y-3 pr-2">
                        <div className="text-sm">
                          <strong className="text-slate-800 block mb-1">1. التنافسية المتزايدة في قطاع العمل الخيري</strong>
                          <p className="text-slate-600 leading-relaxed">ارتفاع أعداد المنظمات غير الربحية الجديدة يُنافس الجمعية على نفس المتبرعين والمستفيدين والكوادر البشرية، مما يُضعف موقعها التنافسي إن لم تتجدد وتتميز.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">2. التغيرات التشريعية والرقابية</strong>
                          <p className="text-slate-600 leading-relaxed">التحولات في الأنظمة والقوانين المنظِّمة للعمل الخيري قد تُثقل الأعباء الإجرائية والرقابية على الجمعية، وقد تُقيّد بعض برامجها أو طرق جمع التبرعات.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">3. الأزمات الاقتصادية وتراجع القدرة الشرائية</strong>
                          <p className="text-slate-600 leading-relaxed">في أوقات الانكماش الاقتصادي أو ارتفاع معدلات التضخم، يتراجع إقبال الأفراد والشركات على التبرع، مما قد يُضعف الإيرادات ويُصعّب الالتزام بالبرامج الموعودة.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Success Factors */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-yellow-100">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                      <Key className="w-6 h-6 text-yellow-600" />
                      <div>
                        <h4 className="font-extrabold text-yellow-800 text-lg">خامساً: عوامل النجاح الحاسمة (Critical Success Factors)</h4>
                        <span className="text-xs text-yellow-600 font-semibold">مرتكزات جوهرية</span>
                      </div>
                    </div>
                    <div className="bg-yellow-50/30 p-4 rounded-xl mb-4 text-yellow-950 text-sm leading-relaxed border border-yellow-50">
                      <strong>التعريف:</strong> هي المرتكزات الجوهرية التي يجب أن تُتقنها الجمعية وتُحكم السيطرة عليها حتى تنجح في مهمتها وتستمر في تقديم أثرها. غيابها أو إهمالها قد يُهدد المنظمة بالفشل بغض النظر عن توفر الإمكانات المالية أو البشرية الأخرى.
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-bold text-slate-700 text-sm">💡 الأمثلة التطبيقية:</h5>
                      <div className="space-y-3 pr-2">
                        <div className="text-sm">
                          <strong className="text-slate-800 block mb-1">1. توفر كفاءات بشرية مؤهلة</strong>
                          <p className="text-slate-600 leading-relaxed">امتلاك فريق من الكوادر المتخصصة في مجالات العمل الخيري كالتخطيط الاجتماعي والإدارة المالية وإدارة المشاريع يُشكّل العمود الفقري للجمعية، إذ لا يُعوّض الكفاءة البشرية أي موارد مادية مهما بلغت.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">2. بناء مؤسسي متين ومحكم</strong>
                          <p className="text-slate-600 leading-relaxed">وجود هيكل تنظيمي واضح وأنظمة عمل موثّقة وسياسات إجرائية محكمة يضمن استمرارية الجمعية وقدرتها على العمل بانتظام بغض النظر عن التغيرات في القيادة أو الظروف الطارئة.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">3. استقرار مالي</strong>
                          <p className="text-slate-600 leading-relaxed">تنويع مصادر الدخل بين التبرعات الفردية والدعم المؤسسي والمنح الحكومية وعائدات الأنشطة يُحصّن الجمعية من الانهيار المالي المفاجئ ويُتيح لها التخطيط بعيد المدى وتنفيذ برامجها دون انقطاع.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. Competitive Advantage */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-violet-100">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                      <Rocket className="w-6 h-6 text-violet-600" />
                      <div>
                        <h4 className="font-extrabold text-violet-800 text-lg">سادساً: الميزة التنافسية (Competitive Advantage)</h4>
                        <span className="text-xs text-violet-600 font-semibold">خصائص فريدة مميزة</span>
                      </div>
                    </div>
                    <div className="bg-violet-50/30 p-4 rounded-xl mb-4 text-violet-950 text-sm leading-relaxed border border-violet-50">
                      <strong>التعريف:</strong> هي الخاصية أو المزيج من الخصائص الفريدة التي تجعل الجمعية متميزة ومختلفة بشكل واضح عن غيرها من المنظمات العاملة في المجال ذاته. الميزة التنافسية هي السبب الذي يجعل المتبرع يختار دعم هذه الجمعية بالذات، أو يجعل المستفيد يلجأ إليها دون سواها.
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-bold text-slate-700 text-sm">💡 الأمثلة التطبيقية:</h5>
                      <div className="space-y-3 pr-2">
                        <div className="text-sm">
                          <strong className="text-slate-800 block mb-1">1. التخصص العميق في خدمة فئة مجتمعية محددة</strong>
                          <p className="text-slate-600 leading-relaxed">تركيز الجمعية الكامل على فئة معينة كالأطفال ذوي الإعاقة أو المرأة الريفية يمنحها عمقاً معرفياً وعلائقياً يصعب تقليده، مما يجعلها المرجع الأول في هذه الفئة على مستوى المنطقة.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">2. شبكة شراكات محلية متينة</strong>
                          <p className="text-slate-600 leading-relaxed">امتلاك علاقات استراتيجية راسخة مع جامعات ومستشفيات وجهات حكومية ومنظمات محلية يُتيح للجمعية تقديم خدمات متكاملة بجودة وسرعة لا تستطيعها المنظمات الصغيرة المنعزلة.</p>
                        </div>
                        <div className="text-sm border-t border-slate-50 pt-2">
                          <strong className="text-slate-800 block mb-1">3. نموذج تشغيلي مبتكر وموثوق النتائج</strong>
                          <p className="text-slate-600 leading-relaxed">امتلاك منهجية عمل مُبتكرة وموثّقة النتائج، كبرنامج تدريبي حصري أو نظام دعم نفسي اجتماعي متكامل، يمنح الجمعية هوية مميزة ويُصعّب على المنافسين تكرار نموذجها.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conclusion */}
                  <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200">
                    <h4 className="font-extrabold text-slate-800 text-lg mb-2">خلاصة واستنتاج</h4>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      التحليل السداسي ليس مجرد وثيقة تُحفظ في الأدراج، بل هو بوصلة استراتيجية حية يجب أن تُراجَع وتُحدَّث بصفة دورية. الجمعية التي تُتقن هذا التحليل تمتلك وضوح الرؤية وجرأة القرار وقدرة التكيّف — وهذه الثلاثية هي سر النجاح المؤسسي المستدام في العمل الخيري.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                <button
                  onClick={() => {
                    setShowGuide(false);
                    setStep("register");
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

        {step === "register" && (
          <div className="glassmorphism rounded-3xl p-8 sm:p-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto shadow-xl bg-white border border-slate-100" dir="rtl">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20 text-primary">
                <ClipboardList className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">بيانات الجمعية</h2>
              <p className="text-slate-500 text-sm">يرجى تعبئة البيانات التالية للبدء في استبيان التحليل السداسي</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep("survey");
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">اسم الجمعية بالكامل (حسب السجل)</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    value={registrationData.charityName}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, charityName: e.target.value }))}
                    className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-800"
                    placeholder="مثال: جمعية البر الأهلية"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">صفة معبي الاستبيان</label>
                <div className="relative">
                  <select
                    required
                    value={registrationData.authorizedTitle}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, authorizedTitle: e.target.value }))}
                    className="w-full pr-11 pl-10 py-3 rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none bg-white text-slate-800 appearance-none font-medium"
                  >
                    <option value="" disabled>اختر الصفة...</option>
                    <option value="عضو جمعية عمومية">عضو جمعية عمومية</option>
                    <option value="عضو مجلس إدارة">عضو مجلس إدارة</option>
                    <option value="موظف بدوام كامل">موظف بدوام كامل</option>
                    <option value="موظف بدوام جزئي">موظف بدوام جزئي</option>
                    <option value="متطوع">متطوع</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <UserCircle className="w-5 h-5" />
                  </div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl font-bold text-white bg-primary hover:bg-primary/95 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>الذهاب للأسئلة</span>
                  <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                </button>
              </div>
            </form>
          </div>
        )}

        {step === "survey" && (
          <>
            <ProgressBar current={currentQuestionIndex + 1} total={QUESTIONS.length} />

            {/* Transition Overlay */}
            <div
              className={`absolute inset-0 z-50 flex items-center justify-center bg-slate-50/90 backdrop-blur-sm transition-all duration-500 rounded-3xl ${isTransitioning ? "opacity-100 visible" : "opacity-0 invisible"
                }`}
            >
              <div className="text-center transform transition-transform duration-500 scale-110">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">جاري الانتقال للسؤال التالي...</h2>
              </div>
            </div>

            <div className={`transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              {/* Question Header Card */}
              <div className="mb-8 p-6 bg-primary text-white rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
                <div className="flex items-center gap-3 mb-2">
                  <span className="p-2 bg-white/20 rounded-xl shrink-0 text-white">
                    <QuestionIcon className="w-8 h-8" />
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {currentQuestion.title}
                  </h2>
                </div>
                <p className="text-primary-foreground/90 text-sm sm:text-base leading-relaxed mr-14">
                  {currentQuestion.description}
                </p>
              </div>

              {/* Input Fields */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
                <div className="pb-3 border-b border-slate-100 flex justify-between items-center text-xs text-slate-400">
                  <span>يرجى تعبئة بند واحد على الأقل للتمكن من الانتقال</span>
                  <span className="text-primary font-semibold">باقي البنود اختيارية</span>
                </div>

                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index} className="flex gap-4 items-center">
                    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      required={index === 0}
                      value={currentAnswers[index]}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      placeholder={index === 0 ? currentQuestion.placeholder : "إدخال اختياري إضافي..."}
                      className={`w-full px-4 py-3 rounded-xl border transition-all outline-none text-slate-800 text-sm sm:text-base ${index === 0 && !currentAnswers[0].trim()
                          ? "border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-amber-50/10"
                          : "border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                        }`}
                    />
                  </div>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="mt-10 flex justify-between items-center pb-12">
                <button
                  onClick={handlePrev}
                  disabled={currentQuestionIndex === 0 || isTransitioning || isSubmitting}
                  className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 group cursor-pointer ${currentQuestionIndex === 0
                      ? "opacity-0 pointer-events-none"
                      : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm"
                    }`}
                >
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  <span>السؤال السابق</span>
                </button>

                <button
                  onClick={handleNext}
                  disabled={!isCurrentQuestionValid || isTransitioning || isSubmitting}
                  className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 group cursor-pointer ${isCurrentQuestionValid && !isSubmitting
                      ? "bg-primary hover:bg-primary/95 hover:-translate-y-0.5 hover:shadow-primary/30"
                      : "bg-slate-300 cursor-not-allowed shadow-none"
                    }`}
                >
                  {isSubmitting && <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
                  <span>{isLastQuestion ? "إنهاء وإرسال التحليل" : "السؤال التالي"}</span>
                  {!isSubmitting && <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
