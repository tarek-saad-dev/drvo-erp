import { notFound } from "next/navigation";
import BookingClient from "./booking-client";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: { params: Promise<{businessId:string;branchId:string}> }) {
  // Both private workspace and Booking must be explicitly enabled server-side.
  // Public auth and all domain feature flags remain OFF until K5 approval.
  if (process.env.DRVO_K5_WEB_ENABLED !== "YES" ||
      process.env.DRVO_BOOKING_WEB_ENABLED !== "YES") notFound();
  const {businessId,branchId} = await params;
  return <BookingClient businessId={businessId} branchId={branchId}
    posWebEnabled={process.env.DRVO_POS_PREVIEW_WEB_ENABLED==="YES" &&
      process.env.DRVO_CATALOG_WEB_ENABLED==="YES"} />;
}
