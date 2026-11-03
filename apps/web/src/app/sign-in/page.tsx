import { notFound } from "next/navigation";
import SignInClient from "./sign-in-client";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  // Deliberately OFF until verified Owner onboarding and K5 threat-model
  // controls have been signed off. Not a substitute for API authorization.
  if (process.env.DRVO_K5_WEB_ENABLED !== "YES") notFound();
  return <SignInClient />;
}
