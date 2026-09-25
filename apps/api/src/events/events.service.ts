import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@flare/db";
import {
  goalMetadataSchema,
  shotMetadataSchema,
  cardMetadataSchema,
  substitutionMetadataSchema,
  type CorrectFootballEventInput,
  type CreateFootballEventInput,
} from "@flare/shared";
import { PRISMA } from "../prisma/prisma.module";
import { ApiException } from "../common/api-exception";
import { PermissionsService } from "../common/permissions.service";

const GOAL_TYPES = new Set(["GOAL", "OWN_GOAL"]);
const CARD_TYPES = new Set(["YELLOW_CARD", "RED_CARD", "SECOND_YELLOW"]);
const DISMISSAL_TYPES = new Set(["RED_CARD", "SECOND_YELLOW"]);
const LIFECYCLE_TYPES = new Set([
  "MATCH_CREATED",
  "MATCH_STARTED",
  "PERIOD_STARTED",
  "PERIOD_ENDED",
  "HALF_TIME",
  "MATCH_PAUSED",
  "MATCH_RESUMED",
  "MATCH_COMPLETED",
]);

/**
 * The canonical Football Event Engine (Master Spec Source 6). Implements
 * the validation pipeline (Section 5) for the event families this slice
 * supports end-to-end: GOAL/OWN_GOAL, SHOT family, cards, SUBSTITUTION.
 * Every other taxonomy entry can be created (generic validation still
 * applies) but has no derived-projection side effects yet — see
 * docs/STATUS.md for what's deferred.
 */
@Injectable()
export class EventsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly permissions: PermissionsService,
  ) {}

  async create(matchId: string, actorAccountId: string, input: CreateFootballEventInput) {
    if (LIFECYCLE_TYPES.has(input.eventType)) {
      throw new ApiException(
        "EVENT_NOT_ALLOWED",
        "Match lifecycle events are managed through the match lifecycle endpoints, not direct event creation.",
      );
    }

    await this.permissions.assertCanOperateMatch(actorAccountId, matchId);

    const match = await this.prisma.match.findUniqueOrThrow({ where: { id: matchId } });
    if (match.status !== "LIVE") {
      throw new ApiException("MATCH_NOT_LIVE", "Events can only be recorded while the match is live.");
    }

    // Idempotency: a repeated client_event_id must return the original
    // canonical result rather than create a duplicate football action
    // (Event Engine spec, Section 41).
    const existing = await this.prisma.footballEvent.findUnique({
      where: { matchId_clientEventId: { matchId, clientEventId: input.clientEventId } },
    });
    if (existing) return existing;

    if (input.teamId && input.teamId !== match.homeTeamId && input.teamId !== match.awayTeamId) {
      throw new ApiException("EVENT_INVALID", "teamId is not one of this match's participating teams.");
    }

    const participants = await this.prisma.matchParticipant.findMany({ where: { matchId } });
    const participantByPlayerId = new Map(participants.map((p) => [p.playerId, p]));

    for (const playerId of [input.primaryPlayerId, input.secondaryPlayerId].filter(Boolean) as string[]) {
      if (!participantByPlayerId.has(playerId)) {
        throw new ApiException("EVENT_INVALID", `Player ${playerId} is not a participant in this match.`);
      }
    }

    const metadata = this.validateMetadata(input.eventType, input.metadata);

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.footballEvent.create({
        data: {
          clientEventId: input.clientEventId,
          matchId,
          periodId: input.periodId,
          eventType: input.eventType as never,
          teamId: input.teamId,
          primaryPlayerId: input.primaryPlayerId,
          secondaryPlayerId: input.secondaryPlayerId,
          matchClockSeconds: input.matchClockSeconds,
          pitchX: input.pitchX,
          pitchY: input.pitchY,
          metadata,
          source: "SCORER",
          createdById: actorAccountId,
        },
      });

      await this.applyImmediateProjections(tx, matchId, created, participantByPlayerId);
      return created;
    });

    return event;
  }

  async listByMatch(matchId: string) {
    return this.prisma.footballEvent.findMany({
      where: { matchId, status: { not: "RETRACTED" } },
      orderBy: [{ matchClockSeconds: "asc" }, { sequence: "asc" }],
      include: { primaryPlayer: true, secondaryPlayer: true, team: true },
    });
  }

  async correct(eventId: string, actorAccountId: string, input: CorrectFootballEventInput) {
    const event = await this.prisma.footballEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new ApiException("RESOURCE_NOT_FOUND", "Event was not found.");
    await this.permissions.assertCanOperateMatch(actorAccountId, event.matchId);
    if (event.status === "RETRACTED") {
      throw new ApiException("STATE_CONFLICT", "A retracted event cannot be corrected.");
    }

    const nextMetadata = input.metadata
      ? this.validateMetadata(event.eventType, { ...(event.metadata as object), ...input.metadata })
      : (event.metadata as object);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.eventRevision.create({
        data: {
          eventId: event.id,
          previousMetadata: event.metadata as object,
          previousStatus: event.status,
          reason: input.reason,
          correctedById: actorAccountId,
        },
      });
      const result = await tx.footballEvent.update({
        where: { id: eventId },
        data: {
          metadata: nextMetadata,
          matchClockSeconds: input.matchClockSeconds ?? event.matchClockSeconds,
          status: "CORRECTED",
        },
      });
      if (GOAL_TYPES.has(event.eventType)) {
        await this.recalculateScore(tx, event.matchId);
      }
      return result;
    });

    return updated;
  }

  async retract(eventId: string, actorAccountId: string, reason: string) {
    const event = await this.prisma.footballEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new ApiException("RESOURCE_NOT_FOUND", "Event was not found.");
    await this.permissions.assertCanOperateMatch(actorAccountId, event.matchId);
    if (event.status === "RETRACTED") return event;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.eventRevision.create({
        data: {
          eventId: event.id,
          previousMetadata: event.metadata as object,
          previousStatus: event.status,
          reason,
          correctedById: actorAccountId,
        },
      });
      const result = await tx.footballEvent.update({
        where: { id: eventId },
        data: { status: "RETRACTED" },
      });
      if (GOAL_TYPES.has(event.eventType)) {
        await this.recalculateScore(tx, event.matchId);
      }
      return result;
    });

    return updated;
  }

  // ---------------------------------------------------------------------
  // Internal: metadata validation + immediate projections
  // ---------------------------------------------------------------------

  private validateMetadata(eventType: string, raw: unknown): object {
    const schema = GOAL_TYPES.has(eventType)
      ? goalMetadataSchema
      : eventType.startsWith("SHOT") || eventType === "BLOCKED_SHOT"
        ? shotMetadataSchema
        : CARD_TYPES.has(eventType)
          ? cardMetadataSchema
          : eventType === "SUBSTITUTION"
            ? substitutionMetadataSchema
            : undefined;

    if (!schema) return (raw as object) ?? {};
    const result = schema.safeParse(raw ?? {});
    if (!result.success) {
      throw new ApiException("EVENT_INVALID", "Event metadata failed validation.", result.error.issues);
    }
    return result.data;
  }

  private async applyImmediateProjections(
    tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
    matchId: string,
    event: { eventType: string; primaryPlayerId: string | null; secondaryPlayerId: string | null; matchClockSeconds: number },
    participantByPlayerId: Map<string, { id: string }>,
  ) {
    if (GOAL_TYPES.has(event.eventType)) {
      await this.recalculateScore(tx, matchId);
      return;
    }

    if (CARD_TYPES.has(event.eventType) && event.primaryPlayerId) {
      if (DISMISSAL_TYPES.has(event.eventType)) {
        const participant = participantByPlayerId.get(event.primaryPlayerId);
        if (participant) {
          await tx.matchParticipant.update({
            where: { id: participant.id },
            data: { isActive: false, exitedAtSec: event.matchClockSeconds },
          });
        }
      }
      return;
    }

    if (event.eventType === "SUBSTITUTION") {
      const incoming = event.primaryPlayerId ? participantByPlayerId.get(event.primaryPlayerId) : undefined;
      const outgoing = event.secondaryPlayerId ? participantByPlayerId.get(event.secondaryPlayerId) : undefined;
      if (outgoing) {
        await tx.matchParticipant.update({
          where: { id: outgoing.id },
          data: { isActive: false, exitedAtSec: event.matchClockSeconds },
        });
      }
      if (incoming) {
        await tx.matchParticipant.update({
          where: { id: incoming.id },
          data: { isActive: true, role: "SUBSTITUTE", enteredAtSec: event.matchClockSeconds },
        });
      }
    }
  }

  private async recalculateScore(
    tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
    matchId: string,
  ) {
    const match = await tx.match.findUniqueOrThrow({ where: { id: matchId } });
    const goalEvents = await tx.footballEvent.findMany({
      where: { matchId, eventType: { in: ["GOAL", "OWN_GOAL"] }, status: { not: "RETRACTED" } },
    });

    let homeScore = 0;
    let awayScore = 0;
    for (const goal of goalEvents) {
      const meta = (goal.metadata as { ownGoal?: boolean } | null) ?? {};
      const isOwnGoal = goal.eventType === "OWN_GOAL" || meta.ownGoal === true;
      const scoringTeamId = isOwnGoal
        ? goal.teamId === match.homeTeamId
          ? match.awayTeamId
          : match.homeTeamId
        : goal.teamId;

      if (scoringTeamId === match.homeTeamId) homeScore += 1;
      else if (scoringTeamId === match.awayTeamId) awayScore += 1;
    }

    await tx.match.update({ where: { id: matchId }, data: { homeScore, awayScore } });
  }
}
