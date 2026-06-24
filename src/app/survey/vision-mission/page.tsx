"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, Award, CheckCircle, ChevronLeft, ChevronRight, Target, Users, BookOpen, ShieldAlert, Sparkles, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import ProgressBar from "@/components/ProgressBar";
import LinkClosedScreen from "@/components/LinkClosedScreen";

// Types for responses
type CategoryInput = {
  name: string;
  description: string;
  impact: string;
};

export default function VisionMissionSurveyPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalidToken, setInvalidToken] = useState(false);
  const [prefilledCharityName, setPrefilledCharityName] = useState<string>("");
  const [prefilledCharityLogo, setPrefilledCharityLogo] = useState<string | null>(null);

  // Respondent info
  const [respondentName, setRespondentName] = useState("");
  const [respondentTitle, setRespondentTitle] = useState("");

  // Survey Wizard Step (0: Welcome/Info, 1: Categories, 2: Vision Part 1, 3: Vision Part 2, 4: Mission Part 1, 5: Mission Part 2)
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  // Part 1: Categories (3 categories)
  const [categories, setCategories] = useState<CategoryInput[]>([
    { name: "", description: "", impact: "" },
    { name: "", description: "", impact: "" },
    { name: "", description: "", impact: "" },
  ]);

  // Part 2: Vision Answers
  const [visionQ2, setVisionQ2] = useState("");
  const [visionQ3, setVisionQ3] = useState("");
  const [visionQ4, setVisionQ4] = useState("");
  const [visionQ5Points, setVisionQ5Points] = useState<string[]>(["", "", ""]);
  const [visionQ6, setVisionQ6] = useState("");
  const [visionQ7, setVisionQ7] = useState(""); // Ambition level
  const [visionQ8, setVisionQ8] = useState("");
  const [visionQ9, setVisionQ9] = useState("");
  const [visionQ10, setVisionQ10] = useState("");
  const [visionQ11, setVisionQ11] = useState<string[]>([]); // internal environment checkbox options
  const [visionQ11Other, setVisionQ11Other] = useState("");
  const [visionQ12, setVisionQ12] = useState("");

  // Part 3: Mission Answers
  const [missionQ1, setMissionQ1] = useState("");
  const [missionQ2, setMissionQ2] = useState("");
  const [missionQ3, setMissionQ3] = useState("");
  const [missionQ4, setMissionQ4] = useState("");
  const [missionQ5, setMissionQ5] = useState("");
  const [missionQ6, setMissionQ6] = useState(""); // scope of work
  const [missionQ7, setMissionQ7] = useState(""); // formulation

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    setToken(urlToken);

    if (urlToken) {
      fetch(`/api/survey-links?token=${urlToken}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.isActive && data.surveyType === "VISION_MISSION") {
            setPrefilledCharityName(data.charityName);
            setPrefilledCharityLogo(data.logoUrl);
          } else {
            setInvalidToken(true);
          }
        })
        .catch((err) => {
          console.error("Error validation token:", err);
          setInvalidToken(true);
        })
        .finally(() => setLoading(false));
    } else {
      setInvalidToken(true);
      setLoading(false);
    }
  }, []);

  const handleCheckboxChange = (option: string) => {
    setVisionQ11((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
    );
  };

  const handleCategoryChange = (index: number, field: keyof CategoryInput, value: string) => {
    setCategories((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleQ5Change = (index: number, value: string) => {
    setVisionQ5Points((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  // Validations per step
  const isStepValid = () => {
    if (step === 0) {
      return respondentName.trim() !== "" && respondentTitle.trim() !== "";
    }
    if (step === 1) {
      // At least the first category is required
      return categories[0].name.trim() !== "" && categories[0].impact.trim() !== "";
    }
    if (step === 2) {
      return (
        visionQ2.trim() !== "" &&
        visionQ3.trim() !== "" &&
        visionQ4.trim() !== "" &&
        visionQ5Points.every(p => p.trim() !== "") &&
        visionQ6.trim() !== ""
      );
    }
    if (step === 3) {
      return (
        visionQ7 !== "" &&
        visionQ8.trim() !== "" &&
        visionQ9.trim() !== "" &&
        visionQ10.trim() !== "" &&
        (visionQ11.length > 0 || visionQ11Other.trim() !== "") &&
        visionQ12.trim() !== ""
      );
    }
    if (step === 4) {
      return (
        missionQ1.trim() !== "" &&
        missionQ2.trim() !== "" &&
        missionQ3.trim() !== "" &&
        missionQ4.trim() !== ""
      );
    }
    if (step === 5) {
      return (
        missionQ5.trim() !== "" &&
        missionQ6 !== "" &&
        missionQ7.trim() !== ""
      );
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!isStepValid()) return;
    setIsSubmitting(true);

    const answers = {
      categories,
      vision: {
        q2: visionQ2,
        q3: visionQ3,
        q4: visionQ4,
        q5_points: visionQ5Points,
        q6: visionQ6,
        q7: visionQ7,
        q8: visionQ8,
        q9: visionQ9,
        q10: visionQ10,
        q11: visionQ11,
        q11_other: visionQ11Other,
        q12: visionQ12,
      },
      mission: {
        q1: missionQ1,
        q2: missionQ2,
        q3: missionQ3,
        q4: missionQ4,
        q5: missionQ5,
        q6: missionQ6,
        q7: missionQ7,
      },
    };

    try {
      const res = await fetch("/api/submit-vision-mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charityName: prefilledCharityName,
          respondentName,
          respondentTitle,
          answers,
        }),
      });

      if (res.ok) {
        router.push("/results?type=vision-mission");
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`حدث خطأ أثناء حفظ التقييم: ${errData.error || "خطأ غير معروف"}`);
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-bold">جاري تحميل الاستبيان...</p>
      </div>
    );
  }

  if (invalidToken) {
    return <LinkClosedScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors pb-12">
      <Header disableLink={true} title="استبيان الرؤية والرسالة والأثر" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 relative">
        {step > 0 && <ProgressBar current={step} total={5} />}

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md p-6 sm:p-10 transition-colors mt-6">
          {/* Step 0: Welcome and Personal Information */}
          {step === 0 && (
            <div className="space-y-8">
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                {prefilledCharityLogo && (
                  <img
                    src={prefilledCharityLogo}
                    alt="Logo"
                    className="h-20 w-auto object-contain mx-auto mb-6 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800"
                  />
                )}
                <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                  مرحباً بكم في استبيان الرؤية والرسالة والأثر
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                  يسعى هذا الاستبيان لجمع الرؤى والتطلعات من منسوبي جمعية{" "}
                  <strong className="text-primary">{prefilledCharityName}</strong> لصياغة رسالة ورؤية واضحتين تحددان النطاق والأثر المراد إحداثه. يرجى البدء بتسجيل بياناتك الشخصية:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">الاسم الكريم</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="مثال: محمد بن عبد الله"
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">المسمى الوظيفي / صفتك في الجمعية</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="مثال: مدير مشروع / عضو مجلس إدارة"
                    value={respondentTitle}
                    onChange={(e) => setRespondentTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setStep(1)}
                  disabled={!isStepValid()}
                  className="bg-primary hover:bg-primary/95 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  بدء تعبئة الاستبيان
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Categories and Impact */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  المحور الأول: الفئات المستهدفة والأثر المراد إحداثه
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  حدد أهم 3 فئات تخدمها الجمعية، صف كل فئة، وحدد الأثر الذي تسعى الجمعية لتحقيقه معهم (الفئة الأولى إجبارية).
                </p>
              </div>

              <div className="space-y-8">
                {categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-4"
                  >
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      الفئة المستهدفة {idx === 0 ? "(إجبارية)" : "(اختيارية)"}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">اسم الفئة</label>
                        <input
                          type="text"
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                          placeholder="مثال: الأطفال الأيتام"
                          value={cat.name}
                          onChange={(e) => handleCategoryChange(idx, "name", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">وصف الفئة</label>
                        <input
                          type="text"
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                          placeholder="مثال: الفئة العمرية من 6 إلى 12 عاماً"
                          value={cat.description}
                          onChange={(e) => handleCategoryChange(idx, "description", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">الأثر المراد إحداثه</label>
                        <input
                          type="text"
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                          placeholder="مثال: التمكين التعليمي والتربوي المستدام"
                          value={cat.impact}
                          onChange={(e) => handleCategoryChange(idx, "impact", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setStep(0)}
                  className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  الخلف
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!isStepValid()}
                  className="bg-primary hover:bg-primary/95 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-8 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  المحور التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Vision Part 1 */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Target className="w-6 h-6 text-amber-500" />
                  المحور الثاني: رؤية الجمعية (الجزء الأول)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  نتطلع لتطلعاتكم حول مستقبل الجمعية والمستفيدين وصورتنا المستقبلية.
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-4">
                  <h4 className="font-bold text-amber-600 dark:text-amber-500 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> القسم الأول: صورة المستقبل
                  </h4>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        1. حين تتخيّل جمعيتنا في عام 2030، ما أول صورة تخطر ببالك؟ صِفها في سطر أو سطرين.
                      </label>
                      <textarea
                        required
                        rows={3}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                        placeholder="اكتب وصفاً معبراً هنا..."
                        value={visionQ2}
                        onChange={(e) => setVisionQ2(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        2. بماذا تتمنى أن تشتهر جمعيتنا في ذلك الوقت، وما الذي يجعلها مختلفة عن غيرها؟
                      </label>
                      <textarea
                        required
                        rows={3}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                        placeholder="التفرد والتميز في السمعة..."
                        value={visionQ3}
                        onChange={(e) => setVisionQ3(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        3. ما أهم أثر تتمنى أن تتركه الجمعية في مجال عملها كجمعية متخصصة في القيم؟
                      </label>
                      <textarea
                        required
                        rows={3}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                        placeholder="الأثر الاستراتيجي في القيم..."
                        value={visionQ4}
                        onChange={(e) => setVisionQ4(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                  <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" /> القسم الثاني: المستفيدون
                  </h4>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        4. ما أهم ثلاثة أشياء تتمنى أن تقدّمها الجمعية لمستفيديها؟ (ثلاث نقاط رئيسية)
                      </label>
                      {visionQ5Points.map((point, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <span className="text-xs text-slate-400 font-bold">{idx + 1}.</span>
                          <input
                            type="text"
                            required
                            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            placeholder={`النقطة ${idx + 1}`}
                            value={point}
                            onChange={(e) => handleQ5Change(idx, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        5. ما التغيير الحقيقي الذي تأمل أن تُحدثه الجمعية في حياة مستفيديها؟
                      </label>
                      <textarea
                        required
                        rows={3}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                        placeholder="التغير السلوكي، المعرفي، أو المادي الملموس..."
                        value={visionQ6}
                        onChange={(e) => setVisionQ6(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setStep(1)}
                  className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  الخلف
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!isStepValid()}
                  className="bg-primary hover:bg-primary/95 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-8 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  المحور التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Vision Part 2 */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Target className="w-6 h-6 text-amber-500" />
                  المحور الثاني: رؤية الجمعية (الجزء الثاني)
                </h3>
              </div>

              <div className="space-y-6">
                {/* Ambition level */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-3">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    6. ما مستوى الطموح الذي تتمناه لحجم أثر الجمعية مستقبلاً؟ (اختيار واحد)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {[
                      "التميّز في نطاق الحي/المدينة",
                      "الريادة على مستوى المنطقة",
                      "حضور مؤثّر على المستوى الوطني",
                      "امتداد يتجاوز حدود الوطن",
                    ].map((opt) => (
                      <label
                        key={opt}
                        className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                          visionQ7 === opt
                            ? "bg-primary/5 border-primary text-primary font-bold"
                            : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="ambition"
                          className="w-4 h-4 text-primary"
                          checked={visionQ7 === opt}
                          onChange={() => setVisionQ7(opt)}
                        />
                        <span className="text-xs">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-855 dark:text-slate-200">
                    7. ماذا تتمنى أن يقول الناس عن جمعيتنا حين يذكرونها بعد سنوات؟
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                    placeholder="الذكر الطيب والأثر المتناقل..."
                    value={visionQ8}
                    onChange={(e) => setVisionQ8(e.target.value)}
                  />
                </div>

                {/* Values & Boundaries */}
                <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-4">
                  <h4 className="font-bold text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> القسم الثالث: القيم والحدود
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        8. ما القيم أو المبادئ التي يجب ألّا تتنازل عنها الجمعية مهما تغيّرت الظروف؟
                      </label>
                      <textarea
                        required
                        rows={3}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                        placeholder="مثل: الأمانة، المصداقية، الاتقان..."
                        value={visionQ9}
                        onChange={(e) => setVisionQ9(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        9. ما الأمور التي تتمنى أن ترفض الجمعية القيام بها مهما كانت المغريات؟
                      </label>
                      <textarea
                        required
                        rows={3}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                        placeholder="الخطوط الحمراء التي يجب تجنبها..."
                        value={visionQ10}
                        onChange={(e) => setVisionQ10(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Internal Work Environment */}
                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                  <h4 className="font-bold text-emerald-600 dark:text-emerald-500 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> القسم الرابع: بيئة العمل الداخلية
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        10. ما الشعور الذي تتمنى أن يحمله العاملون والمتطوعون تجاه عملهم في الجمعية؟ (اختيار متعدد)
                      </label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {["الفخر", "الانتماء", "الإلهام", "الأمان", "النمو والتطور"].map((opt) => (
                          <label
                            key={opt}
                            className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                              visionQ11.includes(opt)
                                ? "bg-primary/5 border-primary text-primary font-bold"
                                : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded text-primary"
                              checked={visionQ11.includes(opt)}
                              onChange={() => handleCheckboxChange(opt)}
                            />
                            <span className="text-xs">{opt}</span>
                          </label>
                        ))}
                      </div>
                      <input
                        type="text"
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary/50 outline-none mt-2"
                        placeholder="أخرى (اذكرها هنا)..."
                        value={visionQ11Other}
                        onChange={(e) => setVisionQ11Other(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-855 dark:text-slate-200">
                        11. لو كان بيدك أن تمنح الجمعية أمنية واحدة لمستقبلها، فماذا تكون؟ (سؤال ملهم لختام الرؤية)
                      </label>
                      <textarea
                        required
                        rows={3}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                        placeholder="الأمنية الختامية الكبرى..."
                        value={visionQ12}
                        onChange={(e) => setVisionQ12(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setStep(2)}
                  className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  الخلف
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!isStepValid()}
                  className="bg-primary hover:bg-primary/95 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-8 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  المحور التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Mission Part 1 */}
          {step === 4 && (
            <div className="space-y-8">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-indigo-500" />
                  المحور الثالث: تحديد رسالة الجمعية (الجزء الأول)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  الرسالة تصف غرض وجود الجمعية الحالي، ماذا تقدم، ومن تخدم بوضوح.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    12. لماذا تأسست جمعيتنا؟ ما الحاجة أو القضية الأساسية التي وُجدت لأجلها؟ (جملة أو جملتان)
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                    placeholder="غرض الوجود الجوهري..."
                    value={missionQ1}
                    onChange={(e) => setMissionQ1(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    13. من هم المستفيدون الرئيسون من خدمات الجمعية؟ (اذكر الفئات بوضوح)
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                    placeholder="فئات المستفيدين وتصنيفهم..."
                    value={missionQ2}
                    onChange={(e) => setMissionQ2(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    14. ما الخدمات والبرامج الرئيسة التي تقدّمها الجمعية؟ (مجالات العمل)
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                    placeholder="مجال عملنا وما نقدمه..."
                    value={missionQ3}
                    onChange={(e) => setMissionQ3(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    15. ما النتائج المحددة التي نساعد مستفيدينا على تحقيقها؟ اذكرها كـ (معارف جديدة / مهارات / تغيّر سلوكي).
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                    placeholder="جوهر النتائج المستهدفة للمستفيد..."
                    value={missionQ4}
                    onChange={(e) => setMissionQ4(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setStep(3)}
                  className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  الخلف
                </button>
                <button
                  onClick={() => setStep(5)}
                  disabled={!isStepValid()}
                  className="bg-primary hover:bg-primary/95 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-8 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  المحور التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Mission Part 2 */}
          {step === 5 && (
            <div className="space-y-8">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-indigo-500" />
                  المحور الثالث: رسالة الجمعية (الجزء الثاني والصياغة)
                </h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    16. ما الذي يميّز جمعيتنا عن غيرها من الجمعيات المشابهة في المجال القيمي/الدعوي؟ (المنهجية، الخبرة، إلخ)
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                    placeholder="مواطن التميز التنافسية..."
                    value={missionQ5}
                    onChange={(e) => setMissionQ5(e.target.value)}
                  />
                </div>

                {/* Geographical Scope */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-3">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    17. ما النطاق الجغرافي الذي تعمل فيه الجمعية وتخدم مستفيديها حالياً؟
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {["حي/مدينة", "منطقة", "على مستوى الوطن", "خارج الوطن"].map((opt) => (
                      <label
                        key={opt}
                        className={`p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                          missionQ6 === opt
                            ? "bg-primary/5 border-primary text-primary font-bold"
                            : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="geography"
                          className="w-4 h-4 text-primary"
                          checked={missionQ6 === opt}
                          onChange={() => setMissionQ6(opt)}
                        />
                        <span className="text-xs">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Suggested Wording and Guide */}
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
                  <h4 className="font-bold text-primary text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> 18. صياغتك المقترحة لرسالة الجمعية
                  </h4>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 text-xs leading-relaxed text-slate-500 dark:text-slate-400 space-y-2">
                    <p className="font-bold text-slate-700 dark:text-slate-350">💡 قالب استرشادي لصياغة الرسالة:</p>
                    <p dir="rtl" className="font-medium bg-slate-50 dark:bg-slate-950 p-2 rounded text-center border font-mono">
                      «نُسهم في <span className="text-primary font-bold">[غرض الوجود/الأثر]</span> لخدمة <span className="text-indigo-500 font-bold">[المستفيدين]</span> من خلال <span className="text-emerald-500 font-bold">[الخدمات]</span>، لمساعدتهم على <span className="text-amber-500 font-bold">[النتائج]</span>، متميّزين بـ <span className="text-purple-500 font-bold">[ما يميّزنا]</span>»
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                      بناءً على إجاباتك السابقة، حاول صياغة مسودة لرسالة الجمعية في عبارة واحدة موجزة:
                    </label>
                    <textarea
                      required
                      rows={4}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                      placeholder="اكتب صياغتك المقترحة هنا..."
                      value={missionQ7}
                      onChange={(e) => setMissionQ7(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setStep(4)}
                  className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  الخلف
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!isStepValid() || isSubmitting}
                  className="bg-primary hover:bg-primary/95 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-8 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {isSubmitting && <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
                  إنهاء وإرسال الاستبيان
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
