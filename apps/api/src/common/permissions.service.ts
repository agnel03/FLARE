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

    // Explicit delegation: a neutral scorer/official the creator assigned,
    // who may have no team relationship at all (MatchOperator model).
    const operator = await this.prisma.matchOperator.findUnique({
      where: { matchId_accountId: { matchId, accountId } },
    });
    if (operator) return;

    throw new ApiException("FORBIDDEN", "You do not have permission to operate this match.");
  }

  /**
   * Narrower than assertCanOperateMatch: only the match creator may
   * grant/revoke operator delegations. A CAPTAIN/MANAGER can score their
   * own team's match but should not be able to hand scoring rights to a
   * stranger — that stays with whoever created the match.
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
