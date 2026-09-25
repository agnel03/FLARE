import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { FootballEventType, Prisma, PrismaClient } from "@flare/db";
import type { AddParticipantInput, AssignMatchOperatorInput, CreateMatchInput } from "@flare/shared";
import { PRISMA } from "../prisma/prisma.module";
import { ApiException } from "../common/api-exception";
import { PermissionsService } from "../common/permissions.service";

@Injectable()
export class MatchesService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly permissions: PermissionsService,
  ) {}

  create(accountId: string, input: CreateMatchInput) {
    if (input.homeTeamId === input.awayTeamId) {
      throw new ApiException("EVENT_INVALID", "Home and away teams must be different.");
    }
    const data: Prisma.MatchUncheckedCreateInput = {
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      venueId: input.venueId,
      playersPerSide: input.playersPerSide,
      durationMinutes: input.durationMinutes,
      periodCount: input.periodCount,
      substitutionModel: input.substitutionModel,
      createdByAccountId: accountId,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    };
    return this.prisma.match.create({ data });
  }

  async getById(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        venue: true,
        periods: { orderBy: { periodNumber: "asc" } },
        participants: { include: { player: true } },
      },
    });
    if (!match) throw new ApiException("RESOURCE_NOT_FOUND", "Match was not found.");
    return match;
  }

  async addParticipant(accountId: string, matchId: string, input: AddParticipantInput) {
    await this.permissions.assertCanOperateMatch(accountId, matchId);

    const match = await this.prisma.match.findUniqueOrThrow({ where: { id: matchId } });
    if (match.status === "COMPLETED" || match.status === "CANCELLED") {
      throw new ApiException("STATE_CONFLICT", "Cannot modify participants of a finished match.");
    }
    if (input.teamId !== match.homeTeamId && input.teamId !== match.awayTeamId) {
      throw new ApiException("EVENT_INVALID", "teamId is not one of this match's participating teams.");
    }

    const existing = await this.prisma.matchParticipant.findUnique({
      where: { matchId_playerId: { matchId, playerId: input.playerId } },
    });
    if (existing) {
      throw new ApiException("STATE_CONFLICT", "Player is already registered for this match.");
    }

    return this.prisma.matchParticipant.create({
      data: {
        matchId,
        teamId: input.teamId,
        playerId: input.playerId,
        role: input.role,
        jerseyNumber: input.jerseyNumber,
        position: input.position,
        isActive: input.role === "STARTER",
      },
    });
  }

  async start(accountId: string, matchId: string) {
    await this.permissions.assertCanOperateMatch(accountId, matchId);

    const match = await this.prisma.match.findUniqueOrThrow({ where: { id: matchId } });
    if (match.status !== "SCHEDULED") {
      throw new ApiException("STATE_CONFLICT", `Cannot start a match in status ${match.status}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const period = await tx.period.create({
        data: { matchId, periodNumber: 1, status: "ACTIVE", startedAt: new Date() },
      });
      const updated = await tx.match.update({
        where: { id: matchId },
        data: { status: "LIVE", startedAt: new Date() },
      });
      await this.recordLifecycleEvent(tx, matchId, "MATCH_STARTED", period.id);
      await this.recordLifecycleEvent(tx, matchId, "PERIOD_STARTED", period.id);
      return { match: updated, period };
    });
  }

  async pause(accountId: string, matchId: string) {
    await this.permissions.assertCanOperateMatch(accountId, matchId);
    await this.requireStatus(matchId, "LIVE");
    const updated = await this.prisma.match.update({ where: { id: matchId }, data: { status: "PAUSED" } });
    await this.recordLifecycleEvent(this.prisma, matchId, "MATCH_PAUSED", null);
    return updated;
  }

  async resume(accountId: string, matchId: string) {
    await this.permissions.assertCanOperateMatch(accountId, matchId);
    await this.requireStatus(matchId, "PAUSED");
    const updated = await this.prisma.match.update({ where: { id: matchId }, data: { status: "LIVE" } });
    await this.recordLifecycleEvent(this.prisma, matchId, "MATCH_RESUMED", null);
    return updated;
  }

  async complete(accountId: string, matchId: string) {
    await this.permissions.assertCanOperateMatch(accountId, matchId);

    const match = await this.prisma.match.findUniqueOrThrow({ where: { id: matchId } });
    if (match.status !== "LIVE" && match.status !== "PAUSED") {
      throw new ApiException("STATE_CONFLICT", `Cannot complete a match in status ${match.status}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.period.updateMany({
        where: { matchId, status: "ACTIVE" },
        data: { status: "ENDED", endedAt: new Date() },
      });
      const updated = await tx.match.update({
        where: { id: matchId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await this.recordLifecycleEvent(tx, matchId, "MATCH_COMPLETED", null);
      return updated;
    });
  }

  async getStats(matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new ApiException("RESOURCE_NOT_FOUND", "Match was not found.");

    const grouped = await this.prisma.footballEvent.groupBy({
      by: ["eventType", "teamId"],
      where: { matchId, status: { not: "RETRACTED" } },
      _count: true,
    });

    const byTeam = (teamId: string, types: string[]) =>
      grouped
        .filter((g) => g.teamId === teamId && types.includes(g.eventType))
        .reduce((sum, g) => sum + g._count, 0);

    const shotTypes = ["SHOT", "SHOT_ON_TARGET", "SHOT_OFF_TARGET", "BLOCKED_SHOT"];
    return {
      matchId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      home: {
        shots: byTeam(match.homeTeamId, shotTypes),
        shotsOnTarget: byTeam(match.homeTeamId, ["SHOT_ON_TARGET"]),
        yellowCards: byTeam(match.homeTeamId, ["YELLOW_CARD"]),
        redCards: byTeam(match.homeTeamId, ["RED_CARD", "SECOND_YELLOW"]),
        corners: byTeam(match.homeTeamId, ["CORNER"]),
      },
      away: {
        shots: byTeam(match.awayTeamId, shotTypes),
        shotsOnTarget: byTeam(match.awayTeamId, ["SHOT_ON_TARGET"]),
        yellowCards: byTeam(match.awayTeamId, ["YELLOW_CARD"]),
        redCards: byTeam(match.awayTeamId, ["RED_CARD", "SECOND_YELLOW"]),
        corners: byTeam(match.awayTeamId, ["CORNER"]),
      },
    };
  }

  async assignOperator(accountId: string, matchId: string, input: AssignMatchOperatorInput) {
    await this.permissions.assertIsMatchCreator(accountId, matchId);

    const account = await this.prisma.account.findUnique({ where: { email: input.email } });
    if (!account) {
      throw new ApiException("RESOURCE_NOT_FOUND", "No FLARE account exists with that email.");
    }

    return this.prisma.matchOperator.upsert({
      where: { matchId_accountId: { matchId, accountId: account.id } },
      update: { role: input.role },
      create: { matchId, accountId: account.id, role: input.role, grantedByAccountId: accountId },
    });
  }

  async listOperators(accountId: string, matchId: string) {
    await this.permissions.assertIsMatchCreator(accountId, matchId);
    return this.prisma.matchOperator.findMany({
      where: { matchId },
      orderBy: { createdAt: "asc" },
    });
  }

  async revokeOperator(accountId: string, matchId: string, targetAccountId: string) {
    await this.permissions.assertIsMatchCreator(accountId, matchId);
    await this.prisma.matchOperator.deleteMany({ where: { matchId, accountId: targetAccountId } });
  }

  private async requireStatus(matchId: string, status: "LIVE" | "PAUSED") {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new ApiException("RESOURCE_NOT_FOUND", "Match was not found.");
    if (match.status !== status) {
      throw new ApiException("STATE_CONFLICT", `Match must be ${status} for this action.`);
    }
    return match;
  }

  private async recordLifecycleEvent(
    tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0] | PrismaClient,
    matchId: string,
    eventType: FootballEventType,
    periodId: string | null,
  ) {
    await tx.footballEvent.create({
      data: {
        clientEventId: `lifecycle-${eventType}-${randomUUID()}`,
        matchId,
        periodId: periodId ?? undefined,
        eventType,
        matchClockSeconds: 0,
        source: "SYSTEM",
        metadata: {},
      },
    });
  }
}
