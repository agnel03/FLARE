import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { updatePlayerProfileSchema } from "@flare/shared";
import { PlayersService } from "./players.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { parseOrThrow } from "../common/zod";
import type { AuthenticatedUser } from "@flare/shared";

@Controller()
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    if (!user.playerId) return { accountId: user.accountId, email: user.email, player: null };
    const player = await this.players.getById(user.playerId);
    return { accountId: user.accountId, email: user.email, player };
  }

  @Get("players/:playerId")
  getPlayer(@Param("playerId") playerId: string) {
    return this.players.getById(playerId);
  }

  @Get("players/:playerId/stats")
  getStats(@Param("playerId") playerId: string) {
    return this.players.getStats(playerId);
  }

  @Patch("players/:playerId")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("playerId") playerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = parseOrThrow(updatePlayerProfileSchema, body);
    return this.players.update(playerId, user.accountId, input);
  }
}
