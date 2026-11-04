// The bearer credential must never be placed in an HTTP URL, localStorage,
// sessionStorage, cookies, React state, telemetry or rendered markup.
export type VerificationPurpose = "OWNER_BOOTSTRAP" | "ACCOUNT_INVITE";
export type VerificationLink = { token: string; purpose: VerificationPurpose };

export function parseVerificationFragment(fragment: string): VerificationLink | null {
  if (typeof fragment !== "string" || !fragment.startsWith("#") ||
      fragment.length > 120 || fragment.includes("%")) return null;
  const params = new URLSearchParams(fragment.slice(1));
  if (Array.from(params.keys()).length !== 2 ||
      !params.has("token") || !params.has("purpose")) return null;
  const token = params.get("token");
  const purpose = params.get("purpose");
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token) ||
      (purpose !== "OWNER_BOOTSTRAP" && purpose !== "ACCOUNT_INVITE")) return null;
  return { token, purpose };
}
