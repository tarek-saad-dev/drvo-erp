import {notFound} from "next/navigation";
import InventoryClient from "./inventory-client";

export const dynamic="force-dynamic";

export default async function InventoryPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_INVENTORY_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <InventoryClient businessId={businessId} branchId={branchId}/>;
}
