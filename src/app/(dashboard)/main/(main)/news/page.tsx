import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getCharities } from "@/app/actions/charity";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import NewsFilterClient from "./NewsFilterClient";
import { getCategories } from "@/app/actions/categories";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";


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
  // None of the three depends on the other two, so they go out together. The
  // permission check still gates what is rendered — it just no longer forces
  // two round trips to ap-southeast-2 to queue behind each other.
  const [charities, session, dbNewsItems] = await Promise.all([
    getCharities(),
    getSession(),
    getCachedNews(),
  ]);

  if (!session || !hasPermission(session.role, session.permissions || [], "manage_news")) {
    redirect("/main");
  }

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

  const categories = await getCategories();

  return (
    <NewsFilterClient charities={charities} initialNewsItems={formattedDbNews} session={session} categories={categories} />
  );
}
