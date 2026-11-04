import { notFound } from "next/navigation";
import WorkspacesClient from "./workspaces-client";

export const dynamic = "force-dynamic";

export default function WorkspacesPage() {
  if (process.env.DRVO_K5_WEB_ENABLED !== "YES") notFound();
  return <WorkspacesClient />;
}
