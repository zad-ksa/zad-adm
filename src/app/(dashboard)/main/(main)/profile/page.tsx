import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/main");
  }

  return <ProfileClient session={session} />;
}
