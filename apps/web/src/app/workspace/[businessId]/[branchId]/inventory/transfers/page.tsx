import {notFound} from "next/navigation";
import TransfersClient from "./transfers-client";

export const dynamic="force-dynamic";

export default async function InventoryTransfersPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_INVENTORY_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <TransfersClient businessId={businessId} branchId={branchId}/>;
}
