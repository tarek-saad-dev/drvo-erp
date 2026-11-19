import {notFound} from "next/navigation";
import QueueClient from "./queue-client";

export const dynamic="force-dynamic";
export default async function QueuePage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_QUEUE_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <QueueClient businessId={businessId} branchId={branchId}/>;
}
