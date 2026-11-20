import {notFound} from "next/navigation";
import PurchasingClient from "./purchasing-client";

export const dynamic="force-dynamic";
export default async function PurchasingPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_PURCHASING_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <PurchasingClient businessId={businessId} branchId={branchId}/>;
}
