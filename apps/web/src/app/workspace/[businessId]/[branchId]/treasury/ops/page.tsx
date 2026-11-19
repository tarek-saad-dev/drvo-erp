import {notFound} from "next/navigation";
import TreasuryOpsClient from "../treasury-ops-client";

export const dynamic="force-dynamic";
export default async function TreasuryOpsPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_TREASURY_OPS_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <TreasuryOpsClient businessId={businessId} branchId={branchId}/>;
}
