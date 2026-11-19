import { notFound } from "next/navigation";
import WorkspaceHomeClient from "./workspace-home-client";

export const dynamic = "force-dynamic";

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ businessId: string; branchId: string }>;
}) {
  if (process.env.DRVO_K5_WEB_ENABLED !== "YES") notFound();
  const { businessId, branchId } = await params;
  return <WorkspaceHomeClient businessId={businessId} branchId={branchId}
    hrWebEnabled={process.env.DRVO_HR_WEB_ENABLED==="YES"}
    attendanceWebEnabled={process.env.DRVO_HR_WEB_ENABLED==="YES"&&
      process.env.DRVO_HR_ATTENDANCE_WEB_ENABLED==="YES"}
    expensesWebEnabled={process.env.DRVO_EXPENSES_WEB_ENABLED==="YES"}
    treasuryWebEnabled={process.env.DRVO_TREASURY_COUNTS_WEB_ENABLED==="YES"}
    inventoryWebEnabled={process.env.DRVO_INVENTORY_WEB_ENABLED==="YES"}
    reportsWebEnabled={process.env.DRVO_REPORTS_WEB_ENABLED==="YES"}
    salonWebEnabled={process.env.DRVO_BOOKING_WEB_ENABLED==="YES"&&
      process.env.DRVO_CUSTOMERS_WEB_ENABLED==="YES"&&
      process.env.DRVO_CATALOG_WEB_ENABLED==="YES"} />;
}
