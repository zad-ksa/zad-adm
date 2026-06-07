"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";
import RegistrationForm, { RegistrationData } from "@/components/RegistrationForm";
import WelcomeScreen from "@/components/WelcomeScreen";
import LinkClosedScreen from "@/components/LinkClosedScreen";
import { surveyData, Section, Question } from "@/data/surveyData";

export default function Home() {
  const router = useRouter();
  const [hasAcceptedWelcome, setHasAcceptedWelcome] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [prefilledCharityName, setPrefilledCharityName] = useState<string | undefined>(undefined);
  const [prefilledCharityLogo, setPrefilledCharityLogo] = useState<string | undefined>(undefined);
  const [invalidToken, setInvalidToken] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentSection = surveyData[currentSectionIndex];
  const isLastSection = currentSectionIndex === surveyData.length - 1;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      fetch(`/api/survey-links?token=${token}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.isActive && data.surveyType === "READINESS") {
            setPrefilledCharityName(data.charityName);
            setPrefilledCharityLogo(data.logoUrl);
          } else if (data && !data.isActive) {
            setInvalidToken(true);
          }
        })
        .catch(err => console.error("Error fetching token:", err));
    }
  }, []);

  // Check if all questions in current section are answered
  const allCurrentAnswered = currentSection.questions.every(
    (q) => !!answers[q.id]
  );

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleNext = async () => {
    if (!allCurrentAnswered) return;

    if (isLastSection) {
      if (!registrationData) return;
      setIsSubmitting(true);

      let totalScore = 0;
      let maxScore = 0;

      surveyData.forEach((sec) => {
        sec.questions.forEach((q) => {
          const selectedOptId = answers[q.id];
          const option = q.options.find((o) => o.id === selectedOptId);
          if (option) {
            totalScore += option.score;
          }
          maxScore += Math.max(...q.options.map((o) => o.score));
        });
      });

      const percentage = Math.round((totalScore / maxScore) * 100);

      try {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...registrationData,
            scorePercentage: percentage,
            answers,
          }),
        });

        if (res.ok) {
          router.push("/results?type=survey");
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
        setCurrentSectionIndex((prev) => prev + 1);
        setIsTransitioning(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 800);
    }
  };

  const handlePrev = () => {
    if (currentSectionIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSectionIndex((prev) => prev - 1);
        setIsTransitioning(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 z-10 relative">
        {!hasAcceptedWelcome ? (
          invalidToken ? (
            <LinkClosedScreen />
          ) : (
            <WelcomeScreen 
              onStart={() => setHasAcceptedWelcome(true)} 
              prefilledCharityName={prefilledCharityName}
              prefilledCharityLogo={prefilledCharityLogo}
            />
          )
        ) : !registrationData ? (
          <RegistrationForm 
            onComplete={setRegistrationData} 
            prefilledCharityName={prefilledCharityName} 
            prefilledCharityLogo={prefilledCharityLogo} 
          />
        ) : (
          <>
            <ProgressBar current={currentSectionIndex + 1} total={surveyData.length} />

            {/* Transition Overlay */}
            <div
              className={`absolute inset-0 z-50 flex items-center justify-center bg-slate-50/95 transition-all duration-300 rounded-2xl ${
                isTransitioning ? "opacity-100 visible" : "opacity-0 invisible"
              }`}
            >
              <div className="text-center transform transition-all duration-300 scale-100">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800">جاري الانتقال للمحور التالي...</h2>
              </div>
            </div>

            <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              <div className="mb-8 p-6 bg-primary text-white rounded-2xl relative overflow-hidden">
                 <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
                  {currentSection.title}
                 </h2>
                 <p className="text-slate-100 text-sm">
                   يرجى الإجابة على جميع أسئلة هذا المحور للانتقال للتالي.
                 </p>
              </div>

              <div className="space-y-6">
                {currentSection.questions.map((question: Question, index: number) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={index + 1}
                    selectedOptionId={answers[question.id]}
                    onSelectOption={(optionId) => handleSelectOption(question.id, optionId)}
                  />
                ))}
              </div>

              <div className="mt-10 flex justify-between items-center pb-12">
                <button
                  onClick={handlePrev}
                  disabled={currentSectionIndex === 0 || isTransitioning || isSubmitting}
                  className={`px-6 py-3 rounded-xl font-semibold transition-colors cursor-pointer ${
                    currentSectionIndex === 0
                      ? "opacity-0 pointer-events-none"
                      : "text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  المحور السابق
                </button>

                <button
                  onClick={handleNext}
                  disabled={!allCurrentAnswered || isTransitioning || isSubmitting}
                  className={`px-8 py-3 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    allCurrentAnswered && !isSubmitting
                      ? "bg-primary hover:bg-primary/95"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting && <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
                  {isLastSection ? "إنهاء وإرسال التقييم" : "المحور التالي"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
