import {notFound} from "next/navigation";
import AttendanceClient from "./attendance-client";

export const dynamic="force-dynamic";
export default async function AttendancePage({params}:{
 params:Promise<{businessId:string;branchId:string}>;
}){
 if(process.env.DRVO_K5_WEB_ENABLED!=="YES"||
    process.env.DRVO_HR_WEB_ENABLED!=="YES"||
    process.env.DRVO_HR_ATTENDANCE_WEB_ENABLED!=="YES")notFound();
 const {businessId,branchId}=await params;
 return <AttendanceClient businessId={businessId} branchId={branchId}/>;
}
