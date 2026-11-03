import { ServiceUnavailableException } from "@nestjs/common";
import { normalizeVerificationEmail, type ChallengePurpose } from "./verification-crypto";

// Single fixed, reviewed transactional email provider. No arbitrary HTTP URL,
// no provider configuration in frontend, no user-controlled HTML content.
const ENDPOINT = "https://api.resend.com/emails";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
type SafeEmailPurpose = Exclude<ChallengePurpose, "ACCOUNT_RECOVERY">;

export type VerificationNotice = {
  purpose: SafeEmailPurpose;
  email: string;
  token: string;
  challengeId: string;
};

function mailNotReady(): never {
  // No internal provider/secret information in HTTP errors.
  throw new ServiceUnavailableException("Verification email delivery unavailable");
}

export class VerificationMailer {
  async send(input: VerificationNotice): Promise<{ accepted: true }> {
    // Not connected to an HTTP route yet. Must remain OFF until the whole
    // challenge lifecycle and verified Owner approval path are implemented.
    if (process.env.DRVO_K5_MAIL_ENABLED !== "YES" ||
        process.env.DRVO_K5_MAIL_PROVIDER !== "resend") {
      mailNotReady();
    }

    const key = process.env.DRVO_K5_RESEND_API_KEY;
    const sender = process.env.DRVO_K5_FROM_EMAIL;
    const origin = process.env.DRVO_K5_ORIGIN;
    if (!key || !/^re_[A-Za-z0-9_]{12,}$/.test(key) ||
        !sender || !origin || !/^https:\/\/[a-zA-Z0-9.-]+$/.test(origin) ||
        !GUID.test(input.challengeId) || !TOKEN.test(input.token) ||
        (input.purpose !== "OWNER_BOOTSTRAP" && input.purpose !== "ACCOUNT_INVITE")) {
      mailNotReady();
    }

    let to: string, from: string;
    try {
      to = normalizeVerificationEmail(input.email);
      from = normalizeVerificationEmail(sender);
    } catch {
      mailNotReady();
    }
    const heading = input.purpose === "OWNER_BOOTSTRAP"
      ? "DRVO ERP — Verify your Owner email"
      : "DRVO ERP — Verify your invitation";
    // Put token in a hash fragment so it is NOT sent with normal HTTP URL
    // requests to the Next.js server. The eventual page must clear the hash
    // immediately and POST the token to a single-use, rate-limited API.
    const link = origin + "/verify-email#token=" + encodeURIComponent(input.token);
    const message = "A DRVO ERP verification was requested. Open this link only if " +
      "you expected it:\n" + link + "\n\nThis link is single-use and expires " +
      "according to your verification challenge. If you did not request this, ignore it.";

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          "Idempotency-Key": "drvo-k5d-" + input.challengeId.toLowerCase(),
        },
        body: JSON.stringify({ from, to: [to], subject: heading, text: message }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) mailNotReady();
      return { accepted: true };
    } catch {
      mailNotReady();
    }
  }
}
