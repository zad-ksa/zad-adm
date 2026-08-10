import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PublicPageLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  
  if (session) {
    if (session.userType === "CHARITY_USER") {
      redirect("/charity-client");
    } else {
      redirect("/main");
    }
  }

  return <>{children}</>;
}
