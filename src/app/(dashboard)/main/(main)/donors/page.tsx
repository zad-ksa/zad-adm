import type { Metadata } from "next";
import { requireDonorViewer } from "@/lib/donorScope";
import { loadDonorList } from "./donorData";
import DonorOrgsClient from "./DonorOrgsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "الجهات المانحة" };

export default async function DonorsPage() {
  const viewer = await requireDonorViewer();
  const { orgs, pairs } = await loadDonorList(viewer, "FOUNDATION");

  return (
    <DonorOrgsClient
      charities={viewer.charities}
      unrestricted={viewer.unrestricted}
      orgs={orgs}
      pairs={pairs}
    />
  );
}
