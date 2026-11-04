import { notFound } from "next/navigation";
import WorkspaceHomeClient from "./workspace-home-client";

export const dynamic = "force-dynamic";

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ businessId: string; branchId: string }>;
}) {
  if (process.env.DRVO_K5_WEB_ENABLED !== "YES") notFound();
  const { businessId, branchId } = await params;
  return <WorkspaceHomeClient businessId={businessId} branchId={branchId} />;
}
