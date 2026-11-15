import {notFound} from "next/navigation";
import ExpensesClient from "./expenses-client";

export const dynamic="force-dynamic";
export default async function ExpensesPage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_EXPENSES_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <ExpensesClient businessId={businessId} branchId={branchId}/>;
}
