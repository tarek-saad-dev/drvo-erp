import { notFound } from "next/navigation";
import PosPreviewClient from "./pos-preview-client";
export const dynamic = "force-dynamic";

export default async function PosPreviewPage({ params }: {
  params: Promise<{businessId:string;branchId:string}>;
}) {
  if (process.env.DRVO_K5_WEB_ENABLED !== "YES" ||
      process.env.DRVO_CATALOG_WEB_ENABLED !== "YES" ||
      process.env.DRVO_POS_PREVIEW_WEB_ENABLED !== "YES") notFound();
  const {businessId,branchId} = await params;
  return <PosPreviewClient businessId={businessId} branchId={branchId}/>;
}
