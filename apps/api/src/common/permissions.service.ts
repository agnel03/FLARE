import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@flare/db";
import { MATCH_ROLE_PERMISSIONS, type MatchPermission } from "@flare/shared";
import { PRISMA } from "../prisma/prisma.module";
import { ApiException } from "./api-exception";

const MANAGING_ROLES = ["CAPTAIN", "MANAGER"] as const;

/**
 * FLARE's server-side authorization decision point. Implements the
 * decision flow documented in docs/PERMISSION_MATRIX.md: authenticate
 * (handled by JwtAuthGuard before this runs) → identify resource → load
 * resource ownership/context → resolve roles → resolve permission →
 * allow/deny. Never a frontend-only check; every privileged controller
 * method calls into here, never re-implements a check inline.
 *
 * Permission identifiers and role→permission grants live in
 * @flare/shared (packages/shared/src/permissions.ts) so the matrix
 * document, this enforcement code, and the automated tests all read from
 * one definition instead of three that can drift apart.
 */
@Injectable()
export class PermissionsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async assertCanManageTeam(accountId: string, teamId: string): Promise<void> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new ApiException("RESOURCE_NOT_FOUND", "Team was not found.");

    if (team.createdByAccountId === accountId) return;

    const membership = await this.activeManagingMembership(accountId, teamId);
    if (membership) return;

    throw new ApiException("FORBIDDEN", "You do not have permission to manage this team.");
  }

  /**
   * The core check: does `accountId` hold `permission` on `matchId`,
   * given the union of every match-scoped role they hold? The match
   * creator implicitly holds every MatchPermission and is not looked up
   * in MATCH_ROLE_PERMISSIONS (see that file's comment for why).
   */
  async assertMatchPermission(accountId: string, matchId: string, permission: MatchPermission): Promise<void> {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new ApiException("RESOURCE_NOT_FOUND", "Match was not found.");

    if (match.createdByAccountId === accountId) return;

    const [memberships, operator] = await Promise.all([
      this.prisma.teamMembership.findMany({
        where: {
          status: "ACTIVE",
          role: { in: [...MANAGING_ROLES] },
          teamId: { in: [match.homeTeamId, match.awayTeamId] },
          player: { accountId },
        },
      }),
      this.prisma.matchOperator.findUnique({
        where: { matchId_accountId: { matchId, accountId } },
      }),
    ]);

    const grantedByTeamRole = memberships.some((m) => {
      const grants = MATCH_ROLE_PERMISSIONS[m.role === "CAPTAIN" ? "TEAM_CAPTAIN" : "TEAM_MANAGER"];
      return (grants as readonly string[]).includes(permission);
    });
    if (grantedByTeamRole) return;

    if (operator) {
      const grants = MATCH_ROLE_PERMISSIONS[operator.role as "SCORER" | "OFFICIAL" | "ORGANIZER"];
      if ((grants as readonly string[]).includes(permission)) return;
    }

    throw new ApiException(
      "FORBIDDEN",
      `You do not have the ${permission} permission on this match.`,
    );
  }

  /**
   * MATCH_OPERATOR_LIST/GRANT/REVOKE are creator-only, full stop — not
   * granted to any delegated role (see @flare/shared's
   * OPERATOR_MANAGEMENT_PERMISSIONS comment: delegated authority is not
   * further delegable). This is intentionally a separate, stricter check
   * from assertMatchPermission rather than a table lookup that could
   * accidentally grant it to a future role.
   */
  async assertIsMatchCreator(accountId: string, matchId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new ApiException("RESOURCE_NOT_FOUND", "Match was not found.");
    if (match.createdByAccountId !== accountId) {
      throw new ApiException("FORBIDDEN", "Only the match creator can manage match operators.");
    }
  }

  private activeManagingMembership(accountId: string, teamId: string) {
    return this.prisma.teamMembership.findFirst({
      where: {
        teamId,
        status: "ACTIVE",
        role: { in: [...MANAGING_ROLES] },
        player: { accountId },
      },
    });
  }
}
