import {notFound} from "next/navigation";
import ReportsClient from "./reports-client";
export const dynamic="force-dynamic";
export default async function ReportsPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_REPORTS_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <ReportsClient businessId={businessId} branchId={branchId}/>;
}
