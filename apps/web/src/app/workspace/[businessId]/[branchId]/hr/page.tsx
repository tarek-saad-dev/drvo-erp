import {notFound} from "next/navigation";
import HrClient from "./hr-client";
export const dynamic="force-dynamic";
export default async function HrPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_HR_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <HrClient businessId={businessId} branchId={branchId}/>;
}
