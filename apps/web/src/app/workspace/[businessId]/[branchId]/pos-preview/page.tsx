import { notFound } from "next/navigation";
import PosPreviewClient from "./pos-preview-client";
export const dynamic = "force-dynamic";

export default async function PosPreviewPage({ params,searchParams }: {
  params: Promise<{businessId:string;branchId:string}>;
  searchParams:Promise<{offeringId?:string|string[]}>;
}) {
  if (process.env.DRVO_K5_WEB_ENABLED !== "YES" ||
      process.env.DRVO_CATALOG_WEB_ENABLED !== "YES" ||
      process.env.DRVO_POS_PREVIEW_WEB_ENABLED !== "YES") notFound();
  const {businessId,branchId} = await params;
  const query=await searchParams;
  const requestedOfferingId=typeof query.offeringId==="string"?query.offeringId:null;
  return <PosPreviewClient businessId={businessId} branchId={branchId}
    draftsEnabled={process.env.DRVO_POS_DRAFTS_WEB_ENABLED==="YES"}
    initialOfferingId={requestedOfferingId}/>;
}
