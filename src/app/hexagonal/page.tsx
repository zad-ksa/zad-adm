"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
import ProgressBar from "@/components/ProgressBar";

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

export default function HexagonalSurvey() {
  const router = useRouter();
  const [step, setStep] = useState<"welcome" | "register" | "survey">("welcome");
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    charityName: "",
    authorizedTitle: "",
  });

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
          router.push("/results");
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

      <Header disableLink />

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

              <button
                onClick={() => setStep("register")}
                className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                البدء بالاستبيان
              </button>

              <div className="mt-8 text-slate-400 text-xs flex justify-center items-center gap-2">
                <span>🕒 يستغرق التقييم حوالي 15-20 دقيقة</span>
                <span>•</span>
                <span>📝 يتكون من 6 أسئلة تحليلية رئيسية</span>
              </div>
            </div>
          </div>
        )}

        {step === "register" && (
          <div className="glassmorphism rounded-3xl p-8 sm:p-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto shadow-xl bg-white border border-slate-100">
            <div className="mb-8 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">بيانات الجمعية</h2>
              <p className="text-slate-500">يرجى تعبئة البيانات التالية للبدء في استبيان التحليل السداسي</p>
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
                <input
                  required
                  type="text"
                  value={registrationData.charityName}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, charityName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  placeholder="مثال: جمعية البر الأهلية"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">صفة معبي الاستبيان</label>
                <select
                  required
                  value={registrationData.authorizedTitle}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, authorizedTitle: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none bg-white text-slate-800"
                >
                  <option value="" disabled>اختر الصفة...</option>
                  <option value="عضو جمعية عمومية">عضو جمعية عمومية</option>
                  <option value="عضو مجلس إدارة">عضو مجلس إدارة</option>
                  <option value="موظف بدوام كامل">موظف بدوام كامل</option>
                  <option value="موظف بدوام جزئي">موظف بدوام جزئي</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all"
                >
                  الذهاب للأسئلة
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
              className={`absolute inset-0 z-50 flex items-center justify-center bg-slate-50/90 backdrop-blur-sm transition-all duration-500 rounded-3xl ${
                isTransitioning ? "opacity-100 visible" : "opacity-0 invisible"
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
                  <span className="text-3xl shrink-0">{currentQuestion.icon}</span>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {currentQuestion.title}
                  </h2>
                </div>
                <p className="text-primary-foreground/90 text-sm sm:text-base leading-relaxed mr-11">
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
                      className={`w-full px-4 py-3 rounded-xl border transition-all outline-none text-slate-800 text-sm sm:text-base ${
                        index === 0 && !currentAnswers[0].trim()
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
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    currentQuestionIndex === 0
                      ? "opacity-0 pointer-events-none"
                      : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm"
                  }`}
                >
                  السؤال السابق
                </button>

                <button
                  onClick={handleNext}
                  disabled={!isCurrentQuestionValid || isTransitioning || isSubmitting}
                  className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 ${
                    isCurrentQuestionValid && !isSubmitting
                      ? "bg-primary hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-primary/30"
                      : "bg-slate-300 cursor-not-allowed shadow-none"
                  }`}
                >
                  {isSubmitting && <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
                  {isLastQuestion ? "إنهاء وإرسال التحليل" : "السؤال التالي"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
