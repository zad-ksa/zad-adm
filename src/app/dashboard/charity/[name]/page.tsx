import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Link from "next/link";
import { surveyData } from "@/data/surveyData";

export const dynamic = "force-dynamic";

export default async function CharityGroupedReport({ params }: { params: { name: string } }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // Fetch all responses for this charity
  const responses = await prisma.surveyResponse.findMany({
    where: {
      charityName: {
        equals: decodedName,
        mode: "insensitive", // Case-insensitive matching
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (responses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">الجمعية غير موجودة</h1>
          <Link href="/dashboard" className="text-primary hover:underline">
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  const latestInfo = responses[0];
  const participantCount = responses.length;

  // Calculate overall average score percentage
  const totalPercentageSum = responses.reduce((acc, r) => acc + r.scorePercentage, 0);
  const overallAveragePercentage = Math.round(totalPercentageSum / participantCount);

  // Calculate average percentage per section (محور)
  const sectionAverages = surveyData.map((section, idx) => {
    let totalSecScore = 0;
    let maxSecScore = 0;

    section.questions.forEach((q) => {
      maxSecScore += Math.max(...q.options.map(o => o.score));
    });

    responses.forEach((res) => {
      const answers = res.answers as Record<string, string>;
      section.questions.forEach((q) => {
        const selectedOptionId = answers[q.id];
        const option = q.options.find(o => o.id === selectedOptionId);
        if (option) {
          totalSecScore += option.score;
        }
      });
    });

    const totalMaxSecScore = maxSecScore * participantCount;
    const averagePercentage = totalMaxSecScore > 0 ? Math.round((totalSecScore / totalMaxSecScore) * 100) : 0;

    return {
      index: idx + 1,
      title: section.title,
      averagePercentage,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center text-primary hover:underline font-bold mb-8 transition-colors">
          <span className="mr-2">← العودة للوحة التحكم</span>
        </Link>

        {/* Charity Summary Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-8 relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
           <div className="p-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 mb-2">{decodedName}</h1>
                  <p className="text-slate-500">التقرير المجمع بناءً على تقييمات {participantCount} مشارك من الجمعية</p>
                </div>
                
                <div className="mt-4 md:mt-0 text-center">
                  <div className="text-sm font-bold text-slate-500 mb-1">المتوسط العام للجاهزية</div>
                  <div className={`px-6 py-3 rounded-2xl text-2xl font-bold
                    ${
                      overallAveragePercentage >= 80 ? "bg-green-100 text-green-700" :
                      overallAveragePercentage >= 60 ? "bg-blue-100 text-blue-700" :
                      overallAveragePercentage >= 40 ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    }
                  `}>
                    {overallAveragePercentage}%
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                <div>
                  <div className="text-sm text-slate-400 mb-1">تاريخ التأسيس</div>
                  <div className="font-semibold text-slate-700">{latestInfo.establishmentDate}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">رقم التصريح</div>
                  <div className="font-semibold text-slate-700">{latestInfo.licenseNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">آخر نشاط</div>
                  <div className="font-semibold text-slate-700">
                    {new Date(latestInfo.createdAt).toLocaleDateString("ar-SA")}
                  </div>
                </div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Section Averages (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">تحليل متوسط الجاهزية للمحاور</h2>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
              {sectionAverages.map((sec) => (
                <div key={sec.index} className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-slate-800">{sec.index}. {sec.title}</span>
                    <span className={`
                      ${
                        sec.averagePercentage >= 80 ? "text-green-600" :
                        sec.averagePercentage >= 60 ? "text-blue-600" :
                        sec.averagePercentage >= 40 ? "text-orange-600" :
                        "text-red-600"
                      }
                    `}>{sec.averagePercentage}%</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500
                        ${
                          sec.averagePercentage >= 80 ? "bg-green-500" :
                          sec.averagePercentage >= 60 ? "bg-blue-500" :
                          sec.averagePercentage >= 40 ? "bg-orange-500" :
                          "bg-red-500"
                        }
                      `}
                      style={{ width: `${sec.averagePercentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Participant Submissions (1/3 width on desktop) */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">المشاركون ({participantCount})</h2>
            
            <div className="space-y-4">
              {responses.map((res) => (
                <Link
                  href={`/dashboard/${res.id}`}
                  key={res.id}
                  className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-primary hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-primary transition-colors">
                        {res.authorizedName}
                      </h3>
                      <p className="text-xs text-slate-500">{res.authorizedTitle}</p>
                    </div>
                    
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold
                      ${
                        res.scorePercentage >= 80 ? "bg-green-500/10 text-green-700" :
                        res.scorePercentage >= 60 ? "bg-blue-500/10 text-blue-700" :
                        res.scorePercentage >= 40 ? "bg-orange-500/10 text-orange-700" :
                        "bg-red-500/10 text-red-700"
                      }
                    `}>
                      {res.scorePercentage}%
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-400 flex justify-between items-center border-t border-slate-50 pt-3">
                    <span>
                      {new Date(res.createdAt).toLocaleDateString("ar-SA", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                    <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      عرض الإجابات ←
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
