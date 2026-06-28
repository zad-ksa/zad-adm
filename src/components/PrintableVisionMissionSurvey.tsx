import React from "react";

interface PrintableSurveyProps {
  charityName: string;
  charityLogo?: string | null;
  customQuestions: {
    visionQ4: string;
    missionQ4?: string;
    missionQ5: string;
  };
}

export default function PrintableVisionMissionSurvey({
  charityName,
  charityLogo,
  customQuestions,
}: PrintableSurveyProps) {
  return (
    <div className="bg-white text-black p-8 text-sm w-full" dir="rtl">
      {/* Cover / Header Section */}
      <div className="flex flex-col items-center justify-center text-center space-y-6 break-after-page min-h-[80vh] pt-12">
        <div className="flex items-center justify-center gap-8 mb-4">
          {charityLogo && (
            <img src={charityLogo} alt="Charity Logo" className="h-24 w-auto object-contain" />
          )}
          <div className="h-16 w-px bg-black hidden sm:block"></div>
          <img src="/logo-full.svg" alt="Zad Logo" className="h-16 w-auto object-contain" />
        </div>
        <h1 className="text-3xl font-bold mt-8">استبيان الرؤية والرسالة والأثر</h1>
        <div className="border-2 border-black px-8 py-3 font-bold text-xl inline-block mt-4">
          {charityName}
        </div>
        <p className="max-w-md mx-auto text-gray-700 mt-8 leading-relaxed text-base">
          يسعى هذا الاستبيان لجمع الرؤى والتطلعات من منسوبي الجمعية لصياغة رسالة ورؤية واضحتين تحددان النطاق والأثر المراد إحداثه.
        </p>
      </div>

      {/* Section 1: Categories */}
      <div className="break-after-page space-y-6 pt-8">
        <h2 className="text-xl font-bold border-b-2 border-black pb-2">المحور الأول: الفئات المستهدفة والأثر المراد إحداثه</h2>
        <p className="text-sm">حدد أهم 3 فئات تخدمها الجمعية، صف كل فئة، وحدد الأثر الذي تسعى الجمعية لتحقيقه معهم.</p>
        <table className="w-full border-collapse border border-black text-right mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-3 w-12 text-center">#</th>
              <th className="border border-black p-3 w-1/4">اسم الفئة</th>
              <th className="border border-black p-3 w-1/3">وصف الفئة</th>
              <th className="border border-black p-3">الأثر المراد إحداثه</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((num) => (
              <tr key={num}>
                <td className="border border-black p-3 text-center font-bold">{num}</td>
                <td className="border border-black p-3 h-24 align-top"></td>
                <td className="border border-black p-3 h-24 align-top"></td>
                <td className="border border-black p-3 h-24 align-top"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Section 2: Vision */}
      <div className="break-after-page space-y-6 pt-8">
        <h2 className="text-xl font-bold border-b-2 border-black pb-2">المحور الثاني: رؤية الجمعية</h2>
        
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="font-bold">1. حين نتخيّل جمعيتنا في عام 2030، ما أول صورة تخطر ببالنا؟ نصفها في سطر أو سطرين.</label>
            <div className="border border-black h-16 w-full"></div>
          </div>
          
          <div className="space-y-2">
            <label className="font-bold">2. بماذا نتمنى أن تشتهر جمعيتنا في ذلك الوقت، وما الذي يجعلها مختلفة عن غيرها؟</label>
            <div className="border border-black h-16 w-full"></div>
          </div>
          
          <div className="space-y-2">
            <label className="font-bold">{customQuestions.visionQ4}</label>
            <div className="border border-black h-16 w-full"></div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">4. ما أهم ثلاثة أشياء نتمنى أن تقدّمها الجمعية لمستفيديها؟</label>
            <div className="space-y-2 pl-4">
              <div className="flex gap-2 items-center"><span className="w-4">1.</span><div className="border-b border-black h-6 w-full"></div></div>
              <div className="flex gap-2 items-center"><span className="w-4">2.</span><div className="border-b border-black h-6 w-full"></div></div>
              <div className="flex gap-2 items-center"><span className="w-4">3.</span><div className="border-b border-black h-6 w-full"></div></div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">5. ما التغيير الحقيقي الذي نأمل أن تُحدثه الجمعية في حياة مستفيديها؟</label>
            <div className="border border-black h-16 w-full"></div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">6. ما مستوى الطموح الذي نتمناه لحجم أثر الجمعية مستقبلاً؟</label>
            <div className="flex flex-wrap gap-4 mt-2">
              {["التميّز في نطاق الحي/المدينة", "الريادة على مستوى المنطقة", "حضور مؤثّر على المستوى الوطني", "امتداد يتجاوز حدود الوطن"].map(opt => (
                <div key={opt} className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-black rounded-full"></div>
                  <span>{opt}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">7. ماذا نتمنى أن يقول الناس عن جمعيتنا حين يذكرونها بعد سنوات؟</label>
            <div className="border border-black h-16 w-full"></div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">8. ما القيم أو المبادئ التي يجب ألّا تتنازل عنها الجمعية مهما تغيّرت الظروف؟</label>
            <div className="border border-black h-16 w-full"></div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">9. ما الأمور التي نتمنى أن ترفض الجمعية القيام بها مهما كانت المغريات؟</label>
            <div className="border border-black h-16 w-full"></div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">10. ما الشعور الذي نتمنى أن يحمله العاملون والمتطوعون تجاه عملهم في الجمعية؟</label>
            <div className="flex flex-wrap gap-4 mt-2 mb-2">
              {["الفخر", "الانتماء", "الإلهام", "الأمان", "النمو والتطور"].map(opt => (
                <div key={opt} className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-black rounded-sm"></div>
                  <span>{opt}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-black rounded-sm"></div>
                <span>أخرى: .......................</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">11. لو كان بأيدينا أن نمنح الجمعية أمنية واحدة لمستقبلها، فماذا تكون؟</label>
            <div className="border border-black h-16 w-full"></div>
          </div>
        </div>
      </div>

      {/* Section 3: Mission */}
      <div className="space-y-6 pt-8 break-before-page">
        <h2 className="text-xl font-bold border-b-2 border-black pb-2">المحور الثالث: تحديد رسالة الجمعية</h2>
        
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="font-bold">1. لماذا وُجدت هذه الجمعية؟ (ما المشكلة الأساسية التي نحاول حلها؟)</label>
            <div className="border border-black h-16 w-full"></div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">2. ما هو مجال عملنا الرئيسي الذي نركز عليه أكثر من غيره؟</label>
            <div className="border border-black h-16 w-full"></div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">3. من هي الفئة الأساسية والأهم التي نخدمها بشكل مباشر؟</label>
            <div className="border border-black h-16 w-full"></div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">{customQuestions.missionQ4 || "4. ما النتائج المحددة التي نساعد مستفيدينا على تحقيقها؟ اذكرها كـ (معارف جديدة / مهارات / تغيّر سلوكي)."}</label>
            <div className="border border-black h-16 w-full"></div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">{customQuestions.missionQ5}</label>
            <div className="border border-black h-16 w-full"></div>
          </div>

          <div className="space-y-2">
            <label className="font-bold">6. ما النطاق الجغرافي الذي تعمل فيه الجمعية وتخدم مستفيديها حالياً؟</label>
            <div className="flex flex-wrap gap-4 mt-2">
              {["حي/مدينة", "منطقة", "على مستوى الوطن", "خارج الوطن"].map(opt => (
                <div key={opt} className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-black rounded-full"></div>
                  <span>{opt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
