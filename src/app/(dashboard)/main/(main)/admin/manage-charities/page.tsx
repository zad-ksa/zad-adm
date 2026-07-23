import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import ManageCharitiesClient from "./ManageCharitiesClient";
import { getCharities } from "@/app/actions/charity";

export default async function ManageCharitiesPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const role = session.role || "";
  const perms = session.permissions || [];
  if (!hasPermission(role, perms, "manage_charities")) {
    redirect("/main/admin");
  }

  const charities = await getCharities();

  return (
    <ManageCharitiesClient initialCharities={charities} />
  );
}
