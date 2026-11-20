import {notFound} from "next/navigation";
import FollowUpClient from "./follow-up-client";
export const dynamic="force-dynamic";
export default async function FollowUpPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_CUSTOMERS_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <FollowUpClient businessId={businessId} branchId={branchId}/>;
}
