import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { addParticipantSchema, createMatchSchema } from "@flare/shared";
import type { AuthenticatedUser } from "@flare/shared";
import { MatchesService } from "./matches.service";
import { EventsService } from "../events/events.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { parseOrThrow } from "../common/zod";

@Controller("matches")
export class MatchesController {
  constructor(
    private readonly matches: MatchesService,
    private readonly events: EventsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.matches.create(user.accountId, parseOrThrow(createMatchSchema, body));
  }

  @Get(":matchId")
  get(@Param("matchId") matchId: string) {
    return this.matches.getById(matchId);
  }

  @Post(":matchId/participants")
  @UseGuards(JwtAuthGuard)
  addParticipant(@CurrentUser() user: AuthenticatedUser, @Param("matchId") matchId: string, @Body() body: unknown) {
    return this.matches.addParticipant(user.accountId, matchId, parseOrThrow(addParticipantSchema, body));
  }

  @Post(":matchId/start")
  @UseGuards(JwtAuthGuard)
  start(@CurrentUser() user: AuthenticatedUser, @Param("matchId") matchId: string) {
    return this.matches.start(user.accountId, matchId);
  }

  @Post(":matchId/pause")
  @UseGuards(JwtAuthGuard)
  pause(@CurrentUser() user: AuthenticatedUser, @Param("matchId") matchId: string) {
    return this.matches.pause(user.accountId, matchId);
  }

  @Post(":matchId/resume")
  @UseGuards(JwtAuthGuard)
  resume(@CurrentUser() user: AuthenticatedUser, @Param("matchId") matchId: string) {
    return this.matches.resume(user.accountId, matchId);
  }

  @Post(":matchId/complete")
  @UseGuards(JwtAuthGuard)
  complete(@CurrentUser() user: AuthenticatedUser, @Param("matchId") matchId: string) {
    return this.matches.complete(user.accountId, matchId);
  }

  @Get(":matchId/stats")
  stats(@Param("matchId") matchId: string) {
    return this.matches.getStats(matchId);
  }

  @Get(":matchId/timeline")
  timeline(@Param("matchId") matchId: string) {
    return this.events.listByMatch(matchId);
  }
}
