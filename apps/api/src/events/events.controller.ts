import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { correctFootballEventSchema, createFootballEventSchema } from "@flare/shared";
import { EventsService } from "./events.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { parseOrThrow } from "../common/zod";
import type { AuthenticatedUser } from "@flare/shared";

@Controller("matches/:matchId/events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param("matchId") matchId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = parseOrThrow(createFootballEventSchema, body);
    return this.events.create(matchId, user.accountId, input);
  }

  @Get()
  list(@Param("matchId") matchId: string) {
    return this.events.listByMatch(matchId);
  }

  @Patch(":eventId")
  @UseGuards(JwtAuthGuard)
  correct(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = parseOrThrow(correctFootballEventSchema, body);
    return this.events.correct(eventId, user.accountId, input);
  }

  @Post(":eventId/retract")
  @UseGuards(JwtAuthGuard)
  retract(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { reason?: string },
  ) {
    return this.events.retract(eventId, user.accountId, body?.reason ?? "No reason provided.");
  }
}
