import {notFound} from "next/navigation";
import OperationsClient from "./operations-client";

export const dynamic="force-dynamic";
export default async function OperationsPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_OPERATIONS_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <OperationsClient businessId={businessId} branchId={branchId}/>;
}
