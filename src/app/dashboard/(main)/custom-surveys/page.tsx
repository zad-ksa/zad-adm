"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, Eye, Copy, CheckCircle } from "lucide-react";

interface Survey {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    responses: number;
  };
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/custom-surveys");
      const data = await res.json();
      setSurveys(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/custom-surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "استبيان جديد",
          introText: "شركاؤنا في العطاء، نرحب برغبتكم في الانضمام لأسرة زاد التنموية. يهدف هذا الاستبيان لمساعدتنا في فهم واقع جمعيتكم بدقة، لنتمكن من تصميم رحلة تمكين مخصصة نحو تحقيق أثر مستدام."
        })
      });
      if (res.ok) {
        fetchSurveys();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاستبيان؟")) return;
    try {
      const res = await fetch(`/api/custom-surveys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSurveys(surveys.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/custom-surveys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        setSurveys(surveys.map(s => s.id === id ? { ...s, isActive: !currentStatus } : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/custom-survey/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">إدارة الاستبيانات المخصصة</h1>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة الاستبيانات المخصصة</h1>
          <p className="text-slate-500 mt-1">قم بإنشاء وتعديل الاستبيانات ومتابعة الردود</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {isCreating ? (
            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Plus className="w-5 h-5" />
          )}
          إنشاء استبيان جديد
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">لا توجد استبيانات حالياً</h3>
          <p className="text-slate-500 mb-6">قم بإنشاء استبيانك المخصص الأول لتبدأ في جمع الردود.</p>
          <button
            onClick={handleCreate}
            className="bg-primary/10 text-primary font-bold px-6 py-2.5 rounded-xl hover:bg-primary hover:text-white transition-all"
          >
            إنشاء استبيان
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative group flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-slate-800 leading-tight">{survey.title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${survey.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                  {survey.isActive ? 'فعّال' : 'غير فعّال'}
                </span>
              </div>
              
              <div className="text-sm text-slate-500 mb-6 flex-1">
                تاريخ الإنشاء: {new Date(survey.createdAt).toLocaleDateString('ar-SA')}
              </div>

              <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-center flex-1 border-l border-slate-200">
                  <span className="block text-2xl font-black text-primary">{survey._count.responses}</span>
                  <span className="text-xs text-slate-500 font-medium">ردود</span>
                </div>
                <div className="flex-1 flex justify-center">
                  <button
                    onClick={() => handleToggleActive(survey.id, survey.isActive)}
                    className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                      survey.isActive 
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    }`}
                  >
                    {survey.isActive ? "تعطيل الرابط" : "تفعيل الرابط"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <Link 
                  href={`/dashboard/custom-surveys/${survey.id}/edit`}
                  className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Edit2 className="w-4 h-4" /> تعديل
                </Link>
                <Link 
                  href={`/dashboard/custom-surveys/${survey.id}/results`}
                  className="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Eye className="w-4 h-4" /> النتائج
                </Link>
              </div>

              {/* Top Right Actions */}
              <div className="absolute top-4 left-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => copyLink(survey.id)}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-primary hover:border-primary/30 shadow-sm"
                  title="نسخ الرابط"
                >
                  {copiedId === survey.id ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(survey.id)}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-500 hover:border-red-200 shadow-sm"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
