import {notFound} from "next/navigation";
import CustomersClient from "./customers-client";
export const dynamic="force-dynamic";
export default async function CustomersPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_CUSTOMERS_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <CustomersClient businessId={businessId} branchId={branchId}/>;
}
