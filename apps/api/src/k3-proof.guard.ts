import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { verify, type JwtPayload } from "jsonwebtoken";
import type { IncomingMessage } from "node:http";

export interface K3ActorProof {
  readonly accountId: string;
  readonly sessionVersion: number;
}

export type K3ProofRequest = IncomingMessage & { k3Actor?: K3ActorProof };

/**
 * CI/dev proof ONLY. JWT is signed by a test harness, not by a real login flow.
 * No production authentication, recovery, login, refresh or session issuer exists.
 * Token supplies ONLY a subject/session revision; tenant/business/branch never
 * derive from claims or client-sent headers.
 */
@Injectable()
export class K3ProofGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === "production" ||
        process.env.DRVO_K3_PROOF_ONLY !== "YES") {
      throw new UnauthorizedException();
    }
    const secret = process.env.K3_DEV_JWT_SECRET;
    if (!secret || Buffer.byteLength(secret, "utf8") < 48) {
      throw new UnauthorizedException();
    }

    const req = context.switchToHttp().getRequest<K3ProofRequest>();
    const auth = req.headers.authorization;
    const token = typeof auth === "string" && /^Bearer [^\s]+$/.test(auth)
      ? auth.slice(7)
      : null;
    if (!token) throw new UnauthorizedException();

    try {
      const decoded = verify(token, secret, {
        algorithms: ["HS256"],
        issuer: "drvo-k3-test-only",
        audience: "drvo-kernel-proof",
        maxAge: "5m",
      }) as JwtPayload;
      if (typeof decoded !== "object" ||
          typeof decoded.sub !== "string" ||
          !/^[0-9a-fA-F-]{36}$/.test(decoded.sub) ||
          !Number.isSafeInteger(decoded.sv) || decoded.sv < 1) {
        throw new UnauthorizedException();
      }
      req.k3Actor = { accountId: decoded.sub, sessionVersion: decoded.sv as number };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
