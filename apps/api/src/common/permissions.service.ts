import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@flare/db";
import { PRISMA } from "../prisma/prisma.module";
import { ApiException } from "./api-exception";

const MANAGING_ROLES = ["CAPTAIN", "MANAGER"] as const;

/**
 * Closes the IDOR/BOLA gap flagged in the v2 spec: "any authenticated
 * user can score any live match". Authorization is real, server-side,
 * and resource-scoped — never a frontend-only check.
 *
 * Current rule (documented scope — see docs/STATUS.md): a user may manage
 * a team, or operate a match, if they created that resource OR hold an
 * ACTIVE CAPTAIN/MANAGER membership on the relevant team(s). This is a
 * real, testable authorization boundary, not yet the full
 * organization/competition/official RBAC model the spec ultimately
 * describes (platform admin, competition officials, organization roles
 * are not implemented yet).
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

  async assertCanOperateMatch(accountId: string, matchId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new ApiException("RESOURCE_NOT_FOUND", "Match was not found.");

    if (match.createdByAccountId === accountId) return;

    const membership = await this.prisma.teamMembership.findFirst({
      where: {
        status: "ACTIVE",
        role: { in: [...MANAGING_ROLES] },
        teamId: { in: [match.homeTeamId, match.awayTeamId] },
        player: { accountId },
      },
    });
    if (membership) return;

    throw new ApiException("FORBIDDEN", "You do not have permission to operate this match.");
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
