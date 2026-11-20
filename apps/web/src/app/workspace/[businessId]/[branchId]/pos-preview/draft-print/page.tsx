import {notFound} from "next/navigation";
import CashierDraftPrintView from "../cashier-draft-print-view";
export const dynamic="force-dynamic";

export default async function PosDraftPrintPage({params,searchParams}:{
 params:Promise<{businessId:string;branchId:string}>;
 searchParams:Promise<{draftId?:string|string[]}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_CATALOG_WEB_ENABLED!=="YES"||
    process.env.DRVO_POS_PREVIEW_WEB_ENABLED!=="YES"||
    process.env.DRVO_POS_DRAFTS_WEB_ENABLED!=="YES"||
    process.env.DRVO_POS_RICH_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 const query=await searchParams;
 const draftId=typeof query.draftId==="string"?query.draftId.trim():"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftId))
  notFound();
 const apiRoot="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+
  encodeURIComponent(branchId);
 const draftApi=apiRoot+"/pos-drafts";
 return <main className="k5-admin" dir="rtl">
  <CashierDraftPrintView apiRoot={apiRoot} draftApi={draftApi} draftId={draftId}/>
 </main>;
}
