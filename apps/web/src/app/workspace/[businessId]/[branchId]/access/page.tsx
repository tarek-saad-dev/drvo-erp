import { notFound } from "next/navigation";
import AccessClient from "./access-client";

export const dynamic = "force-dynamic";

export default async function AccessPage({
  params,
}: {
  params: Promise<{ businessId: string; branchId: string }>;
}) {
  if (process.env.DRVO_K5_WEB_ENABLED !== "YES") notFound();
  const { businessId, branchId } = await params;
  return <AccessClient businessId={businessId} branchId={branchId} />;
}
