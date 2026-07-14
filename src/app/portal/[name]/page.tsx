import { redirect } from "next/navigation";

export default async function PortalRootRedirectPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  redirect(`/portal/${name}/services`);
}
