import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ApiException } from "../api-exception";
import type { AuthenticatedUser } from "@flare/shared";

export interface JwtAccessPayload {
  sub: string; // accountId
  email: string;
  playerId: string | null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers["authorization"];
    if (!header?.startsWith("Bearer ")) {
      throw new ApiException("AUTHENTICATION_REQUIRED", "Missing or invalid Authorization header.");
    }
    const token = header.slice("Bearer ".length);
    try {
      const payload = this.jwt.verify<JwtAccessPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
      });
      const user: AuthenticatedUser = {
        accountId: payload.sub,
        email: payload.email,
        playerId: payload.playerId,
      };
      req.user = user;
      return true;
    } catch {
      throw new ApiException("AUTHENTICATION_REQUIRED", "Invalid or expired access token.");
    }
  }
}
