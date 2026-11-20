import {notFound} from "next/navigation";
import LoyaltyClient from "./loyalty-client";
export const dynamic="force-dynamic";
export default async function LoyaltyPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_LOYALTY_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <LoyaltyClient businessId={businessId} branchId={branchId}/>;
}
