import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID, createHash } from "node:crypto";
import type { PrismaClient } from "@flare/db";
import type { AuthTokens, LoginInput, RegisterInput } from "@flare/shared";
import { PRISMA } from "../prisma/prisma.module";
import { ApiException } from "../common/api-exception";
import { hashPassword, verifyPassword } from "./password";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthTokens> {
    const existing = await this.prisma.account.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ApiException("STATE_CONFLICT", "An account with this email already exists.");
    }

    const account = await this.prisma.account.create({
      data: { email: input.email, passwordHash: hashPassword(input.password) },
    });
    const player = await this.prisma.playerProfile.create({
      data: { accountId: account.id, displayName: input.displayName, status: "ACTIVE" },
    });

    return this.issueTokens(account.id, account.email, player.id);
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const account = await this.prisma.account.findUnique({ where: { email: input.email } });
    if (!account || !verifyPassword(input.password, account.passwordHash)) {
      throw new ApiException("AUTHENTICATION_REQUIRED", "Invalid email or password.");
    }
    const player = await this.prisma.playerProfile.findFirst({ where: { accountId: account.id } });
    return this.issueTokens(account.id, account.email, player?.id ?? null);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new ApiException("AUTHENTICATION_REQUIRED", "Refresh token is invalid or expired.");
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: stored.accountId } });
    const player = await this.prisma.playerProfile.findFirst({ where: { accountId: account.id } });
    return this.issueTokens(account.id, account.email, player?.id ?? null);
  }

  private async issueTokens(accountId: string, email: string, playerId: string | null): Promise<AuthTokens> {
    const accessToken = this.jwt.sign(
      { sub: accountId, email, playerId },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
        expiresIn: ACCESS_TTL_SECONDS,
      },
    );

    const refreshToken = randomUUID() + randomUUID();
    await this.prisma.refreshToken.create({
      data: {
        accountId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
