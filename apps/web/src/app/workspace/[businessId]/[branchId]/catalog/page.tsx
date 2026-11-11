import { notFound } from "next/navigation";
import CatalogClient from "./catalog-client";

export const dynamic="force-dynamic";
export default async function CatalogPage({params}:{
  params:Promise<{businessId:string;branchId:string}>;
}) {
  // Separate Web + API gates: this URL is not discoverable on public staging.
  if (process.env.DRVO_K5_WEB_ENABLED!=="YES" ||
      process.env.DRVO_CATALOG_WEB_ENABLED!=="YES") notFound();
  const {businessId,branchId}=await params;
  return <CatalogClient businessId={businessId} branchId={branchId}/>;
}
