import {notFound} from "next/navigation";
import OtherIncomeClient from "./other-income-client";

export const dynamic="force-dynamic";
export default async function OtherIncomePage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_OTHER_INCOME_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <OtherIncomeClient businessId={businessId} branchId={branchId}/>;
}
