import { notFound } from "next/navigation";
import ChangePasswordClient from "./change-password-client";

export const dynamic = "force-dynamic";

export default function ChangePasswordPage() {
  if (process.env.DRVO_K5_WEB_ENABLED !== "YES") notFound();
  return <ChangePasswordClient />;
}
