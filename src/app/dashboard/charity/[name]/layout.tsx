import Header from "@/components/Header";
import { ReactNode } from "react";
import CharitySidebar from "./CharitySidebar";

export default async function CharityLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      <Header title={decodedName} />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 py-8 relative">
        <CharitySidebar charityName={decodedName} />

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
