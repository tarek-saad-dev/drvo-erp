import {notFound} from "next/navigation";
import SalonOverview from "./salon-overview-client";
export const dynamic="force-dynamic";
export const metadata={title:"لوحة تشغيل الصالون الخاصة | DRVO ERP",robots:{index:false,follow:false}};
export default async function SalonOverviewPage({params}:{
  params:Promise<{businessId:string;branchId:string}>;
}){
  if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
     process.env.DRVO_BOOKING_WEB_ENABLED!=="YES"||
     process.env.DRVO_CUSTOMERS_WEB_ENABLED!=="YES"||
     process.env.DRVO_CATALOG_WEB_ENABLED!=="YES")notFound();
  const {businessId,branchId}=await params;
  return <SalonOverview businessId={businessId} branchId={branchId}
    draftsAvailable={process.env.DRVO_POS_DRAFTS_WEB_ENABLED==="YES" &&
      process.env.DRVO_POS_PREVIEW_WEB_ENABLED==="YES"}/>;
}
