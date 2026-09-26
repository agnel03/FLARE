import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@flare/db";
import type { UpdatePlayerProfileInput } from "@flare/shared";
import { PRISMA } from "../prisma/prisma.module";
import { ApiException } from "../common/api-exception";

@Injectable()
export class PlayersService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async getById(playerId: string) {
    const player = await this.prisma.playerProfile.findUnique({
      where: { id: playerId },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { team: true },
        },
      },
    });
    if (!player) {
      throw new ApiException("RESOURCE_NOT_FOUND", "Player was not found.");
    }
    return player;
  }

  async update(playerId: string, accountId: string, input: UpdatePlayerProfileInput) {
    const player = await this.prisma.playerProfile.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new ApiException("RESOURCE_NOT_FOUND", "Player was not found.");
    }
    if (player.accountId !== accountId) {
      throw new ApiException("FORBIDDEN", "You may only edit your own player profile.");
    }
    return this.prisma.playerProfile.update({ where: { id: playerId }, data: input });
  }

  /** Career/season/year stats: real derivation deferred — see docs/STATUS.md. */
  async getStats(playerId: string) {
    const player = await this.prisma.playerProfile.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new ApiException("RESOURCE_NOT_FOUND", "Player was not found.");
    }

    const [goals, assists, appearances] = await Promise.all([
      this.prisma.footballEvent.count({
        where: { primaryPlayerId: playerId, eventType: "GOAL", status: "ACTIVE" },
      }),
      this.prisma.footballEvent.count({
        where: { secondaryPlayerId: playerId, eventType: "GOAL", status: "ACTIVE" },
      }),
      this.prisma.matchParticipant.count({ where: { playerId } }),
    ]);

    const cards = await this.prisma.footballEvent.groupBy({
      by: ["eventType"],
      where: {
        primaryPlayerId: playerId,
        eventType: { in: ["YELLOW_CARD", "RED_CARD", "SECOND_YELLOW"] },
        status: "ACTIVE",
      },
      _count: true,
    });

    return {
      playerId,
      appearances,
      goals,
      assists,
      yellowCards: cards.find((c) => c.eventType === "YELLOW_CARD")?._count ?? 0,
      redCards:
        (cards.find((c) => c.eventType === "RED_CARD")?._count ?? 0) +
        (cards.find((c) => c.eventType === "SECOND_YELLOW")?._count ?? 0),
    };
  }
}
