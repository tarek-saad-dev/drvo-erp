import { notFound } from "next/navigation";
import type { Metadata } from "next";
import VerifyEmailClient from "./verify-email-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "تأكيد البريد الإلكتروني | DRVO ERP",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  // Never enable this UI until the one-time atomic SQL consumption endpoint,
  // operator-approved Owner flow, invitation policy and rate limits ship.
  // Both flags must be set explicitly. Neither is configured on Staging.
  if (process.env.DRVO_K5_WEB_ENABLED !== "YES" ||
      process.env.DRVO_K5_VERIFY_UI_ENABLED !== "YES") notFound();
  return <VerifyEmailClient />;
}
