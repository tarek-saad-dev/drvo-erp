import {notFound} from "next/navigation";
import TreasuryClient from "./treasury-client";

export const dynamic="force-dynamic";
export default async function TreasuryPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_TREASURY_COUNTS_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <TreasuryClient businessId={businessId} branchId={branchId}/>;
}
