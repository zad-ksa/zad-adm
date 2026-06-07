import { prisma } from "@/lib/db";
import Link from "next/link";
import { surveyData } from "@/data/surveyData";
import ReadinessResultsClient from "./ReadinessResultsClient";
import SurveyLinkManager from "@/components/SurveyLinkManager";
import type { Metadata } from "next";
import { Award, AlertTriangle, Sparkles, ShieldAlert, Key, Rocket } from "@/components/Icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} - الاستراتيجية | زاد التنموية`,
  };
}

// Custom SVG Icons
const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-slate-300 mx-auto mb-4">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const ChartLineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const FileEditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-slate-300 mx-auto mb-4">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);



export default async function StrategySurveysPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // Fetch all responses and filter in JS to prevent trailing space mismatches
  const allResponses = await prisma.surveyResponse.findMany({
    orderBy: { createdAt: "desc" },
  });

  const responses = allResponses.filter(
    (res) => res.charityName.trim().toLowerCase() === decodedName.trim().toLowerCase()
  );

  const hasReadiness = responses.length > 0;





  return (
    <div className="space-y-12">
      <SurveyLinkManager charityName={decodedName} surveyType="READINESS" />

      {/* Section 1: Readiness Survey Results */}
      <div>
        <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
            <ChartLineIcon />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            نتائج استبيان الجاهزية للتخطيط الاستراتيجي
          </h2>
        </div>

        {hasReadiness ? (
          <ReadinessResultsClient responses={responses} />
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-100 shadow-sm">
            <FileEditIcon />
            <p className="font-bold">لم يقم أي مشارك بتعبئة استبيان الجاهزية للتخطيط الاستراتيجي لهذه الجمعية بعد.</p>
          </div>
        )}
      </div>


    </div>
  );
}
