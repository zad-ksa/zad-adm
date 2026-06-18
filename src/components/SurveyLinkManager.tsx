"use client";

import { useState, useEffect } from "react";

export default function SurveyLinkManager({ charityName, surveyType }: { charityName: string, surveyType: "READINESS" | "HEXAGONAL" }) {
  const [activeLink, setActiveLink] = useState<{ id: string; isActive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchLink = async () => {
    try {
      const res = await fetch(`/api/survey-links?charityName=${encodeURIComponent(charityName)}&surveyType=${surveyType}`);
      if (res.ok) {
        const data = await res.json();
        setActiveLink(data); // data could be null if no active link
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLink();
  }, [charityName, surveyType]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/survey-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charityName, surveyType }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveLink(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleActive = async () => {
    if (!activeLink) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/survey-links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeLink.id, isActive: !activeLink.isActive }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveLink(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!activeLink) return;
    const origin = window.location.origin;
    const path = surveyType === "READINESS" ? "/survey" : "/hexagonal";
    const url = `${origin}${path}?token=${activeLink.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="animate-pulse bg-slate-100 h-24 rounded-2xl w-full mb-8 border border-slate-200"></div>;
  }

  const title = surveyType === "READINESS" ? "رابط استبيان الجاهزية المخصص للجمعية" : "رابط التحليل السداسي المخصص للجمعية";

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-6 rounded-full bg-blue-500 inline-block"></span>
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-1">قم بإنشاء رابط مخصص وإرساله للموظفين. عند فتحهم للرابط سيتم تعبئة اسم الجمعية تلقائياً ولا يمكنهم تغييره.</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2 px-4 rounded-xl text-sm transition-colors flex items-center gap-2"
        >
          {generating ? "جاري..." : "إنشاء رابط جديد"}
          {!generating && (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          )}
        </button>
      </div>

      {activeLink && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${activeLink.isActive ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${activeLink.isActive ? "bg-emerald-500" : "bg-rose-500"}`}></div>
            <div>
              <p className={`font-bold text-sm ${activeLink.isActive ? "text-emerald-800" : "text-rose-800"}`}>
                الرابط الحالي {activeLink.isActive ? "مفعل (يمكن للجميع استخدامه)" : "مغلق (لا يمكن استخدامه)"}
              </p>
              <p className={`text-xs ${activeLink.isActive ? "text-emerald-600/70" : "text-rose-600/70"}`}>
                معرف الرابط: <span className="font-mono bg-white/50 px-1 rounded">{activeLink.id.split('-')[0]}...</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleActive}
              disabled={generating}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeLink.isActive 
                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200" 
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              }`}
            >
              {activeLink.isActive ? "إغلاق الرابط" : "تفعيل الرابط"}
            </button>
            {activeLink.isActive && (
              <button
                onClick={handleCopy}
                className="bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
              >
                {copied ? "تم النسخ!" : "نسخ الرابط"}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
