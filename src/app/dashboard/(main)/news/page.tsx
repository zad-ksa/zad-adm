import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getCharities } from "@/app/actions/charity";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import NewsFilterClient from "./NewsFilterClient";


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "آخر الأخبار والإنجازات | زاد التنموية",
  description: "عرض وتصفية آخر أخبار وإنجازات الجمعيات المتعاقد معها",
};

const getCachedNews = async () => {
    return await prisma.news.findMany({
      orderBy: { date: "desc" },
    });
  };

export default async function NewsDashboard() {
  const charities = await getCharities();
  const session = await getSession();

  // Fetch news from the database
  const dbNewsItems = await getCachedNews();

  const formattedDbNews = dbNewsItems.map((news) => {
    const charity = charities.find((c) => c.name.trim().toLowerCase() === news.charityName.trim().toLowerCase());
    const createdDate = new Date(news.date);
    return {
      id: news.id,
      charityId: charity?.id || "unknown",
      charityName: news.charityName,
      title: news.title,
      category: news.category,
      description: news.description || "",
      rawDate: createdDate.toISOString(),
      date: createdDate.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    };
  });

  return (
    <NewsFilterClient charities={charities} initialNewsItems={formattedDbNews} session={session} />
  );
}
