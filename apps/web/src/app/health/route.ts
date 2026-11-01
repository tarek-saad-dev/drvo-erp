export const dynamic = "force-dynamic";

/** HTTP liveness only; not database or SaaS readiness. */
export function GET(): Response {
  return Response.json({
    status: "ok",
    service: "drvo-web",
    mode: "scaffold",
  });
}
