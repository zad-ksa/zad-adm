import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireDonorViewer } from "@/lib/donorScope";
import { loadDonorDetail } from "../donorData";
import DonorDetail from "../DonorDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const viewer = await requireDonorViewer();
  const detail = await loadDonorDetail(viewer, id);
  return { title: detail ? `${detail.row.name} | الجهات المانحة` : "الجهات المانحة" };
}

export default async function DonorOrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireDonorViewer();
  const detail = await loadDonorDetail(viewer, id);
  if (!detail) notFound();

  return (
    <DonorDetail
      org={detail.row}
      kind={detail.kind}
      charities={viewer.charities}
      accounts={detail.accounts}
      grants={detail.grants}
    />
  );
}
