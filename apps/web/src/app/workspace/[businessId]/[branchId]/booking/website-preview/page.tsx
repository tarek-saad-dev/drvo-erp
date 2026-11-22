import {notFound} from "next/navigation";
import WebsiteBookingPreviewClient from "./website-preview-client";

export const dynamic="force-dynamic";
// Private operator-only website journey. NOT /book, not public Customer auth.
export const metadata={title:"Website Booking · Private QA | DRVO ERP",robots:{index:false,follow:false}};

export default async function WebsiteBookingPreviewPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_BOOKING_WEB_ENABLED!=="YES"||
    process.env.DRVO_CUSTOMERS_WEB_ENABLED!=="YES"||
    process.env.DRVO_CATALOG_WEB_ENABLED!=="YES"||
    process.env.DRVO_WEBSITE_BOOKING_PREVIEW_WEB_ENABLED!=="YES")
   notFound();
 const {businessId,branchId}=await params;
 return <WebsiteBookingPreviewClient businessId={businessId} branchId={branchId}/>;
}
