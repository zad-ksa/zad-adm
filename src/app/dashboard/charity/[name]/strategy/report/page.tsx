import { getPerformanceMetric } from "@/app/actions/performance";
import StrategicReportClient from "./StrategicReportClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} - تقرير الأداء الاستراتيجي | زاد التنموية`,
  };
}

export default async function StrategicReportPage({ params, searchParams }: { params: Promise<{ name: string }>, searchParams: Promise<{ year?: string, quarter?: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  
  const searchParamsObj = await searchParams;
  const year = searchParamsObj?.year ? parseInt(searchParamsObj.year) : new Date().getFullYear();
  const quarter = searchParamsObj?.quarter || "Q1";

  const metric = await getPerformanceMetric(decodedName, year);

  return (
    <StrategicReportClient 
      charityName={decodedName} 
      year={year} 
      quarter={quarter}
      initialData={metric?.data as any || null} 
    />
  );
}
